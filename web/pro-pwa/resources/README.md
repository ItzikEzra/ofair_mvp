# App Resources - Icons & Splash Screens

## 📱 App Icon Setup

To add your app icon, place a high-resolution PNG file in this directory:

### Required Files:
- **`icon.png`** - Main app icon (1024x1024 recommended)
- **`splash.png`** - Splash screen image (2732x2732 recommended)

### File Requirements:
- **Format**: PNG with transparency support
- **Icon Size**: 1024x1024 pixels minimum
- **Splash Size**: 2732x2732 pixels recommended
- **Quality**: High resolution for best results across all device sizes

### How It Works:
1. Add `icon.png` to this `resources/` directory
2. Commit and push to repository  
3. GitHub Action will automatically:
   - Install `@capacitor/assets` during CI
   - Generate all required Android icon sizes
   - Apply icons to the Android project
   - Build with your custom icons

### Generated Android Icons:
The CI will automatically create:
- `mipmap-hdpi/` (72x72)
- `mipmap-mdpi/` (48x48) 
- `mipmap-xhdpi/` (96x96)
- `mipmap-xxhdpi/` (144x144)
- `mipmap-xxxhdpi/` (192x192)
- Adaptive icons for modern Android versions

### Background Colors:
- **Light mode**: White background (`#FFFFFF`)
- **Dark mode**: Black background (`#000000`)
- **Splash**: White background for both modes

### Testing:
After adding icons, run a release build via GitHub Action to test the new icons on the generated APK/AAB files.

## 🎨 Design Guidelines:
- Use simple, recognizable designs
- Ensure icon works at small sizes
- Test on both light and dark backgrounds
- Follow [Android icon design guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)