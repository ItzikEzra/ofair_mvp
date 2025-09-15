# Google Play Store Release Setup Guide

## ✅ Completed Steps

### GitHub Action Updates
- Modified `.github/workflows/android-build.yml` to build both APK and AAB formats
- AAB (App Bundle) format is now generated for release builds
- Both APK and AAB files are uploaded as artifacts and included in releases

## 🔄 Next Steps to Complete

### 1. Create Production Keystore (One-time setup)

Once Java installation completes, run these commands:

```bash
# Generate production keystore
keytool -genkey -v -keystore ofair-release-key.keystore \
  -alias ofair-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS

# When prompted, provide:
# - Store password: [create a strong password]
# - Key password: [create a strong password] 
# - Your name: Ofair
# - Organization: Ofair Ltd
# - City: [your city]
# - State: [your state/region]
# - Country code: IL (or your country)
```

### 2. Configure GitHub Secrets

After creating the keystore, add these secrets to your GitHub repository:

```bash
# Base64 encode the keystore
base64 -i ofair-release-key.keystore | pbcopy

# Add to GitHub secrets:
# KEYSTORE_BASE64: [paste the base64 output]
# KEYSTORE_PASSWORD: [your keystore password]
# KEY_ALIAS: ofair-key
# KEY_PASSWORD: [your key password]
```

### 3. Test Release Build

Run the GitHub Action with release build type:
1. Go to GitHub Actions → "Build Android App" 
2. Click "Run workflow"
3. Select "release" build type
4. Check that both APK and AAB files are generated

### 4. Google Play Console Setup

1. **Create App in Play Console**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app with your existing Google Console app ID
   - Package name: `com.ofair`

2. **Upload First AAB**:
   - Download AAB from GitHub Action release
   - Upload to Internal Testing track
   - Complete store listing requirements

3. **Store Listing Requirements**:
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (phone, tablet)
   - App description
   - Privacy policy URL
   - Content rating questionnaire

4. **Release Tracks**:
   - Internal testing → Closed testing → Production
   - Use GitHub Action AAB outputs for each track

## 🎯 Your Streamlined Workflow

1. **Development**: Use GitHub Action with "debug" build type
2. **Testing**: Use GitHub Action with "release" build type → download APK
3. **Store Release**: Use GitHub Action with "release" build type → download AAB → upload to Play Console

## 📋 Play Console Checklist

- [ ] App created with package name `com.ofair`
- [ ] First AAB uploaded to Internal Testing
- [ ] Store listing completed (title, description, screenshots)
- [ ] Privacy policy added
- [ ] Content rating completed
- [ ] Target audience selected
- [ ] App signing by Google Play enabled
- [ ] Release tracks configured

## 🔧 Build Configuration

Your GitHub Action now:
- ✅ Builds both APK (testing) and AAB (store) for release builds
- ✅ Signs with your keystore
- ✅ Uploads both formats as artifacts
- ✅ Creates releases with both files
- ✅ Handles all Android setup automatically in CI

## 🚀 Next Actions Required

1. Complete keystore creation (waiting for Java installation)
2. Add GitHub secrets
3. Test release build
4. Set up Play Console project
5. Upload first AAB to Internal Testing

Once these steps are complete, you'll have a fully automated pipeline from code to Play Store!