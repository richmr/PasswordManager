# PasswordManager

This is a collection of JavaScript and HTML Service templates to turn a Google Sheet into a secure password manager.

This is offered free of charge and with no warranty of functionality.  To be honest, I am particularly worried about Google deciding to "randomly" deprecate App Scripts functions in the future and breaking my code.  It's happened before.

However, I use this for my own password management and will have to fix whatever they break to keep using it.

Also, to mitigate the risk of lost passwords, I will be providing a code set you can run as a local web page to decrypt a given password.  More on that later.

Finally, I will be fully describing the cryptography I used and how.  You will be able to decrypt your passwords if you follow the recipe.

## Limitations
- Google does not allow App Scripts to run on mobile devices, therefore this will not work on your phone or tablet.  It only works from desktop or laptop computers.  This made me sad but I already had the code working before I realized this limitation.
- I have only tested this on Chrome.  In theory, it will work on Safari, Firefox, and Opera.  It will not work on Microsoft browser products because they do not support the cryptography functions I used.
- This does not auto-magically sync with sites, or reset passwords, or any number of the fancy features you can pay for with other password managers.  It just keeps your personal passwords secure and accessible from any computer you can log in to with your Google account.
- I cannot help you recover your passwords if you forget your master passphrase.

## Privacy Statement
My add-on code does not collect your information in any way, shape, or form.  However, since it is connected to Google Sheets, [Google's Privacy Policy](https://policies.google.com/privacy?hl=en-US) is relevant.  Also there is an [App Scripts Dashboard](https://developers.google.com/apps-script/guides/dashboard) that lets me monitor aggregate usage of my add-on.  Any data that dashboard provides will also be accessible by me, but it is provided by Google and not my code itself.     

## Installation & Use


## Fearfully Asked Questions (FAQ)
1. **Will you have all of my passwords?**
  - No.  Your passwords are stored (encrypted) in the Google Sheet you connect this add-on to.  Unless you share that sheet with me, I cannot see the data.  And even if you share the sheet with me, I have to know or guess your master passphrase to decrypt the passwords
2. **Will Google have all of my passwords?**
  - No.  Your passwords are stored (encrypted) in the Google Sheet you connect this add-on to.  Google will have to know or guess your master passphrase to decrypt them.
  - If you are worried about Google having access to the encrypted passwords then you should re-evaluate your use of Google services.
3. **What kind of amateur encryption are you using anyway?**
  - I am using randomly-salted [AES-256](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard) encryption with a randomly-generated key protected by your master passphrase.
  - The biggest weakness is your master passphrase.  Choose wisely.
  - A full description of how I implemented the encryption is below
4. **Isn't JavaScript-based encryption dangerous?**
  - I'm not using JavaScript-based encryption.  I am using the [Subtle Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) to access the encryption capabilities built in to your browser.  As far as I know, this is the same encryption used by your browser to establish secure connections (i.e. HTTPS).   
  - Additionally, if you don't trust JavaScript, you need to re-evaluate your use of web sites.  I'm not saying that dismissively;  I use a script blocker to reduce risk and so should you.
5. **You are logging my keystrokes to steal my master passphrase, aren't you?**
  - No.  But since this will be running in your browser you can easily [see every network call inside of the developer console](https://developers.google.com/web/tools/chrome-devtools/network).
  - Do you have that kind of transparency with the password management service you are currently using?  Asking for a friend.

## Details of Secure Algorithm
- I use the [Subtle Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) for the actual AES-256 encryption.
- I wrote wrappers to simplify using those APIs in [subtlecryptowrap.js](TODO)
- The wrappers in there produce and use encrypted, Base-64 encoded strings like this: "MTQyLDg3LDgyLDE4NSwxMDMsNTMsMjA0LDI1NCw3NCwxNzgsMTk1LDEzOQ==&NDIsMTQ5LDExMywyMDUsNDksMTg0LDQ1LDkyLDE5NSw3MiwxMjgsMjQ4LDExOCwxNzgsMjUwLDI1LDE3NSwxMCw2MCwxOTQsOTEsMjksMTM5LDE3MiwyMjEsODQsODIsNzcsMTA4LDM4LDI5LDI1MA=="
- The string before the "&" is the randomized salt and the rest is the encrypted data.
- For the password manager, the 256 bit key used to encrypt the data is generated randomly.  It is then encrypted using key material derived from the master passphrase you set on initial start up.
- When you open the password manager, it will ask you for your master passphrase.  It will use the passphrase to decrypt the master key, which is then used to decrypt everything else.  
- If you change the master passphrase, it KEEPS the same master key, it just re-encrypts it using the new master passphrase.  Currently there is no capability to change the master key.
- At no point is your master passphrase ever stored on the Google Sheet, nor is the decrypted master key ever stored or sent anywhere; it is only kept in the browser's memory.
- To limit the number of times you have to enter your master passphrase, I store an encrypted copy of the master key in the local storage of your browser.  This copy is encrypted using key material derived from your [Temporary Active User Key](https://developers.google.com/apps-script/reference/base/session) provided by Google.
  - This is a string set by Google that is: unique per user per script, and only supposed to last for 30 days.
  - They look like this: ADw9Sr7nHOb0PwdCVT2QeJzm7sdfJzOES4hKrF+YqQ7IyI/NR8DqZKFCF5g/04PAQa99S+6Ckjvf
  - Every time you open the password manager I retrieve your Google-assigned unique key and attempt to use it to decrypt the master key stored on your computer.  If successful, you can access your stuff.  If not, you will be prompted for your master passphrase. 
