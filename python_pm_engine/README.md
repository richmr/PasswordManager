# Python Password Manager Engine

This is a Python implementation of the JavaScript Password Manager Engine, designed to recreate the encryption operations from the original codebase.

## Features

- **Master Key Management**: Generate, encrypt, and decrypt master keys using passphrases
- **AES-GCM Encryption**: Uses the same encryption algorithm as the JavaScript version
- **PBKDF2 Key Derivation**: Password-based key derivation with the same parameters
- **CLI Interface**: Command-line tools using Typer for easy testing and automation
- **Compatible Format**: Produces and consumes the same encrypted data format as the JS version

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### CLI Commands

The main CLI provides several commands to test the encryption functionality:

#### Decrypt Master Key
```bash
python -m python_pm_engine.main decrypt-master-key "encrypted_key_here" --passphrase "your_passphrase" --gtauk "your_gtauk"
```

#### Encrypt Master Key
```bash
python -m python_pm_engine.main encrypt-master-key --passphrase "your_passphrase" --gtauk "your_gtauk"
```

#### Test Decryption
```bash
python -m python_pm_engine.main test-decrypt "encrypted_key_here" --passphrase "your_passphrase" --gtauk "your_gtauk"
```

#### Encrypt Secret
```bash
python -m python_pm_engine.main encrypt-secret "your_secret_text" --passphrase "your_passphrase"
```

#### Decrypt Secret
```bash
python -m python_pm_engine.main decrypt-secret "iv_base64&ciphertext_base64" --passphrase "your_passphrase"
```

### Python API

You can also use the engine programmatically:

```python
from python_pm_engine import PasswordManagerEngine

# Create engine instance
engine = PasswordManagerEngine()

# Set up encrypted master key and GTAUK
engine.master_key_passcode_encrypted = "your_encrypted_key"
engine.google_temp_active_user_key = "your_gtauk"

# Create passphrase callback
def passphrase_callback(error_msg=None):
    return "your_passphrase"

engine.get_passphrase_callback = passphrase_callback

# Recover master key
success = engine._recover_master_key_from_local_storage("your_passphrase")
if success:
    print("Master key recovered successfully!")
```

## Testing

Run the test script to verify functionality:

```bash
cd python_pm_engine
python test_engine.py
```

## Architecture

The Python implementation mirrors the JavaScript code structure:

- **`pm_crypto.py`**: Core cryptographic functions (equivalent to `subtlecrypto.js` and `subtlecryptowrap.js`)
- **`pm_engine.py`**: Main password manager engine (equivalent to `PasswordManageEngine.js`)
- **`main.py`**: CLI interface using Typer
- **`test_engine.py`**: Test suite for verification

## Key Differences from JavaScript

1. **Storage**: Uses JSON files instead of cookies/localStorage
2. **Async**: Synchronous implementation instead of Promise-based
3. **Error Handling**: Python exceptions instead of JavaScript error objects
4. **Dependencies**: Uses `cryptography` library instead of Web Crypto API

## Security Notes

- The implementation uses the same cryptographic parameters as the JavaScript version
- PBKDF2 with 100 iterations (consider increasing for production use)
- Fixed salt (32 bytes of zeros) - consider using random salts for production
- AES-GCM with 256-bit keys for encryption

## Compatibility

The Python version is designed to be compatible with the JavaScript version:
- Same encrypted data format (`iv_base64&ciphertext_base64`)
- Same key derivation parameters
- Same encryption algorithms and modes
- Same master key management flow

## Example Workflow

1. **Generate Master Key**: Use `encrypt-master-key` to create a new encrypted master key
2. **Store Encrypted Key**: Save the encrypted key to your storage system
3. **Recover Master Key**: Use `decrypt-master-key` to decrypt the stored key
4. **Encrypt/Decrypt Secrets**: Use the recovered master key to encrypt/decrypt individual secrets

This implementation allows you to test and verify the encryption operations from your JavaScript password manager in a Python environment.
