/*
Testing

*/
var ct

function encryptStringWithPassphraseTest(plaintext_string, passphrase) {
  // first.. I'm waiting
  console.log("Waiting for encryption");
  // Do it
  ezSubtleEncrypt(plaintext_string, passphrase)
    .then( cipherdat => {
      console.log("encrypted result: " + cipherdat);
      ct = cipherdat;
    });
}

function decryptStringWithPassphraseTest(ciphertext_string, passphrase) {
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

function pmenginetest() {
  pmengine.fakeVals();
  pmengine.recoverMasterKeyFromLocalStorage(function () {console.log("recover resolved");})
    .then(response => {
      return pmengine.encryptSecretWithMasterKey("this is my secret");
    }).then(ciphertext => {
      console.log(ciphertext);
      return pmengine.decryptSecretWithMasterKey(ciphertext);
    }).then(plaintext => {
      result = new TextDecoder().decode(plaintext);
      console.log("Decrypted secret is: "+result);
    }).catch(err => {
      console.log("pmenginetest:" +err.name+ " " +err.message);
    })
}
