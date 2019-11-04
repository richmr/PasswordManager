/*
Password Manager Engine for GAS and Google Sheets
Mike Rich, 2019
*/

// Using a collection to help with namespace and global variable issues

var pmengine = {
  masterKey: null, // The unencrypted symmetric CryptoKey needed to decipher user data
  masterKey_passcodeEncrypted: null, // The base64 encrypted key from the spreadsheet, needs user passphrase to decrypt
  googleTempActiveUserKey: null, // GTAUK - See https://developers.google.com/apps-script/reference/base/session, used as an encryption key
  masterKeylocalStorageTag: "pmengine_masterkey",
  getPassphraseCallback: null, // The callback that will provide a Passphrase

  whoops: function(msg, err = null) {
    console.log(msg); // To be actually logged to the HTML interface eventually
    if (err) {throw(err);} // Needed to help preserve stack trace for debugging
  },

  /*
  New start set up:
    - Need a new masterKey, encrypted with a passphrase
    - Then need to store masterKey with gtauk
    - as well as have masterKey in memory

  Session start:
    - Needs gtauk, passphrase encrypted master key, and passphrase callback
    - recovers masterKey from storage, or asks for passphrase
      - UI needs to call session start again.. seems safest

  */

  freshStart: function(passphrase, gtauk) {
    pmengine.googleTempActiveUserKey = gtauk;
    var rawkey_ct = null;
    return pmengine.generateNewKey(passphrase)
      .then(rk_ct => {
        rawkey_ct = rk_ct;
        return pmengine.storeMasterKey();
      }).then(foo => {
        return rawkey_ct;
      });
  },

  sessionStart: function(mk_pe, gtauk, passphraseCallback) {
    // mk_pe = masterKey, passcode encrypted (ezencrypted)
    // Google Temp Active User Key - string, but can be any "SSO" token of your choosing
    // passphraseCallback - function pmengine will call to get passphrase
    //      - the call back will then call decryptAndStoreMasterKey(passphrase)

    pmengine.masterKey_passcodeEncrypted = mk_pe;
    pmengine.googleTempActiveUserKey = gtauk;
    pmengine.getPassphraseCallback = passphraseCallback;

    return pmengine.recoverMasterKeyFromLocalStorage();
  },

  generateNewKey: function(passphrase) {
    // This generates a brand new master and also return the key encrypted by
    // passphrase suitable for storage

    return generateSymKey()
      .then(newkey => {
        pmengine.masterKey = newkey;
        return generateAndExportKey(newkey);
      }).then(rawkey_arr => {
        return ezSubtleEncrypt(rawkey_arr, passphrase);
      }).then(rawkey_ct => {
        return rawkey_ct;
      }).catch(err => {
        this.whoops("generateNewKey:" +err.name+ " " +err.message);
      });
  },

  storeMasterKey: function() {
    if (this.masterKey == null) {
      this.whoops("storeMasterKey: Master key is not set!");
      return;
    }
    // First export the key
    return generateAndExportKey(this.masterKey)
      .then(rawkey_arr => {
        // Now encrypt with GTAUK
        return ezSubtleEncrypt(rawkey_arr, this.googleTempActiveUserKey);
      }).then(rawkey_str => {
        // Try to store it
        try {
          localStorage.setItem(this.masterKeylocalStorageTag, rawkey_str);
          return true;
        } catch(err) {
          // Probably security restricted.  No big deal, just log it
          this.whoops("storeMasterKey: Unable to store master key.");
        }
      }).catch(err => {
        this.whoops("storeMasterKey:" +err.name+ " " +err.message);
      })
  },

  recoverMasterKeyFromLocalStorage: function() {
    // Checks local storage for a stored masterKey
    // attempts to decrypt it with googleTempActiveUserKey
    // if fail, then begins process to decrypt masterKey_passcodeEncrypted
    var state = null;
    try {
      var masterKeyFromLocalStorage = localStorage.getItem(this.masterKeylocalStorageTag);
      // attempt decrypt using GTAUK
      state = "ezSubtleDecrypt";
      return ezSubtleDecrypt(masterKeyFromLocalStorage, this.googleTempActiveUserKey)
        .then(mk_raw => {
          // Attempt to turn into CryptoKey
          state = "importRawKey"
          return importRawKey(mk_raw);
        }).then(mk => {
          // Save masterKey
          state = "save master key";
          this.masterKey = mk;
          return true;
        }).catch(err => {
          this.whoops("recoverMasterKeyFromLocalStorage("+state+ "):" +err.name+ " " +err.message);
          return this.decryptAndStoreMasterKey();
        });
    } catch(err) {
      // Per documentation SecurityError can happen when user denies local storage
      // This is the same as decryption failing
      this.whoops("recoverMasterKeyFromLocalStorage.localstorage:" +err.name+ " " +err.message)
      return this.decryptAndStoreMasterKey();
    }
  },

  decryptAndStoreMasterKey: function(passphrase = null) {
    // Decrypts master key using passcode

    if (passphrase == null) {
      pmengine.getPassphraseCallback();
      return;
    }

    var key_mat_arr = null;

    // passcode = prompt("Please enter your passphrase","");
    return ezSubtleDecrypt(this.masterKey_passcodeEncrypted, passcode)
      .then(key_arr => {
        // Turn into real key
        return importRawKey(key_arr);
      }).then(mk => {
        // save and store it
        this.masterKey = mk;
        return this.storeMasterKey();
      }).then(foo => {
        return true;
      }).catch(err => {
        // Probably passphrase is wrong
        pmengine.passphrase = null;
        pmengine.getPassphraseCallback("Please try again");
        this.whoops("decryptAndStoreMasterKey:" +err.name+ " " +err.message);
      });
  },

  changePassphraseOnMasterKey: function(newPassphrase) {
    // Simply encrypts the existing masterKey with a new passphrase
    // returns the ciphered key, suitable for storing
    // Also sets internal variables
    return generateAndExportKey(this.masterKey)
      .then(rawkey_arr => {
        // Now encrypt with GTAUK
        return ezSubtleEncrypt(rawkey_arr, newPassphrase);
      }).then(rawkey_ct => {
        pmengine.masterKey_passcodeEncrypted = rawkey_ct;
        return rawkey_ct;
      });
  },

  decryptSecretWithMasterKey: function(ciphertext, readable=false) {
    // secret is the "ez" subtle string to be decrypted
    // callback must accept the decrypted secret in Uint8Array form
    // if readable == true, then returns a readable string
    if (this.masterKey == null) {
      this.whoops("decryptSecretWithMasterKey: Cannot decrypt!  Get masterKey first.");
    }

    return ezSubtleDecrypt(ciphertext, this.masterKey)
      .then(plaintext => {
        if (readable) {
          return new TextDecoder().decode(plaintext);
        } else {
          return plaintext;
        }
        //callback(plaintext);
      }).catch(err => {
        this.whoops("decryptSecretWithMasterKey:" +err.name+ " " +err.message, err);
      });
  },

  encryptSecretWithMasterKey: function(plaintext) {
    // secret is the "ez" subtle string to be decrypted
    // callback must accept the ciphertext "ez" form
    if (this.masterKey == null) {
      this.whoops("encryptSecretWithMasterKey: Cannot decrypt!  Get masterKey first.");
    }

    return ezSubtleEncrypt(plaintext, this.masterKey)
      .then(ciphertext => {
        return ciphertext;
        //callback(ciphertext);
      }).catch(err => {
        this.whoops("encryptSecretWithMasterKey:" +err.name+ " " +err.message, err);
      });
  },

  // Test functions
  fakeVals: function () {
    this.googleTempActiveUserKey = "mxlplx";
    // passphrase is password
    this.masterKey_passcodeEncrypted = "MTI2LDE2MCwxOSwxMTgsNzgsMjcsMjE4LDY1LDIzNiwxMCwxODEsMTAw&MTUzLDE5OSwxNjIsNjMsMjM0LDE1NCwxNzYsNTIsMTkzLDcyLDEwMSwyLDE0LDg5LDMxLDIwNyw0MSwyMjcsMjksMjAsMjIyLDEyNiwxOTksMjA2LDExOSwyNCwxNTksMTQ4LDIyOCwxNjYsMjQ4LDIzMSwyMSw3MywyMTMsNjUsODUsNDQsMTAyLDgxLDEyLDE4NCwxNzEsMTUxLDQ5LDI1MiwxNjgsMjE0";

  }


}
