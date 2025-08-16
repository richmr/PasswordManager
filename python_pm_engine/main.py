"""
Python Password Manager Engine CLI
Main entry point using Typer for command-line interface
"""

import typer
from typing import Optional
import csv
import os
from pm_engine import PasswordManagerEngine

app = typer.Typer(help="Python Password Manager Engine CLI")


@app.command()
def decrypt_master_key(
    encrypted_key: str = typer.Argument(..., help="The encrypted master key to decrypt"),
    readable: bool = typer.Option(False, "--readable", "-r", help="Output as readable string instead of hex")
):
    """
    Decrypt the master key using a passphrase.
    
    This directly decrypts the encrypted master key using the provided passphrase,
    without the complexity of the web GUI persistence layer.
    """
    try:
        # Prompt user for passphrase
        passphrase = typer.prompt("Enter passphrase", hide_input=False)
        
        # Import the crypto function directly
        from pm_crypto import ez_subtle_decrypt
        
        # Decrypt the master key directly using the passphrase
        decrypted_key = ez_subtle_decrypt(encrypted_key, passphrase)
        
        typer.echo("✅ Master key successfully decrypted!")
        
        # Show the decrypted key
        if readable:
            try:
                key_str = decrypted_key.decode('utf-8', errors='ignore')
                typer.echo(f"Decrypted master key: {key_str}")
            except UnicodeDecodeError:
                typer.echo("Decrypted master key (not readable text):")
                typer.echo(f"Hex: {decrypted_key.hex()}")
        else:
            key_hex = decrypted_key.hex()
            typer.echo(f"Decrypted master key (hex): {key_hex}")
            
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def encrypt_master_key(
    passphrase: str = typer.Option(..., "--passphrase", "-p", help="The passphrase to encrypt the key with"),
    gtauk: str = typer.Option(..., "--gtauk", "-g", help="Google Temp Active User Key"),
    key_data: Optional[str] = typer.Option(None, "--key", "-k", help="Raw key data to encrypt (hex string). If not provided, generates a new random key.")
):
    """
    Encrypt a master key with a passphrase.
    
    This mirrors the freshStart functionality from the JavaScript code.
    """
    try:
        # Create engine instance
        engine = PasswordManagerEngine()
        
        # Generate or use provided key
        if key_data:
            # Convert hex string to bytes
            try:
                raw_key = bytes.fromhex(key_data)
            except ValueError:
                typer.echo("❌ Invalid hex string for key data", err=True)
                return 1
        else:
            # Generate new random key
            raw_key = engine.generate_sym_key()
            typer.echo(f"Generated new random key (hex): {raw_key.hex()}")
        
        # Set the master key
        engine.master_key = raw_key
        
        # Encrypt with passphrase
        encrypted_key = engine.change_passphrase_on_master_key(passphrase)
        
        if encrypted_key:
            typer.echo("✅ Master key successfully encrypted!")
            typer.echo(f"Encrypted key: {encrypted_key}")
            
            # Also store with GTAUK for testing
            engine.google_temp_active_user_key = gtauk
            engine._store_master_key()
            typer.echo("✅ Master key also stored with GTAUK for testing")
        else:
            typer.echo("❌ Failed to encrypt master key", err=True)
            return 1
            
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def test_decrypt(
    encrypted_key: str = typer.Argument(..., help="The encrypted master key to test decrypt"),
    passphrase: str = typer.Option(..., "--passphrase", "-p", help="The passphrase to test"),
    gtauk: str = typer.Option(..., "--gtauk", "-g", help="Google Temp Active User Key")
):
    """
    Test the decryption flow with the fake values from the JavaScript code.
    
    This uses the same encrypted key and passphrase from the fakeVals() function.
    """
    try:
        # Create engine instance
        engine = PasswordManagerEngine()
        
        # Set up fake values (same as JavaScript fakeVals())
        engine.fake_vals()
        
        typer.echo("🔑 Testing with fake values from JavaScript code:")
        typer.echo(f"  GTAUK: {engine.google_temp_active_user_key}")
        typer.echo(f"  Encrypted key: {engine.master_key_passcode_encrypted[:50]}...")
        typer.echo(f"  Expected passphrase: 'password'")
        
        # Test with the provided encrypted key and passphrase
        engine.master_key_passcode_encrypted = encrypted_key
        engine.google_temp_active_user_key = gtauk
        
        # Create passphrase callback
        def passphrase_callback(error_msg: Optional[str] = None):
            if error_msg:
                typer.echo(f"Error: {error_msg}", err=True)
            return passphrase
        
        engine.get_passphrase_callback = passphrase_callback
        
        # Try to decrypt
        success = engine._recover_master_key_from_local_storage(passphrase)
        
        if success:
            typer.echo("✅ Test decryption successful!")
            typer.echo(f"Master key (hex): {engine.master_key.hex()}")
        else:
            typer.echo("❌ Test decryption failed", err=True)
            return 1
            
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def encrypt_secret(
    secret: str = typer.Argument(..., help="The secret text to encrypt"),
    passphrase: str = typer.Option(..., "--passphrase", "-p", help="The passphrase to encrypt with")
):
    """
    Encrypt a secret using a passphrase.
    
    This demonstrates the basic encryption functionality.
    """
    try:
        from pm_crypto import ez_subtle_encrypt
        
        encrypted = ez_subtle_encrypt(secret, passphrase)
        typer.echo("✅ Secret encrypted successfully!")
        typer.echo(f"Encrypted data: {encrypted}")
        
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def decrypt_secret_with_master_key(
    master_key_encrypted: str = typer.Argument(..., help="The encrypted master key to decrypt first"),
    secret_encrypted: str = typer.Argument(..., help="The encrypted secret to decrypt (format: iv_base64&ciphertext_base64)")
):
    """
    Decrypt a secret using a master key.
    
    This first decrypts the master key using a passphrase, then uses the decrypted
    master key to decrypt the secret.
    """
    try:
        from pm_crypto import ez_subtle_decrypt
        
        # Step 1: Prompt for master key passphrase and decrypt the master key
        master_passphrase = typer.prompt("Enter master key passphrase", hide_input=False)
        
        typer.echo("🔑 Decrypting master key...")
        master_key = ez_subtle_decrypt(master_key_encrypted, master_passphrase)
        typer.echo("✅ Master key decrypted successfully!")
        
        # Step 2: Use the decrypted master key to decrypt the secret
        typer.echo("🔓 Decrypting secret...")
        decrypted_secret = ez_subtle_decrypt(secret_encrypted, master_key)
        
        # Try to decode as UTF-8, fall back to hex if it's not readable text
        try:
            secret_text = decrypted_secret.decode('utf-8')
            typer.echo("✅ Secret decrypted successfully!")
            typer.echo(f"Decrypted secret: {secret_text}")
        except UnicodeDecodeError:
            typer.echo("✅ Secret decrypted successfully!")
            typer.echo("Decrypted secret (not readable text):")
            typer.echo(f"Hex: {decrypted_secret.hex()}")
        
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def decrypt_secret(
    encrypted_data: str = typer.Argument(..., help="The encrypted data to decrypt (format: iv_base64&ciphertext_base64)"),
    passphrase: str = typer.Option(..., "--passphrase", "-p", help="The passphrase to decrypt with")
):
    """
    Decrypt a secret using a passphrase directly.
    
    This demonstrates the basic decryption functionality.
    """
    try:
        from pm_crypto import ez_subtle_decrypt
        
        decrypted = ez_subtle_decrypt(encrypted_data, passphrase)
        secret = decrypted.decode('utf-8')
        
        typer.echo("✅ Secret decrypted successfully!")
        typer.echo(f"Decrypted secret: {secret}")
        
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


