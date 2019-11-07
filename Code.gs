function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('My Passwords')
      .addItem('Go', 'openMyPasswords')
      .addToUi();
}

function openMyPasswords() {
  var html = HtmlService.createTemplateFromFile('MyPasswords_GAS')
      .evaluate()
      .setWidth(700);

  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, 'My Passwords');
}


function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/*
function retrievescript(url) {
  var html = UrlFetchApp.fetch(url).getContentText();
  return html;
}
*/

function getMyPasswordTab() {
  var sheet = SpreadsheetApp.getActive();
  var dataTab = sheet.getSheetByName('MyPasswordData');
  return dataTab;
}

function getMyPasswordTabValues() {
  var values = getMyPasswordTab().getDataRange().getValues();
  return values;
}

function findTableRowofAccountByIndex(accountIndex) {
  var accounts = getMyPasswordTabValues();
  // var rowSkip = 2; // Skip for MasterKey and headers NOT ACTUALLY NEEDED
  var siteRow = -1;  // Return -1 if not found, consistent with .findIndex
  for (i = 0; i < accounts.length; i++) {
    if (accounts[i][0] == accountIndex) {
      siteRow = i+1; // Returning a TABLE row
      break;
    }
  }
  return siteRow;
}

function getAccounts() {
  var accountInfo = getMyPasswordTabValues();
  // Get the headers
  var headers = [];
  for (i = 0; i < 5; i++) {
    headers.push(accountInfo[1][i]);  // headers are on row2 = 1 in array index
  }
  //Logger.log(JSON.stringify(headers));
  // Now make an array of json objects
  accountObj = [];
  for (i = 2; i < accountInfo.length; i++) { // Data starts on row 3 = 2 in array index
    thisRow = {};
    for (j = 0; j < 5; j++) {
      thisRow[headers[j]] = accountInfo[i][j];
    }
    //Logger.log(thisRow);
    accountObj.push(thisRow);
  }

  accountString = JSON.stringify(accountObj);
  //Logger.log(accountString);
  return accountString;
}

function saveAccount(accountObjs) {
  accountObjs.forEach(function (account, index) {
      // check for master key
      if (account["PMUIMASTERKEY"]) {
        mk_pe = account["PMUIMASTERKEY"];
        saveMasterkey(mk_pe);
      } else {
        var valuesToStore = [[account.Index, account.Site, account.Username, account.Password, account.AdditionalInfo]];
        var dataTab = getMyPasswordTab();
        // Is this a known site?
        var siteToEdit = findTableRowofAccountByIndex(account.Index);
        if (siteToEdit == -1) {
          // Add data to end of the table
          var tgtRow = dataTab.getLastRow()+1;
          dataTab.getRange(tgtRow, 1, 1, 5).setValues(valuesToStore);
        } else {
          // Replace data at this row
          dataTab.getRange(siteToEdit, 1, 1, 5).setValues(valuesToStore);
        }

      }
    });
}

function deleteAccount(accountIndex) {
  var siteToDelete = findTableRowofAccountByIndex(accountIndex);
  if (siteToDelete == -1) {
    Logger.log("deleteAccount: No matching row for Index = " + accountIndex);
  } else {
    // Replace data at this row
    var dataTab = getMyPasswordTab();
    dataTab.deleteRow(siteToDelete);
  }
}

function saveMasterkey(mk_pe) {
  var accountTab = getMyPasswordTab();
  accountTab.getRange(1,2).setValue(mk_pe);
}

function getMasterkey() {
  var accountTab = getMyPasswordTab();
  var mk_pe_cell = accountTab.getRange(1,2);
  if (mk_pe_cell.isBlank()) {
    return null;
  } else {
    return mk_pe_cell.getValue();
  }
}

function getGTAUK() {
  return Session.getTemporaryActiveUserKey();
}

/*
function testGTAUK() {
  Logger.log(getGTAUK());
}


function saveTest(){
  var account1 = {Index:1, Site:"site1-changed", Username:"user1", Password:"pass1", AdditionalInfo:"ai1"};
  var account2 = {Index:3, Site:"site3", Username:"user3", Password:"pass3", AdditionalInfo:"ai3"};
  saveAccount([account1, account2]);

  //saveMasterkey("goobledygook");
}

function deleteTest() {
  deleteAccount(3);
}

function loadTest() {
  Logger.log(getMasterkey());
}

function getTest() {
  Logger.log(getAccounts());
}
*/

/*
function testModalModal() {
  var html = HtmlService.createHtmlOutputFromFile('modaltest')
    .setWidth(600);
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, 'modal modal test');
}

function testing143(obj) {
  Logger.log(obj);
  return "hello";
}

function htmlServiceLog(obj) {
  Logger.log(obj);
  return 1;
}
*/
