/*
Userinterface and logic for GAS-based Password Manager
Mike Rich, 2019
*/

var pmui = {
  accountData: [],  // The accountData object, array of JSON objects
  accountNames: {},
  siteToEdit: 0,
  nextIndex: 0,
  splashDelay: 1000,
  splashFrequency: 10, // Interval where splashes are shown
  splashLocalStorage: "pmui_splashCount",

  /*
  The callbacks below are used to get, save, and delete accounts
  get is to return an array of accountObjects.
  AccountObj = {Index: integer,
                Site: cleartext string site name,
                Username: ciphertext string user name,
                Password: ciphertext string password,
                AdditionalInfo: ciphertext string additional information}
  saveAccounts must accept an array of accountObjects
    Must also watch for a returned object like:
      {PMUIMASTERKEY: encipheredMasterKeySuitableForSaving}
  deleteAccount must accept an integer index of account to delete
  */
  getAccountsFunc: null, // callback pmui will use to get account data. f()
                        // to prevent object reference errors, this should return a
                        // JSON stringify version of the accounts object!
  saveAccountsFunc: null, // callback to save accounts. f(accountObjArray)
  deleteAccountFunc: null, // callback to delete an account f(accountIndex)
  gtauk: null, // Google temp user key (SSO token)
  mk_pe: null, // encrypted master key from storage

  later: function (delay) {
    // Utility delay timer
    // delay is in milliseconds
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
  },

  freshStart: function(getAccountsFunc, saveAccountsFunc, deleteAccountFunc, gtauk) {
    pmui.getAccountsFunc = getAccountsFunc;
    pmui.saveAccountsFunc = saveAccountsFunc;
    pmui.deleteAccountFunc = deleteAccountFunc;
    pmui.gtauk = gtauk;
    // Splash page, with no OK button
    $("#pm_about_ok").off("click");
    $("#pm_about_ok").click(function () {
      pmui.freshStart_ok();
    });
    $("#pm_about_splash").show();

    pmui.later(pmui.splashDelay)
      .then(foo => {
        // Get the password
        $("#pm_about_ok").removeClass("disabled");
        $("#pm_about_ok").text("Ok");
      });
    // Get a confirmed password
    // Then go to main page
  },

  freshStart_ok: function (gtauk) {
    $("#pm_about_splash").hide();
    $("#pm_freshstart").show();

    // Start watching that second password
    $("#pm_freshstart_password2").off("keyup");
    $("#pm_freshstart_password2").keyup(function (event) {
      if ($("#pm_freshstart_password2").val() == $("#pm_freshstart_password1").val()) {
        $("#pm_freshstart_go").text("Go!");
        $("#pm_freshstart_go").removeClass("disabled");
      } else {
        $("#pm_freshstart_go").text("Passphrases do not match");
        $("#pm_freshstart_go").addClass("disabled");
      }
    });

    // Connect the ok button
    $("#pm_freshstart_go").off("click");
    $("#pm_freshstart_go").click(function (event) {
      pmui.freshStart_gotPassphrase();
    });
  },

  freshStart_gotPassphrase: function () {
    var passphrase = $("#pm_freshstart_password2").val();
    var rawkey_ct = null;
    pmengine.freshStart(passphrase, pmui.gtauk)
      .then(rawkey_ct => {
        return pmui.saveAccountsFunc([{PMUIMASTERKEY:rawkey_ct}]);
      }).then(foo => {
        // Go main
        $("#pm_startup").show();
        $("#pm_freshstart").hide();
        pmui.sessionStart(pmui.getAccountsFunc, pmui.saveAccountsFunc, pmui.deleteAccountFunc, rawkey_ct, pmui.gtauk);
      });

  },

  passphraseUI: function (errMsg = null) {
    // Should generally be called from pm_startup
    //$("#pm_findaccount").hide();
    console.log("passphraseUI called");
    $("#pm_getpassphrase").modal("open");
    //$("#pm_startup").hide();


    if (errMsg) {
      $("#pm_getpassphrase_msg").addClass("red-text");
      $("#pm_getpassphrase_msg").text(errMsg);
    } else {
      $("#pm_getpassphrase_msg").removeClass("red-text");
      $("#pm_getpassphrase_msg").text("Please enter your passphrase");
    }

  },

  gotPassphrase: function () {
    // Per pmengine, now call decryptAndStoreMasterKey
    // Hide get passphrase and show startup
    //$("#pm_startup").show();
    $("#pm_getpassphrase").modal("close");

    // Call pmui
    var passphrase = $("#pm_getpassphrase_entry").val();
    pmui.uiSessionStart(passphrase);
  },

  sessionStart: function (getAccountsFunc, saveAccountsFunc, deleteAccountFunc, mk_pe, gtauk) {
    pmui.initButtons();

    pmui.getAccountsFunc = getAccountsFunc;
    pmui.saveAccountsFunc = saveAccountsFunc;
    pmui.deleteAccountFunc = deleteAccountFunc;
    pmui.gtauk = gtauk;
    pmui.mk_pe = mk_pe;

    pmui.getAccountsFunc()
      .then(accountsObjStr => {
        pmui.accountData = JSON.parse(accountsObjStr);
        pmui.uiSessionStart();
      });
  },

  uiSessionStart: function (passphrase = null) {
    // First unlock the masterKey
    this.accountNames = {};
    indexNumbers = [];

    pmengine.sessionStart(pmui.mk_pe, pmui.gtauk, pmui.passphraseUI, passphrase)
      .then(foo => {
        // set up the search bar
        $("#pm_startup_message").text("Processing accounts");
        $.each(this.accountData, function (index, anAccount) {
          pmui.accountNames[anAccount["Site"]] = null; // Per MaterializeCSS needs
          //console.log("uiSessionStart, indexNumbers.push");
          indexNumbers.push(anAccount["Index"]);
          // Update the status bar
          percDone = ((index+1)/pmui.accountData.length)*100;
          $("#pm_startup_progress_bar").attr("width", percDone+"%");
        });
        $("#pm_findaccount_autocomplete").autocomplete({
          data:pmui.accountNames,
          onAutocomplete:pmui.accountAutocompleted
        });
        // Set nextIndex
        // Watch out for empty list (no accounts)
        // in javascript the max of empty is -infinity...?
        if (indexNumbers.length) {
          pmui.nextIndex = Math.max(...indexNumbers) + 1;
        } else {// Catch empty set issue
          pmui.nextIndex = 1;
        }


      }).then(foo => {
        // initial value for the "Find" button
        $("#pm_findaccount_openbtn").text("Go");
        // switch views
        $("#pm_startup").hide();
        // Need to account for possibility of the passphrase ui showing here
        $("#pm_findaccount").show();


        $("#pm_findaccount_autocomplete").focus();
      });
  },

  initButtons: function () {
    // Passphrase button
    $("#pm_getpassphrase_go").click(pmui.gotPassphrase);

    // Init find button
    $("#pm_findaccount_openbtn").click(pmui.editAccount);

    // Viewable password
    $("#pm_editaccount_password_view").click(pmui.togglePasswordView);

    // Init password clipboard copy
    $("#pm_editaccount_password_copy").click(pmui.copyPasswordToClipboard);

    $("#pm_editaccount_save").click(pmui.saveChanges);
    $("#pm_editaccount_delete").click(pmui.deleteAccount);
    $("#pm_editaccount_cancel").click(pmui.doneEdit);

    $("#pm_editaccount_confirm_btn").click(pmui.confirmSaveChanges);
    $("#pm_editaccount_confirm_cancel_btn").click(pmui.cancelSave);
  },

  /// ---------------- edit account methods ------------ //
  accountAutocompleted: function () {
    pmui.editAccount();
  },

  editAccount: function () {
    // Ensure the entry boxes are clear
    $("#pm_editaccount_name").val("");
    $("#pm_editaccount_username").val("");
    $("#pm_editaccount_password").val("");
    $("#pm_editaccount_additional_notes").val("");

    // Find the record with the name
    var nameOfSite = $("#pm_findaccount_autocomplete").val();
    $("#pm_editaccount_password_copy").removeClass("disabled");

    //console.log(nameOfSite);
    pmui.siteToEdit = pmui.accountData.findIndex(({ Site }) => Site === nameOfSite);

    if (pmui.siteToEdit == -1) {
      // New account
      $("#pm_editaccount_name").val(nameOfSite);
      // Everything else stays blank
      // deactivate the Delete button
      $("#pm_editaccount_delete").addClass("disabled");
      // Activate the save button
      $("#pm_editaccount_save").text("Save New Account");
      $("#pm_editaccount_save").removeClass("disabled");
      // Rename "Done" to "Cancel"
      $("#pm_editaccount_cancel").text("Cancel");

      // Clear the autocomplete
      $("#pm_findaccount_autocomplete").val("");

      // switch views
      $("#pm_findaccount").hide();
      $("#pm_editaccount").show();

    } else {
      var accData =  pmui.accountData[pmui.siteToEdit];
      $("#pm_editaccount_name").val(accData.Site);

      // Decrypt all the things
      decryptPromises = [];
      //console.log("editAccount, decryptPromises pushes");
      decryptPromises.push(pmengine.decryptSecretWithMasterKey(accData.Username, true)
          .then(pt => {
            $("#pm_editaccount_username").val(pt);
          }));
      decryptPromises.push(pmengine.decryptSecretWithMasterKey(accData.Password, true)
          .then(pt => {
            $("#pm_editaccount_password").val(pt);
          }));
      decryptPromises.push(pmengine.decryptSecretWithMasterKey(accData.AdditionalInfo, true)
          .then(pt => {
            $("#pm_editaccount_additional_notes").val(pt);
            //M.textareaAutoResize($('#pm_editaccount_additional_notes'));
          }));
      Promise.all(decryptPromises)
        .then(foo => {
          M.updateTextFields();

          // All data should be in place
          $("#pm_editaccount_delete").removeClass("disabled");
          // Activate the save button
          $("#pm_editaccount_save").removeClass("disabled");
          $("#pm_editaccount_save").text("Save");

          // Rename "Done" to "Cancel"
          $("#pm_editaccount_cancel").text("Done");

          // switch views
          $("#pm_findaccount").hide();
          $("#pm_editaccount").show();

          // Clear the autocomplete
          $("#pm_findaccount_autocomplete").val("");
        });

    }
  },

  togglePasswordView: function () {
    //console.log("pw toggled");
    if ($("#pm_editaccount_password_view").is(':checked')) {
      document.getElementById("pm_editaccount_password").type = "text";
    } else {
      document.getElementById("pm_editaccount_password").type = "password";
    }
  },

  copyPasswordToClipboard: function () {
    var pswd_elem = document.getElementById("pm_editaccount_password");
    if (pswd_elem.type == "text") {
      pswd_elem.select();
      pswd_elem.setSelectionRange(0, 99999)
      document.execCommand("copy");
    } else {
      // We have to make the password visible to copy it
      pswd_elem.type = "text";
      pswd_elem.select();
      pswd_elem.setSelectionRange(0, 99999)
      document.execCommand("copy");
      pswd_elem.type = "password";
    }
    M.toast({html: "Copied!"})
  },

  /// ----------------- Save and confirm methods ------- //
  saveChanges: function () {
    // Show the confirm/cancel buttons
    // Set the text
    $("#pm_editaccount_confirmcancel_header").text("Confirm Changes?");
    $("#pm_editaccount_confirm_btn").text("Confirm");
    $("#pm_editaccount_confirm_cancel_btn").text("Cancel");

    // Show the div
    $("#pm_editaccount_confirmcancel").show();
  },

  deleteAccount: function () {
    // Show the confirm/cancel buttons
    // Set the text
    $("#pm_editaccount_confirmcancel_header").text("Delete Account?");
    $("#pm_editaccount_confirm_btn").text("Delete");
    $("#pm_editaccount_confirm_cancel_btn").text("Cancel");

    // Show the div
    $("#pm_editaccount_confirmcancel").show();
  },

  doneEdit: function () {
    // simply hide the edit div and show the search
    // switch views
    $("#pm_editaccount").hide();
    console.log("doneEdit findaccount show");

    $("#pm_findaccount").show();
  },

  confirmSaveChanges: function () {
    // Are we deleting or saving?
    if ($("#pm_editaccount_confirm_btn").text() == "Delete") {
      // We are deleting
      // Remove from the database (send the Index)
      pmui.deleteAccountFunc(pmui.accountData[pmui.siteToEdit]["Index"]);

      // Remove from account data
      // From name list first
      delete pmui.accountNames[$("#pm_editaccount_name").val()];
      pmui.accountData.splice(pmui.siteToEdit,1);

      // Feedback
      M.toast({html: "Deleted!"});

      // switch views
      $("#pm_editaccount_confirmcancel").hide();
      $("#pm_editaccount").hide();
      console.log("confirmSaveChanges findaccount show");

      $("#pm_findaccount").show();

    } else {
      // We are saving
      // Create a new accountObj
      accData = {};
      // Is this a new account?
      if (pmui.siteToEdit == -1) {
        accData["Index"] = pmui.nextIndex;
        pmui.nextIndex++;
      } else {
        // Copy old index
        accData["Index"] = pmui.accountData[pmui.siteToEdit]["Index"];
      }
      // Get the PT for now
      accData["Site"] = $("#pm_editaccount_name").val();
      accData["Username"] = $("#pm_editaccount_username").val();
      accData["Password"] = $("#pm_editaccount_password").val();
      accData["AdditionalInfo"] = $("#pm_editaccount_additional_notes").val();

      // Encrypt all the things
      encryptPromises = [];
      //console.log("confirmSave, encryptPromises pushes");
      encryptPromises.push(pmengine.encryptSecretWithMasterKey(accData.Username)
          .then(ct => {
            accData.Username = ct;
          }));
      encryptPromises.push(pmengine.encryptSecretWithMasterKey(accData.Password)
          .then(ct => {
            accData.Password = ct;
          }));
      encryptPromises.push(pmengine.encryptSecretWithMasterKey(accData.AdditionalInfo)
          .then(ct => {
            accData.AdditionalInfo = ct;
          }));
      Promise.all(encryptPromises)
        .then(foo => {
          // Save this new data
          //console.log("confirmSave, pre saveAccountsFunc length = "+pmui.accountData.length);
          pmui.saveAccountsFunc([accData])
            .then(foo => {
              //console.log("confirmSave, post saveAccountsFunc length = "+pmui.accountData.length);
          });

          //console.log("confirmSave, pre if accountData length = "+pmui.accountData.length);


          // store it in the local data
          if (pmui.siteToEdit == -1) {
            //console.log("confirmSave, accountData push (data: "+JSON.stringify(accData)+")");
            //console.log("confirmSave, prepush accountData length = "+pmui.accountData.length);
            pmui.accountData.push(accData);
            //console.log("confirmSave, post accountData length = "+pmui.accountData.length);

            pmui.accountNames[accData["Site"]] = null;
          } else {
            // get and remove old site name
            var oldName = pmui.accountData[pmui.siteToEdit]["Site"];
            delete pmui.accountNames[oldName];
            // add new site name back in
            pmui.accountNames[accData["Site"]] = null;

            // Replace old data at this Index
            pmui.accountData[pmui.siteToEdit] = accData;

          }
          // feedback
          M.toast({html: "Saved!"})
          // switch views
          $("#pm_editaccount_confirmcancel").hide();
          $("#pm_editaccount").hide();
          console.log("confirmSaveChanges2 findaccount show");

          $("#pm_findaccount").show();

        });
    }
  },

  cancelSave: function () {
    // Just some feedback and return to edit view
    M.toast({html: "Cancelled!"});
    $("#pm_editaccount_confirmcancel").hide();
  },


  fakeVals: function() {
    accDat =  '[{"Index":1,"Site":"google","Username":"NjgsMTUxLDExOCwyNDksNjMsMTM5LDE3Niw1NSwxNzAsNDcsOTEsNDQ=&NjMsMTkwLDEwMSwxNywxODUsMTMwLDE0NiwxMDUsMTc1LDE3MiwyNiwyMDgsMTI0LDIyNCwxNjIsNDQsMTUxLDE1OCwyNTAsMTY0LDcwLDAsMTY0LDk2LDIyOSwxMiwyMTEsMjM5LDE1MywxMDU=","Password":"MjEzLDE0MSwxMiwyMzAsMjEsNjcsMTUxLDczLDEzOCw3OCwyMTIsMjM2&MzMsNTgsMjAyLDEyNCwxMTIsMTQ0LDI1NCwyMjIsMjUxLDc4LDIzMywyNiwyMjAsMTY1LDIzOCwxMTYsNzIsMjUxLDg4LDE0OSwxOTQsMTE3LDExMCwxMTQsMTYyLDIzOSw4OSwyMDYsNTYsMTAx","AdditionalInfo":"MTg4LDMzLDIwNiwxOCwyMywyOCwxMDgsMTExLDkyLDUxLDM5LDMx&MTA3LDE1MiwyMDksMjQsOTQsMjI0LDkyLDQyLDkzLDIwNCwxMzMsNDAsMzcsMTY0LDIxMywxMzAsMjE2LDQ2LDQsMjksMjEsMTg1LDE5LDE4NCwxMjMsMTM3LDEzNg=="},{"Index":2,"Site":"apple","Username":"MjQ1LDg3LDE5MywyMywxNDgsMTI3LDExMSwxNzUsMjUyLDUzLDE3NSw5Mg==&MjM5LDc3LDY0LDE0Niw1MiwxNjcsNjUsNDUsNDIsOTcsMTMzLDEwOSwzMyw4OSwxNywxNjAsMTAsMzcsMTM3LDExNCwyMzUsMjMxLDk2LDEzOCwxNjUsMTc0LDEyOCwzMCwyMDk=","Password":"MzcsMjQxLDI0Myw3OSwzNCwxNiwxNzAsMjE4LDEzOCwxNzYsODcsMjA=&MTczLDEwMSwyNCwzLDEwLDEsMTcsMzQsMjIsMTUzLDI0NCwyMTEsMTQxLDE3NywxMTIsMjQxLDE3OCwyMTMsMTc0LDI0Myw2OCw0NSwxNjYsMjUzLDE2NCwyMTYsMTI3LDExNyw4MA==","AdditionalInfo":"MjUsMjAxLDI0NiwxNjksMjQ4LDExMSw2NSwyNDksODcsMTY0LDI1NCwyMzQ=&MTI4LDkzLDE5NiwxLDExNCwxMDcsMTE1LDE3OCwxODYsMzQsNDIsNTUsMzQsMjEyLDE4NSw5LDE5MSwyMzMsMzUsNDEsMTMwLDg5LDUzLDU1LDEyNCw3Ng=="},{"Index":3,"Site":"la dwp","Username":"MTkxLDc0LDQyLDE3NCwzMywxNzEsOTIsOTMsMjM3LDI5LDE2MCw4NA==&NjUsMjI4LDE2Miw1NCwzMSwyNCwxMSwyNSwxNTAsMjE5LDEzOCwyMzYsMTA5LDIyNCw1OSwyNTUsNzYsNTQsODQsMTU1LDYsMjEsMjA5LDIwMCwyMTIsMTE3LDEyMSwxNTEsMTM2LDQ1","Password":"MTY1LDEyNiwyMDgsMTYxLDEyLDI3LDY0LDE0MSw2MSwxOTksNTEsNTU=&MTYsMzIsMjEzLDE1MSwyMDYsMTM2LDIxMSwyMTksNjksMjA3LDExMiw2Miw5MywyMDQsMTE3LDIwLDIzNSwyMjMsNDksMTA3LDIxNSwyMTMsMjQzLDI0MywyNCwyNTIsMjI4LDYwLDE0NSwyMDg=","AdditionalInfo":"MTU5LDk2LDIxNyw2MSw4MiwxNjIsMjIxLDIyLDIzNCwxNDEsMjUsMzQ=&NjEsMTc3LDE0NCwyMTksMTk2LDI1MywxMjcsMjU0LDQ0LDE4Miw1MSwxMDQsMTQzLDIyMiw1Myw3MSwxNTQsMjUwLDE0MywyMDAsMjQ5LDEsNzgsNzAsMTQxLDE3OCwxMDg="},{"Index":4,"Site":"goatherd","Username":"OTksMjUzLDI0OCwxNzcsMTMyLDE4NiwyNCw4NCwyNDYsMTExLDExMywxMzU=&MTc1LDMxLDI1MywyMTUsMjE0LDU2LDE2NCwzOCwyMzQsMjAxLDE1Myw2LDEzNCwxODAsMjQ5LDIxMiwyLDQ2LDE2NywxODgsMTAyLDEzNiwyMDQsMTU4LDE2MCwxNjAsMTYzLDEwOCwyMDgsMzEsNTUsMTI1","Password":"MTY1LDM5LDIxLDIyMCwyNDQsNTEsMTIxLDE1MSwxLDIxMSwyNTIsMjMz&MjA5LDgzLDE5Miw3OSw2NywyMDMsMjAxLDIwMiwxMzYsMTY2LDIwLDIsMSwyNDEsMzEsNTcsMTgsOCw1MSwyMzAsMTA3LDEzMCw4OSwxNDUsNDksNDcsODQsMjI3LDk2LDEyNiwyMywyMA==","AdditionalInfo":"MjA2LDg2LDE4Myw1NSw2NywxMDYsMTgxLDI0Niw1NSwzNiw1MSwyMjU=&MTIsMjQ3LDM4LDE5LDExOSwzNCw2NCwxOTYsMTg5LDM0LDY1LDExMCw1NiwxMjEsMjI0LDE5NCwyMiwyMTgsMTQ2LDE4MSwxMTcsNCwzMywzMiwxMiwxNzEsNTcsMiwzMg=="}]';
    this.accountData = JSON.parse(accDat);
  }
}
