"""
Core crypto functions for Python Password Manager Engine
Mirrors the functionality from subtlecrypto.js and subtlecryptowrap.js
"""

import base64
import os
from typing import Union, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend


def get_salt(size: int = 12) -> bytes:
    """Returns random salt bytes (equivalent to getSalt in JS)"""
    return os.urandom(size)


def get_key_material_from_passphrase(passphrase: str) -> bytes:
    """Derives a key from passphrase using PBKDF2 (equivalent to getKeyMaterialFromPassphrase)"""
    # Convert passphrase to bytes
    passphrase_bytes = passphrase.encode('utf-8')
    
    # Use a fixed salt (32 bytes) as in the JS code
    salt = b'\x00' * 32  # Fixed salt like in JS
    
    # Derive key using PBKDF2 with same parameters as JS
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits = 32 bytes
        salt=salt,
        iterations=100,  # Same as JS
        backend=default_backend()
    )
    
    return kdf.derive(passphrase_bytes)


def base64_string_to_bytes(base64_string: str) -> bytes:
    """Converts base64 string to bytes (equivalent to base64StringToUInt8Arr in JS)"""
    try:
        # The JavaScript code uses a custom format:
        # 1. Convert Uint8Array to comma-separated numbers: "126,160,19,118,78,27,218,65,236,10,181,100"
        # 2. Then base64 encode that string
        # So we need to base64 decode first, then split by comma and convert to bytes
        
        # First decode the base64 string
        decoded = base64.b64decode(base64_string)
        decoded_str = decoded.decode('utf-8')
        
        # Split by comma and convert each number to byte
        numbers = [int(x.strip()) for x in decoded_str.split(',')]
        return bytes(numbers)
        
    except Exception as e:
        raise ValueError(f"Invalid base64 string: {e}")


def bytes_to_base64(data: bytes) -> str:
    """Converts bytes to base64 string (equivalent to btoa in JS)"""
    # The JavaScript code converts Uint8Array to comma-separated numbers first
    # then base64 encodes that string
    comma_separated = ','.join(str(b) for b in data)
    return base64.b64encode(comma_separated.encode('utf-8')).decode('utf-8')


def ez_subtle_encrypt(data: Union[str, bytes], key: Union[str, bytes]) -> str:
    """
    Encrypts data with key (equivalent to ezSubtleEncrypt)
    Returns: iv_base64 + "&" + ciphertext_base64
    """
    # Get key material from passphrase if string
    if isinstance(key, str):
        key = get_key_material_from_passphrase(key)
    
    # Convert data to bytes if string
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    # Generate random IV
    iv = get_salt(12)
    
    # Encrypt data
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    ciphertext = encryptor.update(data) + encryptor.finalize()
    
    # Get the tag (GCM authentication tag)
    tag = encryptor.tag
    
    # Combine ciphertext and tag
    encrypted_data = ciphertext + tag
    
    # Return iv&ciphertext format
    return f"{bytes_to_base64(iv)}&{bytes_to_base64(encrypted_data)}"


def ez_subtle_decrypt(cipher_data: str, key: Union[str, bytes]) -> bytes:
    """
    Decrypts cipher_data with key (equivalent to ezSubtleDecrypt)
    cipher_data format: iv_base64&ciphertext_base64
    Returns: decrypted bytes
    """
    # Get key material from passphrase if string
    if isinstance(key, str):
        key = get_key_material_from_passphrase(key)
    
    # Split iv and ciphertext
    parts = cipher_data.split('&')
    if len(parts) != 2:
        raise ValueError("Invalid cipher data format. Expected: iv_base64&ciphertext_base64")
    
    iv_b64, ct_b64 = parts
    
    # Decode from base64
    iv = base64_string_to_bytes(iv_b64)
    encrypted_data = base64_string_to_bytes(ct_b64)
    
    # Split ciphertext and tag (last 16 bytes are the GCM tag)
    ciphertext = encrypted_data[:-16]
    tag = encrypted_data[-16:]
    
    # Decrypt
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    
    try:
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return plaintext
    except Exception as e:
        raise ValueError(f"Decryption failed: {e}")


def generate_sym_key() -> bytes:
    """Generates a new random symmetric key (equivalent to generateSymKey)"""
    return os.urandom(32)  # 256 bits = 32 bytes


def generate_and_export_key(key: Optional[bytes] = None) -> bytes:
    """Generates and exports a key (equivalent to generateAndExportKey)"""
    if key is None:
        key = generate_sym_key()
    return key


def import_raw_key(raw_key_mat: Union[str, bytes]) -> bytes:
    """Imports raw key material (equivalent to importRawKey)"""
    if isinstance(raw_key_mat, str):
        raw_key_mat = base64_string_to_bytes(raw_key_mat)
    return raw_key_mat
