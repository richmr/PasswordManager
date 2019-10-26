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

  whoops: function(msg, err = null) {
    console.log(msg); // To be actually logged to the HTML interface eventually
    if (err) {throw(err);} // Needed to help preserve stack trace for debugging
  },

  generateNewKey: function() {
    // This generates a brand new master key
    return generateSymKey()
      .then(newkey => {
        this.masterKey = newkey;
        return true;
      })
      .catch(err => {
        this.whoops("generateSymKey:" +err.name+ " " +err.message);
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

  decryptAndStoreMasterKey: function() {
    // Decrypts master key using passcode
    var key_mat_arr = null;

    passcode = prompt("Please enter your passphrase","");
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
        this.whoops("decryptAndStoreMasterKey:" +err.name+ " " +err.message);
      });
  },

  decryptSecretWithMasterKey: function(ciphertext) {
    // secret is the "ez" subtle string to be decrypted
    // callback must accept the decrypted secret in Uint8Array form
    if (this.masterKey == null) {
      this.whoops("decryptSecretWithMasterKey: Cannot decrypt!  Get masterKey first.");
    }

    return ezSubtleDecrypt(ciphertext, this.masterKey)
      .then(plaintext => {
        return plaintext;
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
