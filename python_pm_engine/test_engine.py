"""
Test script for the Python Password Manager Engine
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pm_engine import PasswordManagerEngine
from pm_crypto import ez_subtle_encrypt, ez_subtle_decrypt


def test_basic_encryption():
    """Test basic encryption/decryption functionality"""
    print("🔐 Testing basic encryption/decryption...")
    
    secret = "Hello, World! This is a test secret."
    passphrase = "test_password_123"
    
    # Encrypt
    encrypted = ez_subtle_encrypt(secret, passphrase)
    print(f"  Encrypted: {encrypted[:50]}...")
    
    # Decrypt
    decrypted = ez_subtle_decrypt(encrypted, passphrase)
    decrypted_str = decrypted.decode('utf-8')
    
    print(f"  Decrypted: {decrypted_str}")
    print(f"  Match: {secret == decrypted_str}")
    
    if secret != decrypted_str:
        raise ValueError("Encryption/decryption test failed!")
    
    print("✅ Basic encryption test passed!\n")


def test_master_key_flow():
    """Test the master key encryption/decryption flow"""
    print("🔑 Testing master key flow...")
    
    # Create engine
    engine = PasswordManagerEngine()
    
    # Set up test values
    test_passphrase = "master_password_456"
    test_gtauk = "test_gtauk_789"
    
    # Generate a new master key
    from pm_crypto import generate_sym_key
    new_key = generate_sym_key()
    print(f"  Generated master key (hex): {new_key.hex()}")
    
    # Set the master key
    engine.master_key = new_key
    
    # Encrypt with passphrase
    encrypted_key = engine.change_passphrase_on_master_key(test_passphrase)
    print(f"  Encrypted master key: {encrypted_key[:50]}...")
    
    # Create a new engine instance to simulate fresh session
    engine2 = PasswordManagerEngine()
    engine2.master_key_passcode_encrypted = encrypted_key
    engine2.google_temp_active_user_key = test_gtauk
    
    # Create passphrase callback
    def passphrase_callback(error_msg=None):
        return test_passphrase
    
    engine2.get_passphrase_callback = passphrase_callback
    
    # Try to recover the master key
    success = engine2._recover_master_key_from_local_storage(test_passphrase)
    
    if success:
        print(f"  Recovered master key (hex): {engine2.master_key.hex()}")
        print(f"  Keys match: {new_key == engine2.master_key}")
        
        if new_key != engine2.master_key:
            raise ValueError("Master key recovery failed!")
    else:
        raise ValueError("Failed to recover master key!")
    
    print("✅ Master key flow test passed!\n")


def test_fake_values():
    """Test with the fake values from JavaScript code"""
    print("🎭 Testing with JavaScript fake values...")
    
    engine = PasswordManagerEngine()
    engine.fake_vals()
    
    print(f"  GTAUK: {engine.google_temp_active_user_key}")
    print(f"  Encrypted key: {engine.master_key_passcode_encrypted[:50]}...")
    
    # The JavaScript code uses "password" as the passphrase
    test_passphrase = "password"
    
    # Create passphrase callback
    def passphrase_callback(error_msg=None):
        return test_passphrase
    
    engine.get_passphrase_callback = passphrase_callback
    
    # Try to decrypt
    success = engine._recover_master_key_from_local_storage(test_passphrase)
    
    if success:
        print(f"  Successfully decrypted with passphrase '{test_passphrase}'")
        print(f"  Master key (hex): {engine.master_key.hex()}")
    else:
        print(f"  Failed to decrypt with passphrase '{test_passphrase}'")
    
    print("✅ Fake values test completed!\n")


if __name__ == "__main__":
    print("🚀 Starting Python Password Manager Engine tests...\n")
    
    try:
        test_basic_encryption()
        test_master_key_flow()
        test_fake_values()
        
        print("🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
