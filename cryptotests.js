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

function provideAccountData() {
  accDat =  '[{"Index":1,"Site":"google","Username":"NjgsMTUxLDExOCwyNDksNjMsMTM5LDE3Niw1NSwxNzAsNDcsOTEsNDQ=&NjMsMTkwLDEwMSwxNywxODUsMTMwLDE0NiwxMDUsMTc1LDE3MiwyNiwyMDgsMTI0LDIyNCwxNjIsNDQsMTUxLDE1OCwyNTAsMTY0LDcwLDAsMTY0LDk2LDIyOSwxMiwyMTEsMjM5LDE1MywxMDU=","Password":"MjEzLDE0MSwxMiwyMzAsMjEsNjcsMTUxLDczLDEzOCw3OCwyMTIsMjM2&MzMsNTgsMjAyLDEyNCwxMTIsMTQ0LDI1NCwyMjIsMjUxLDc4LDIzMywyNiwyMjAsMTY1LDIzOCwxMTYsNzIsMjUxLDg4LDE0OSwxOTQsMTE3LDExMCwxMTQsMTYyLDIzOSw4OSwyMDYsNTYsMTAx","AdditionalInfo":"MTg4LDMzLDIwNiwxOCwyMywyOCwxMDgsMTExLDkyLDUxLDM5LDMx&MTA3LDE1MiwyMDksMjQsOTQsMjI0LDkyLDQyLDkzLDIwNCwxMzMsNDAsMzcsMTY0LDIxMywxMzAsMjE2LDQ2LDQsMjksMjEsMTg1LDE5LDE4NCwxMjMsMTM3LDEzNg=="},{"Index":2,"Site":"apple","Username":"MjQ1LDg3LDE5MywyMywxNDgsMTI3LDExMSwxNzUsMjUyLDUzLDE3NSw5Mg==&MjM5LDc3LDY0LDE0Niw1MiwxNjcsNjUsNDUsNDIsOTcsMTMzLDEwOSwzMyw4OSwxNywxNjAsMTAsMzcsMTM3LDExNCwyMzUsMjMxLDk2LDEzOCwxNjUsMTc0LDEyOCwzMCwyMDk=","Password":"MzcsMjQxLDI0Myw3OSwzNCwxNiwxNzAsMjE4LDEzOCwxNzYsODcsMjA=&MTczLDEwMSwyNCwzLDEwLDEsMTcsMzQsMjIsMTUzLDI0NCwyMTEsMTQxLDE3NywxMTIsMjQxLDE3OCwyMTMsMTc0LDI0Myw2OCw0NSwxNjYsMjUzLDE2NCwyMTYsMTI3LDExNyw4MA==","AdditionalInfo":"MjUsMjAxLDI0NiwxNjksMjQ4LDExMSw2NSwyNDksODcsMTY0LDI1NCwyMzQ=&MTI4LDkzLDE5NiwxLDExNCwxMDcsMTE1LDE3OCwxODYsMzQsNDIsNTUsMzQsMjEyLDE4NSw5LDE5MSwyMzMsMzUsNDEsMTMwLDg5LDUzLDU1LDEyNCw3Ng=="},{"Index":3,"Site":"la dwp","Username":"MTkxLDc0LDQyLDE3NCwzMywxNzEsOTIsOTMsMjM3LDI5LDE2MCw4NA==&NjUsMjI4LDE2Miw1NCwzMSwyNCwxMSwyNSwxNTAsMjE5LDEzOCwyMzYsMTA5LDIyNCw1OSwyNTUsNzYsNTQsODQsMTU1LDYsMjEsMjA5LDIwMCwyMTIsMTE3LDEyMSwxNTEsMTM2LDQ1","Password":"MTY1LDEyNiwyMDgsMTYxLDEyLDI3LDY0LDE0MSw2MSwxOTksNTEsNTU=&MTYsMzIsMjEzLDE1MSwyMDYsMTM2LDIxMSwyMTksNjksMjA3LDExMiw2Miw5MywyMDQsMTE3LDIwLDIzNSwyMjMsNDksMTA3LDIxNSwyMTMsMjQzLDI0MywyNCwyNTIsMjI4LDYwLDE0NSwyMDg=","AdditionalInfo":"MTU5LDk2LDIxNyw2MSw4MiwxNjIsMjIxLDIyLDIzNCwxNDEsMjUsMzQ=&NjEsMTc3LDE0NCwyMTksMTk2LDI1MywxMjcsMjU0LDQ0LDE4Miw1MSwxMDQsMTQzLDIyMiw1Myw3MSwxNTQsMjUwLDE0MywyMDAsMjQ5LDEsNzgsNzAsMTQxLDE3OCwxMDg="},{"Index":4,"Site":"goatherd","Username":"OTksMjUzLDI0OCwxNzcsMTMyLDE4NiwyNCw4NCwyNDYsMTExLDExMywxMzU=&MTc1LDMxLDI1MywyMTUsMjE0LDU2LDE2NCwzOCwyMzQsMjAxLDE1Myw2LDEzNCwxODAsMjQ5LDIxMiwyLDQ2LDE2NywxODgsMTAyLDEzNiwyMDQsMTU4LDE2MCwxNjAsMTYzLDEwOCwyMDgsMzEsNTUsMTI1","Password":"MTY1LDM5LDIxLDIyMCwyNDQsNTEsMTIxLDE1MSwxLDIxMSwyNTIsMjMz&MjA5LDgzLDE5Miw3OSw2NywyMDMsMjAxLDIwMiwxMzYsMTY2LDIwLDIsMSwyNDEsMzEsNTcsMTgsOCw1MSwyMzAsMTA3LDEzMCw4OSwxNDUsNDksNDcsODQsMjI3LDk2LDEyNiwyMywyMA==","AdditionalInfo":"MjA2LDg2LDE4Myw1NSw2NywxMDYsMTgxLDI0Niw1NSwzNiw1MSwyMjU=&MTIsMjQ3LDM4LDE5LDExOSwzNCw2NCwxOTYsMTg5LDM0LDY1LDExMCw1NiwxMjEsMjI0LDE5NCwyMiwyMTgsMTQ2LDE4MSwxMTcsNCwzMywzMiwxMiwxNzEsNTcsMiwzMg=="}]';
  return JSON.parse(accDat);
}