@app.command()
def read_csv_passwords(
    csv_file: str = typer.Argument(..., help="The CSV file containing encrypted password data")
):
    """
    Read and interact with a CSV file containing encrypted password data.
    
    The CSV should have:
    - Row 1: [Note/ignored, Encrypted master key]
    - Row 2: Headers (column names)
    - Row 3+: Encrypted data rows
    
    This function will decrypt the master key, show available entries,
    and allow you to select and decrypt specific entries.
    """
    try:
        # Check if CSV file exists
        if not os.path.exists(csv_file):
            typer.echo(f"❌ CSV file not found: {csv_file}", err=True)
            return 1
        
        # Read the CSV file
        with open(csv_file, 'r', newline='', encoding='utf-8') as file:
            reader = csv.reader(file)
            rows = list(reader)
        
        if len(rows) < 3:
            typer.echo("❌ CSV file must have at least 3 rows: master key, headers, and at least one data row", err=True)
            return 1
        
        # Extract the components
        encrypted_master_key = rows[0][1]  # First row, second column (ignore first column)
        headers = rows[1]  # Second row
        data_rows = rows[2:]  # Remaining rows
        
        typer.echo(f"📁 CSV file loaded: {csv_file}")
        typer.echo(f"📊 Found {len(data_rows)} entries with {len(headers)} columns")
        typer.echo(f"🔑 Headers: {', '.join(headers)}")
        typer.echo()
        
        # Prompt for master key passphrase
        master_passphrase = typer.prompt("Enter master key passphrase", hide_input=False)
        
        # Decrypt the master key
        typer.echo("🔑 Decrypting master key...")
        from pm_crypto import ez_subtle_decrypt
        master_key = ez_subtle_decrypt(encrypted_master_key, master_passphrase)
        typer.echo("✅ Master key decrypted successfully!")
        typer.echo()
        
        # Main interaction loop
        current_display_rows = data_rows  # Track which rows to display
        current_display_indices = list(range(1, len(data_rows) + 1))  # Track original indices
        
        while True:
            # Show available entries
            if current_display_rows == data_rows:
                typer.echo("📋 Available entries:")
            else:
                typer.echo(f"🔍 Search results ({len(current_display_rows)} entries):")
            
            for i, (display_index, row) in enumerate(zip(current_display_indices, current_display_rows), 1):
                # Use the "site" field (plain text) for display
                site_index = None
                for j, header in enumerate(headers):
                    if header.lower() == 'site':
                        site_index = j
                        break
                
                if site_index is not None and site_index < len(row) and row[site_index].strip():
                    site_display = row[site_index].strip()
                else:
                    site_display = "[No site]"
                
                typer.echo(f"  {i:2d}. {site_display}")
            
            typer.echo()
            if current_display_rows == data_rows:
                typer.echo("Options:")
                typer.echo("  - Enter a number (1-{}) to view entry details".format(len(current_display_rows)))
                typer.echo("  - Enter 'search <term>' to filter entries by site name")
                typer.echo("  - Enter 'quit' or 'exit' to exit")
            else:
                typer.echo("Options:")
                typer.echo("  - Enter a number (1-{}) to view entry details".format(len(current_display_rows)))
                typer.echo("  - Enter 'search <term>' to search again")
                typer.echo("  - Press Enter to show all entries again")
                typer.echo("  - Enter 'quit' or 'exit' to exit")
            typer.echo()
            
            # Get user input
            user_input = typer.prompt("Enter your choice").strip().lower()
            
            if user_input in ['quit', 'exit', 'q']:
                typer.echo("👋 Goodbye!")
                break
            
            elif user_input.startswith('search '):
                # Handle search functionality
                search_term = user_input[7:].strip()
                if not search_term:
                    typer.echo("❌ Please provide a search term")
                    continue
                
                typer.echo(f"🔍 Searching for entries containing: '{search_term}'")
                typer.echo()
                
                # Filter and show matching entries
                matching_rows = []
                matching_indices = []
                for i, row in enumerate(data_rows, 1):
                    # Find the site field index
                    site_index = None
                    for j, header in enumerate(headers):
                        if header.lower() == 'site':
                            site_index = j
                            break
                    
                    if site_index is not None and site_index < len(row) and row[site_index].strip():
                        site_display = row[site_index].strip()
                        if search_term.lower() in site_display.lower():
                            matching_rows.append(row)
                            matching_indices.append(i)
                
                if matching_rows:
                    # Update display to show only matching entries
                    current_display_rows = matching_rows
                    current_display_indices = matching_indices
                    typer.echo(f"✅ Found {len(matching_rows)} matching entries")
                else:
                    typer.echo("❌ No entries found matching your search term")
                    typer.echo("Enter a new search term or press Enter to show all entries again")
                    continue_input = typer.prompt("").strip()
                    if continue_input.lower() in ['quit', 'exit', 'q']:
                        typer.echo("👋 Goodbye!")
                        break
                    # Reset to show all entries
                    current_display_rows = data_rows
                    current_display_indices = list(range(1, len(data_rows) + 1))
                typer.echo()
                
            elif user_input == '':
                # Handle Enter key - show all entries again
                current_display_rows = data_rows
                current_display_indices = list(range(1, len(data_rows) + 1))
                typer.echo("📋 Showing all entries again")
                typer.echo()
                
            elif user_input.isdigit():
                # Handle entry selection
                entry_num = int(user_input)
                if 1 <= entry_num <= len(current_display_rows):
                    selected_row = current_display_rows[entry_num - 1]
                    original_index = current_display_indices[entry_num - 1]
                    typer.echo(f"📖 Entry {entry_num} details:")
                    typer.echo("=" * 50)
                    
                    # Decrypt and display only the encrypted fields (Username, Password, Additional Info)
                    # Skip Index and Site fields as they are plain text
                    for i, (header, encrypted_value) in enumerate(zip(headers, selected_row)):
                        # Skip Index and Site fields (plain text)
                        if header.lower() in ['index', 'site']:
                            # Show plain text value
                            value_display = encrypted_value.strip() if encrypted_value.strip() else "[Empty]"
                            typer.echo(f"{header}: {value_display}")
                        else:
                            # Decrypt encrypted fields (Username, Password, Additional Info)
                            if encrypted_value.strip():
                                try:
                                    decrypted_value = ez_subtle_decrypt(encrypted_value, master_key)
                                    try:
                                        value_display = decrypted_value.decode('utf-8')
                                    except UnicodeDecodeError:
                                        value_display = f"[Binary data - {len(decrypted_value)} bytes]"
                                except Exception as e:
                                    value_display = f"[Decryption failed: {e}]"
                            else:
                                value_display = "[Empty]"
                            
                            typer.echo(f"{header}: {value_display}")
                    
                    typer.echo("=" * 50)
                    typer.echo()
                    
                    # Ask if user wants to continue
                    continue_input = typer.prompt("Press Enter to continue or 'q' to quit").strip().lower()
                    if continue_input in ['quit', 'exit', 'q']:
                        typer.echo("👋 Goodbye!")
                        break
                else:
                    typer.echo(f"❌ Invalid entry number. Please enter 1-{len(current_display_rows)}")
            else:
                typer.echo("❌ Invalid input. Please enter a number, 'search <term>', or 'quit'")
                typer.echo()
        
    except Exception as e:
        typer.echo(f"❌ Error: {e}", err=True)
        return 1


if __name__ == "__main__":
    app()
