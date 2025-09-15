# Manual Keystore Creation Instructions

Since Java installation is still in progress, here are the exact commands to run once Java is available:

## Step 1: Create the Keystore

```bash
# Make sure Java is available
java -version

# Create production keystore
keytool -genkey -v -keystore ofair-release-key.keystore \
  -alias ofair-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

When prompted, use these values:
- **Keystore password**: `OfairSecure2025!` (save this!)
- **Key password**: `OfairKey2025!` (save this!)
- **Name**: `Ofair`
- **Organization**: `Ofair Ltd`
- **City**: `Tel Aviv`
- **State**: `Israel`
- **Country code**: `IL`
- **Confirm**: `yes`

## Step 2: Base64 Encode for GitHub

```bash
# Encode the keystore file
base64 -i ofair-release-key.keystore > keystore-base64.txt

# Copy to clipboard
cat keystore-base64.txt | pbcopy
```

## Step 3: Add to GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `KEYSTORE_BASE64`: [paste the base64 content]
- `KEYSTORE_PASSWORD`: `OfairSecure2025!`
- `KEY_ALIAS`: `ofair-key`
- `KEY_PASSWORD`: `OfairKey2025!`

## Alternative: Use Online Keystore Generator

If Java continues to have issues, you can use:
1. Android Studio (if installed) - Build → Generate Signed Bundle
2. Online generator: https://keystore-explorer.org/
3. Use the GitHub Action environment (it has Java pre-installed)

## Security Notes

- Keep the keystore file secure - losing it means you can't update your app
- Never commit the keystore to git
- Store passwords in a secure password manager
- The base64 version goes to GitHub secrets only