/*
Userinterface and logic for GAS-based Password Manager
Mike Rich, 2019
*/

var pmui = {
  accountData: null,  // The accountData object, array of JSON objects
  accountNames: null, // Sorted list of account names?
  accountSortField: "Site", // This is what the autocomplete dropdown will sort on

  whoops: function(msg, err = null) {
    console.log(msg); // To be actually logged to the HTML interface eventually
    if (err) {throw(err);} // Needed to help preserve stack trace for debugging
  },

  startup: function () {
    // Create sorted array of account data
    //this.accountData = _.sortBy(accountData, function (o) {return o.[accountSortField];});
    // No?  materialize sorts by default
    
    // Create list of accounts
    _.forEach(this.accountData, function (value) {
      // MaterializeCSS requires "Value":null
      this.accountNames[value[this.accountSortField]] = null;
    });

    pmengine.recoverMasterKeyFromLocalStorage()
      .then(response => {
        // Okay to show normal gui
        this.showStartPage();
      }).catch(err => {
        this.whoops("pmui.Startup: " +err.name+ " " +err.message)
      });
  }

}
