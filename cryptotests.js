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

function pmenginetest2() {
  $("#status").append("<br>Go!");
  pmengine.fakeVals();
  pmengine.recoverMasterKeyFromLocalStorage(function () {console.log("recover resolved");})
    .then(response => {
      $("#status").append("<br>Key recovered");
      return pmengine.encryptSecretWithMasterKey("this is my secret");
    }).then(ciphertext => {
      $("#status").append("<br>Secret encrypted");
      console.log(ciphertext);
      return pmengine.decryptSecretWithMasterKey(ciphertext);
    }).then(plaintext => {
      result = new TextDecoder().decode(plaintext);
      $("#status").append("<br>Decrypted secret is: "+result);
      console.log("Decrypted secret is: "+result);
    }).catch(err => {
      alert("WHOOPS! pmenginetest:" +err.name+ " " +err.message);
      console.log("pmenginetest:" +err.name+ " " +err.message);
    })
}

function makefakedata() {
  //  Need some data to play with
  pmengine.fakeVals();
  siteData = [];
  for (i = 1; i <=4 ; i++) {
    thisSite = {Index: i, Site: "site"+i, Username: "siteID"+i,
      Password: "password"+i, AdditionalInfo: "Notes"+i};
    siteData.push(thisSite);
  }
  console.log(JSON.stringify(siteData));
  $.each(siteData, function(index, aSite) {
    // encrypt the stuffs
    pmengine.recoverMasterKeyFromLocalStorage()
      .then(foo => {
        toencrypt = ["Site", "Username", "Password", "AdditionalInfo"];
        encrypters = [];
        $.each(toencrypt, function(subindex, element) {
          var dothisone = pmengine.encryptSecretWithMasterKey(aSite[element])
            .then(ct => {
              siteData[index][element] = ct;
            });
          encrypters.push(dothisone);
        });
        return Promise.all(encrypters);
      }).then(foo => {
        console.log("Site "+index+" Encryption complete");
        console.log(JSON.stringify(siteData));
      });
  });
  console.log("Site data encrypted?");
}

function makefakedata2() {
  //  Need some data to play with
  siteData = [];
  sitenames = ["google", "apple", "la dwp", "goatherd"]
  for (i = 1; i <=4 ; i++) {
    sitename = sitenames[i-1];
    thisSite = {Index: i, Site: sitename, Username: sitename+"username",
      Password: sitename+"password", AdditionalInfo: sitename+"notes"};
    siteData.push(thisSite);
  }
  pmengine.fakeVals();
  pmengine.recoverMasterKeyFromLocalStorage()
    .then(foo => {
      encrypters = [];
      $.each(siteData, function(index, aSite) {
      toencrypt = ["Username", "Password", "AdditionalInfo"];
        $.each(toencrypt, function(subindex, element) {
          var dothisone = pmengine.encryptSecretWithMasterKey(aSite[element])
            .then(ct => {
              siteData[index][element] = ct;
            });
          encrypters.push(dothisone);
        });
      });
      return Promise.all(encrypters);
    }).then(foo => {
      console.log("Encryption complete?");
      console.log(JSON.stringify(siteData));
    });
}

$(document).ready(function(){
  M.AutoInit();
  
  pmengine.fakeVals()
  pmui.fakeVals();
  pmui.init();

});