var accounts = JSON.parse(localStorage.getItem("pmtests_accounts"));
if (accounts == null) {accounts = [];}
var mk_pe = localStorage.getItem("pmtests_mk_pe");
var gtauk = "mxlplx";

function saveAccount(accountObjs) {
  console.log("I got "+accountObjs.length+" new accounts");
  return new Promise(function(resolve, reject) {
    $.each(accountObjs, function (index, account) {
      // check for master key
      if (account["PMUIMASTERKEY"]) {
        mk_pe = account["PMUIMASTERKEY"];
        localStorage.setItem("pmtests_mk_pe", mk_pe);
      } else {
        // Is this a known site
        var siteToEdit = accounts.findIndex(({Index}) => Index == account["Index"]);
        console.log("I got index "+siteToEdit+" for Index "+account["Index"]);
        if (siteToEdit == -1) {
          accounts.push(account);
        } else {
          accounts[siteToEdit] = account;
        }
        localStorage.setItem("pmtests_accounts", JSON.stringify(accounts));
      }
    });
    resolve();
  });
}

function getAccounts() {
  return new Promise(function(resolve, reject) {
    if (accounts == null) {
      resolve([]);
    } else {
      resolve(accounts);
    }
  });

}

function deleteAccount(accountIndex) {
  return new Promise(function(resolve, reject) {
    var siteToEdit = accounts.findIndex(({Index}) => Index === accountIndex);
    if (siteToEdit != -1) {
      accounts.splice(siteToEdit, 1);
      localStorage.setItem("pmtests_accounts", JSON.stringify(accounts));
    }
    resolve();
  });
}

$(document).ready(function(){
  M.AutoInit();

  if (mk_pe == null) {
    pmui.freshStart(getAccounts, saveAccount, deleteAccount, gtauk);
  } else {
    pmui.sessionStart(getAccounts, saveAccount, deleteAccount, mk_pe, gtauk);
  }

});
