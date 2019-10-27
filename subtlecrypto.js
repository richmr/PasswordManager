/*
Crypto.Subtle wrappers
Mike Rich, 2019
*/



function encryptStringWithPassphrase2(plaintext_string, passphrase) {
  // first.. I'm waiting
  console.log("Waiting for encryption");
  // Do it
  ezSubtleEncrypt(plaintext_string, passphrase)
    .then( cipherdat => {
      console.log("encrypted result: " + cipherdat);
    });
}

function decryptStringWithPassphrase2(ciphertext_string, passphrase) {
  // first.. I'm waiting
  console.log("Waiting for decryption");
  // Do it
  ezSubtleDecrypt(ciphertext_string, passphrase)
    .then( pt => {
      // pt is array
      pt = new TextDecoder().decode(pt);
      console.log("decrypted result: " + pt);
    }).catch(err => {
      console.log("couldn't decrypt. bad password?");
      console.log(err.name);
      console.log(err.message);
      //throw(err);
    });
}


async function getKeyMaterialFromPassphrase(passphrase) {
  // Passphrase is string
  let enc = new TextEncoder();
  let key_mat = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    {name: "PBKDF2"},
    false,
    ["deriveBits", "deriveKey"]
  );
  var salt = new Uint8Array(32);
  let key = await window.crypto.subtle.deriveKey(
    {
      "name": "PBKDF2",
      salt: salt,
      "iterations": 100,
      "hash": "SHA-256"
    },
    key_mat,
    { "name": "AES-GCM", "length": 256},
    true,
    [ "encrypt", "decrypt" ]
  );

  return key;
}

function base64StringToUInt8Arr(base64_string) {
  // Converts base64_string to a Uint8Array
  // Assumes the source for the base64 string was a Uint8Array already
  response = new Uint8Array(atob(base64_string).split(',').map(Number));
  return response;
}


async function ezSubtleEncrypt(data, key) {
  // data can be a flat string or array of data
  // key can be a passphrase OR a CryptKey
  // returns a base64 string of IV&CIPHERTEXT

  // Get the key data from the passphrase
  if (typeof key == "string") {
    key = await getKeyMaterialFromPassphrase(key);
  } // else I assume it's a CryptKey.  Subtle functions will throw if it isn't

  // get a random iv
  var iv = getSalt();

  // encrypt it
  var ct = await encryptData2(key, iv, data);

  // ct and salt are in array, convert to base64, concatenate, and return
  return btoa(iv)+"&"+btoa(ct);
}

async function ezSubtleDecrypt(cipher_data, key) {
  // cipher data must be IV&CIPHERTEXT
  // key can be a passphrase OR a CryptKey
  // returns a base64 string of IV&CIPHERTEXT

  // Get the key data from the passphrase
  if (typeof key == "string") {
    key = await getKeyMaterialFromPassphrase(key);
  } // else I assume it's a CryptKey.  Subtle functions will throw if it isn't

  var iv_b64 = cipher_data.split('&')[0];
  var ct_b64 = cipher_data.split('&')[1];

  // decrypt it
  var pt = await decryptData2(key, iv_b64, ct_b64);

  // pt will be a Uint8Array, further conversion up to caller
  return pt;
}

async function encryptData2(key, iv, plaintext) {
  // Key must be a CryptKey from subtle
  // iv can be either base64 encoded IV or Uint8Array
  if (typeof iv == "string") {
    // We assume it is a base64 encoded string and now we convert to array
    iv = base64StringToUInt8Arr(iv);
  }

  // plaintext can either be a string or a Uint8Array
  if (typeof plaintext == "string") {
    // Convert to array
    plaintext = new TextEncoder().encode(plaintext);
  }

  var ct = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    plaintext
  );

  // Returns ONLY a Uint8Array, further interpretation up to calling function
  return new Uint8Array(ct);
}

async function decryptData2(key, iv, ciphertext) {
  // Key must be a CryptKey from subtle
  // iv can be either base64 encoded IV or Uint8Array
  if (typeof iv == "string") {
    // We assume it is a base64 encoded string and now we convert to array
    iv = base64StringToUInt8Arr(iv);
  }

  // ciphertext can either be a string or a Uint8Array
  if (typeof ciphertext == "string") {
    // We assume it is a base64 encoded string and now we convert to array
    ciphertext = base64StringToUInt8Arr(ciphertext);
  }

  var pt = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );

  // Returns ONLY a Uint8Array, further interpretation up to calling function
  return new Uint8Array(pt);
}


function getSalt() {
  // Returns a Uint8Array salt
  var iv = window.crypto.getRandomValues(new Uint8Array(12));
  return iv;
}
