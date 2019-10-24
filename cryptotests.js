/*
Get some key material to use as input to the deriveKey method.
The key material is a password supplied by the user.
*/
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

async function encryptString(key, iv_base64, plaintext_string) {
  // key should be CryptKey from subtle (use getKeyMaterialFromPassword)
  // iv is base64 encoded string
  // plaintext_string is straightup string
  // returns a base64 string

  // Convert IV
  iv = base64StringToUInt8Arr(iv_base64);

  // Convert plaintext to buffer
  pt = new TextEncoder().encode(plaintext_string);

  ct = await encryptData(key, iv, pt);

  return btoa(ct);
}


async function decryptString(key, iv_base64, ciphertext_string) {
  // key should be CryptKey from subtle (use getKeyMaterialFromPassword)
  // iv is base64 encoded string
  // ciphertext_string is base64 encoded ciphertext
  // returns a pt string
  // Convert IV
  iv = base64StringToUInt8Arr(iv_base64);

  // Convert ciphertext_string to buffer
  ct = base64StringToUInt8Arr(ciphertext_string);

  pt = await decryptData(key, iv, ct);
  pt_arr = new Uint8Array(pt);
  pt_string = new TextDecoder().decode(pt);

  return pt_string;
}


async function encryptData(key, iv, plaintext) {
  ct = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    plaintext
  );
  // Returns array buffer, have to convert to array
  return new Uint8Array(ct);
}

async function decryptData(key, iv, ciphertext) {
  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    ciphertext
  );
}
