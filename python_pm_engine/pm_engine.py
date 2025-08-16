"""
Password Manager Engine for Python
Mirrors the functionality from PasswordManageEngine.js
"""

import json
import os
from typing import Optional, Callable, Union
from pm_crypto import (
    ez_subtle_decrypt, 
    ez_subtle_encrypt, 
    import_raw_key,
    generate_and_export_key
)


class PasswordManagerEngine:
    """Python implementation of the JavaScript Password Manager Engine"""
    
    def __init__(self):
        self.master_key: Optional[bytes] = None
        self.master_key_passcode_encrypted: Optional[str] = None
        self.google_temp_active_user_key: Optional[str] = None
        self.master_key_local_storage_tag = "pmengine_masterkey"
        self.master_key_expiration = 5 * 0.000011  # Days until expiration
        self.get_passphrase_callback: Optional[Callable] = None
        
        # Storage file for persistent data (replaces cookies/localStorage)
        self.storage_file = "pm_engine_storage.json"
    
    def whoops(self, msg: str, err: Optional[Exception] = None):
        """Error handling function (equivalent to whoops in JS)"""
        print(f"ERROR: {msg}")
        if err:
            raise err
    
    def _load_storage(self) -> dict:
        """Load persistent storage (replaces cookies/localStorage)"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.whoops(f"Failed to load storage: {e}")
        return {}
    
    def _save_storage(self, data: dict):
        """Save persistent storage (replaces cookies/localStorage)"""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            self.whoops(f"Failed to save storage: {e}")
    
    def _get_cookie(self, name: str) -> Optional[str]:
        """Get value from storage (replaces getCookie in JS)"""
        storage = self._load_storage()
        return storage.get(name)
    
    def _set_cookie(self, name: str, value: str, expiration_days: float):
        """Set value in storage (replaces setCookie in JS)"""
        storage = self._load_storage()
        storage[name] = value
        self._save_storage(storage)
    
    def fresh_start(self, passphrase: str, gtauk: str) -> str:
        """
        New start setup (equivalent to freshStart in JS)
        - Generates new master key, encrypted with passphrase
        - Stores master key with GTAUK
        - Returns encrypted master key
        """
        self.google_temp_active_user_key = gtauk
        
        # Generate new key
        new_key = generate_and_export_key()
        self.master_key = new_key
        
        # Encrypt with passphrase
        encrypted_key = ez_subtle_encrypt(new_key, passphrase)
        self.master_key_passcode_encrypted = encrypted_key
        
        # Store master key
        self._store_master_key()
        
        return encrypted_key
    
    def session_start(self, mk_pe: str, gtauk: str, passphrase_callback: Callable, 
                     passphrase: Optional[str] = None) -> bool:
        """
        Session start (equivalent to sessionStart in JS)
        - Recovers master key from storage or asks for passphrase
        """
        self.master_key_passcode_encrypted = mk_pe
        self.google_temp_active_user_key = gtauk
        self.get_passphrase_callback = passphrase_callback
        
        return self._recover_master_key_from_local_storage(passphrase)
    
    def _store_master_key(self) -> bool:
        """Store master key (equivalent to storeMasterKey in JS)"""
        if self.master_key is None:
            self.whoops("Master key is not set!")
            return False
        
        try:
            # Export the key
            raw_key_arr = generate_and_export_key(self.master_key)
            
            # Encrypt with GTAUK
            raw_key_str = ez_subtle_encrypt(raw_key_arr, self.google_temp_active_user_key)
            
            # Store it
            self._set_cookie(self.master_key_local_storage_tag, raw_key_str, self.master_key_expiration)
            return True
            
        except Exception as err:
            self.whoops(f"storeMasterKey: {err}")
            return False
    
    def _recover_master_key_from_local_storage(self, passphrase: Optional[str] = None) -> bool:
        """
        Recover master key from storage (equivalent to recoverMasterKeyFromLocalStorage in JS)
        - Checks storage for stored master key
        - Attempts to decrypt with GTAUK
        - Falls back to passphrase decryption if needed
        """
        try:
            # Try to get stored master key
            master_key_from_storage = self._get_cookie(self.master_key_local_storage_tag)
            
            if master_key_from_storage:
                # Attempt decrypt using GTAUK
                try:
                    mk_raw = ez_subtle_decrypt(master_key_from_storage, self.google_temp_active_user_key)
                    
                    # Convert to key bytes
                    mk = import_raw_key(mk_raw)
                    
                    # Save master key
                    self.master_key = mk
                    return True
                    
                except Exception as err:
                    self.whoops(f"Failed to decrypt stored key: {err}")
                    # Fall back to passphrase decryption
                    return self._decrypt_and_store_master_key(passphrase)
            else:
                # No stored key, use passphrase
                return self._decrypt_and_store_master_key(passphrase)
                
        except Exception as err:
            self.whoops(f"recoverMasterKeyFromLocalStorage: {err}")
            return self._decrypt_and_store_master_key(passphrase)
    
    def _decrypt_and_store_master_key(self, passphrase: Optional[str] = None) -> bool:
        """
        Decrypt master key using passphrase (equivalent to decryptAndStoreMasterKey in JS)
        """
        if passphrase is None:
            if self.get_passphrase_callback:
                self.get_passphrase_callback()
            return False
        
        try:
            # Decrypt master key using passphrase
            key_arr = ez_subtle_decrypt(self.master_key_passcode_encrypted, passphrase)
            
            # Convert to key bytes
            mk = import_raw_key(key_arr)
            
            # Save and store it
            self.master_key = mk
            self._store_master_key()
            
            return True
            
        except Exception as err:
            self.whoops(f"decryptAndStoreMasterKey: {err}")
            if self.get_passphrase_callback:
                self.get_passphrase_callback("Passphrase did not work. Please try again")
            return False
    
    def change_passphrase_on_master_key(self, new_passphrase: str) -> str:
        """
        Change passphrase on master key (equivalent to changePassphraseOnMasterKey in JS)
        - Encrypts existing master key with new passphrase
        - Returns encrypted key suitable for storage
        """
        if self.master_key is None:
            self.whoops("No master key available!")
            return ""
        
        try:
            # Export the key
            raw_key_arr = generate_and_export_key(self.master_key)
            
            # Encrypt with new passphrase
            raw_key_ct = ez_subtle_encrypt(raw_key_arr, new_passphrase)
            
            # Update internal variable
            self.master_key_passcode_encrypted = raw_key_ct
            
            return raw_key_ct
            
        except Exception as err:
            self.whoops(f"changePassphraseOnMasterKey: {err}")
            return ""
    
    def decrypt_secret_with_master_key(self, ciphertext: str, readable: bool = False) -> Union[bytes, str]:
        """
        Decrypt secret with master key (equivalent to decryptSecretWithMasterKey in JS)
        - Returns decrypted secret as bytes or readable string
        """
        if self.master_key is None:
            self.whoops("Cannot decrypt! Get master key first.")
            return b"" if not readable else ""
        
        try:
            plaintext = ez_subtle_decrypt(ciphertext, self.master_key)
            
            if readable:
                return plaintext.decode('utf-8')
            else:
                return plaintext
                
        except Exception as err:
            self.whoops(f"decryptSecretWithMasterKey: {err}")
            return b"" if not readable else ""
    
    def encrypt_secret_with_master_key(self, plaintext: Union[str, bytes]) -> str:
        """
        Encrypt secret with master key (equivalent to encryptSecretWithMasterKey in JS)
        - Returns encrypted secret in "ez" format
        """
        if self.master_key is None:
            self.whoops("Cannot encrypt! Get master key first.")
            return ""
        
        try:
            ciphertext = ez_subtle_encrypt(plaintext, self.master_key)
            return ciphertext
            
        except Exception as err:
            self.whoops(f"encryptSecretWithMasterKey: {err}")
            return ""
    
    def fake_vals(self):
        """Test function with fake values (equivalent to fakeVals in JS)"""
        self.google_temp_active_user_key = "mxlplx"
        # passphrase is "password"
        self.master_key_passcode_encrypted = "MTI2LDE2MCwxOSwxMTgsNzgsMjcsMjE4LDY1LDIzNiwxMCwxODEsMTAw&MTUzLDE5OSwxNjIsNjMsMjM0LDE1NCwxNzYsNTIsMTkzLDcyLDEwMSwyLDE0LDg5LDMxLDIwNyw0MSwyMjcsMjksMjAsMjIyLDEyNiwxOTksMjA2LDExOSwyNCwxNTksMTQ4LDIyOCwxNjYsMjQ4LDIzMSwyMSw3MywyMTMsNjUsODUsNDQsMTAyLDgxLDEyLDE4NCwxNzEsMTUxLDQ5LDI1MiwxNjgsMjE0"
