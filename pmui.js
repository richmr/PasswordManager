/*
Userinterface and logic for GAS-based Password Manager
Mike Rich, 2019
*/

var pmui = {
  accountData: null,  // The accountData object, array of JSON objects
  accountNames: {},
  siteToEdit: 0,

  init: function () {
    pmui.initButtons();

    // First unlock the masterKey
    this.accountNames = {};
    pmengine.recoverMasterKeyFromLocalStorage()
      .then(foo => {
        // set up the search bar
        $("#pm_startup_message").text("Processing accounts");
        $.each(this.accountData, function (index, anAccount) {
          pmui.accountNames[anAccount["Site"]] = null; // Per MaterializeCSS needs
          // Update the status bar
          percDone = ((index+1)/pmui.accountData.length)*100;
          $("#pm_startup_progress_bar").attr("width", percDone+"%");
        });
        $("#pm_findaccount_autocomplete").autocomplete({
          data:pmui.accountNames,
          onAutocomplete:pmui.accountAutocompleted
        });
        
      }).then(foo => {
        // initial value for the "Find" button
        $("#pm_findaccount_openbtn").text("Go");

        // switch views
        $("#pm_startup").hide();
        $("#pm_findaccount").show();
        $("#pm_findaccount_autocomplete").focus();
      });
  },

  initButtons: function () {
    // Init find button
    $("#pm_findaccount_openbtn").click(pmui.editAccount);

    // Viewable password
    $("#pm_editaccount_password_view").click(pmui.togglePasswordView);

    // Init password clipboard copy
    $("#pm_editaccount_password_copy").click(pmui.copyPasswordToClipboard);

    //$("#pm_editaccount_save").click(pmui.saveChanges);
    //$("#pm_editaccount_delete").click(pmui.deleteAccount);
    //$("#pm_editaccount_cancel").click(pmui.doneEdit);

    //$("#pm_editaccount_confirm_btn").click(pmui.confirmSaveChanges);
    //$("#pm_editaccount_confirm_cancel_btn").click(pmui.cancelSave);
  },

  /// ---------------- edit account methods ------------ //
  accountAutocompleted: function () {
    pmui.editAccount();
  },

  editAccount: function () {
    // Find the record with the name
    var nameOfSite = $("#pm_findaccount_autocomplete").val();
    $("#pm_editaccount_password_copy").removeClass("disabled");

    console.log(nameOfSite);
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

      // switch views
      $("#pm_findaccount").hide();
      $("#pm_editaccount").show();

    } else {
      var accData =  pmui.accountData[pmui.siteToEdit];
      $("#pm_editaccount_name").val(accData.Site);

      // Decrypt all the things
      decryptPromises = [];
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
          // Rename "Done" to "Cancel"
          $("#pm_editaccount_cancel").text("Done");

          // switch views
          $("#pm_findaccount").hide();
          $("#pm_editaccount").show();
        });

    }
  },

  togglePasswordView: function () {
    console.log("pw toggled");
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

  fakeVals: function() {
    accDat =  '[{"Index":1,"Site":"google","Username":"NjgsMTUxLDExOCwyNDksNjMsMTM5LDE3Niw1NSwxNzAsNDcsOTEsNDQ=&NjMsMTkwLDEwMSwxNywxODUsMTMwLDE0NiwxMDUsMTc1LDE3MiwyNiwyMDgsMTI0LDIyNCwxNjIsNDQsMTUxLDE1OCwyNTAsMTY0LDcwLDAsMTY0LDk2LDIyOSwxMiwyMTEsMjM5LDE1MywxMDU=","Password":"MjEzLDE0MSwxMiwyMzAsMjEsNjcsMTUxLDczLDEzOCw3OCwyMTIsMjM2&MzMsNTgsMjAyLDEyNCwxMTIsMTQ0LDI1NCwyMjIsMjUxLDc4LDIzMywyNiwyMjAsMTY1LDIzOCwxMTYsNzIsMjUxLDg4LDE0OSwxOTQsMTE3LDExMCwxMTQsMTYyLDIzOSw4OSwyMDYsNTYsMTAx","AdditionalInfo":"MTg4LDMzLDIwNiwxOCwyMywyOCwxMDgsMTExLDkyLDUxLDM5LDMx&MTA3LDE1MiwyMDksMjQsOTQsMjI0LDkyLDQyLDkzLDIwNCwxMzMsNDAsMzcsMTY0LDIxMywxMzAsMjE2LDQ2LDQsMjksMjEsMTg1LDE5LDE4NCwxMjMsMTM3LDEzNg=="},{"Index":2,"Site":"apple","Username":"MjQ1LDg3LDE5MywyMywxNDgsMTI3LDExMSwxNzUsMjUyLDUzLDE3NSw5Mg==&MjM5LDc3LDY0LDE0Niw1MiwxNjcsNjUsNDUsNDIsOTcsMTMzLDEwOSwzMyw4OSwxNywxNjAsMTAsMzcsMTM3LDExNCwyMzUsMjMxLDk2LDEzOCwxNjUsMTc0LDEyOCwzMCwyMDk=","Password":"MzcsMjQxLDI0Myw3OSwzNCwxNiwxNzAsMjE4LDEzOCwxNzYsODcsMjA=&MTczLDEwMSwyNCwzLDEwLDEsMTcsMzQsMjIsMTUzLDI0NCwyMTEsMTQxLDE3NywxMTIsMjQxLDE3OCwyMTMsMTc0LDI0Myw2OCw0NSwxNjYsMjUzLDE2NCwyMTYsMTI3LDExNyw4MA==","AdditionalInfo":"MjUsMjAxLDI0NiwxNjksMjQ4LDExMSw2NSwyNDksODcsMTY0LDI1NCwyMzQ=&MTI4LDkzLDE5NiwxLDExNCwxMDcsMTE1LDE3OCwxODYsMzQsNDIsNTUsMzQsMjEyLDE4NSw5LDE5MSwyMzMsMzUsNDEsMTMwLDg5LDUzLDU1LDEyNCw3Ng=="},{"Index":3,"Site":"la dwp","Username":"MTkxLDc0LDQyLDE3NCwzMywxNzEsOTIsOTMsMjM3LDI5LDE2MCw4NA==&NjUsMjI4LDE2Miw1NCwzMSwyNCwxMSwyNSwxNTAsMjE5LDEzOCwyMzYsMTA5LDIyNCw1OSwyNTUsNzYsNTQsODQsMTU1LDYsMjEsMjA5LDIwMCwyMTIsMTE3LDEyMSwxNTEsMTM2LDQ1","Password":"MTY1LDEyNiwyMDgsMTYxLDEyLDI3LDY0LDE0MSw2MSwxOTksNTEsNTU=&MTYsMzIsMjEzLDE1MSwyMDYsMTM2LDIxMSwyMTksNjksMjA3LDExMiw2Miw5MywyMDQsMTE3LDIwLDIzNSwyMjMsNDksMTA3LDIxNSwyMTMsMjQzLDI0MywyNCwyNTIsMjI4LDYwLDE0NSwyMDg=","AdditionalInfo":"MTU5LDk2LDIxNyw2MSw4MiwxNjIsMjIxLDIyLDIzNCwxNDEsMjUsMzQ=&NjEsMTc3LDE0NCwyMTksMTk2LDI1MywxMjcsMjU0LDQ0LDE4Miw1MSwxMDQsMTQzLDIyMiw1Myw3MSwxNTQsMjUwLDE0MywyMDAsMjQ5LDEsNzgsNzAsMTQxLDE3OCwxMDg="},{"Index":4,"Site":"goatherd","Username":"OTksMjUzLDI0OCwxNzcsMTMyLDE4NiwyNCw4NCwyNDYsMTExLDExMywxMzU=&MTc1LDMxLDI1MywyMTUsMjE0LDU2LDE2NCwzOCwyMzQsMjAxLDE1Myw2LDEzNCwxODAsMjQ5LDIxMiwyLDQ2LDE2NywxODgsMTAyLDEzNiwyMDQsMTU4LDE2MCwxNjAsMTYzLDEwOCwyMDgsMzEsNTUsMTI1","Password":"MTY1LDM5LDIxLDIyMCwyNDQsNTEsMTIxLDE1MSwxLDIxMSwyNTIsMjMz&MjA5LDgzLDE5Miw3OSw2NywyMDMsMjAxLDIwMiwxMzYsMTY2LDIwLDIsMSwyNDEsMzEsNTcsMTgsOCw1MSwyMzAsMTA3LDEzMCw4OSwxNDUsNDksNDcsODQsMjI3LDk2LDEyNiwyMywyMA==","AdditionalInfo":"MjA2LDg2LDE4Myw1NSw2NywxMDYsMTgxLDI0Niw1NSwzNiw1MSwyMjU=&MTIsMjQ3LDM4LDE5LDExOSwzNCw2NCwxOTYsMTg5LDM0LDY1LDExMCw1NiwxMjEsMjI0LDE5NCwyMiwyMTgsMTQ2LDE4MSwxMTcsNCwzMywzMiwxMiwxNzEsNTcsMiwzMg=="}]';
    this.accountData = JSON.parse(accDat);
  }
}
