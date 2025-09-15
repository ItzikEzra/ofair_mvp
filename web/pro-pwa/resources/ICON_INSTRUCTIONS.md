# 🎯 Quick Icon Setup

## To Add Your App Icon:

1. **Create your icon** (1024x1024 PNG)
2. **Name it exactly**: `icon.png`
3. **Place it in**: `resources/icon.png`
4. **Commit and push** to repository
5. **Run GitHub Action** → Release build

## Example Structure:
```
resources/
├── icon.png          ← Your 1024x1024 app icon
├── splash.png        ← Optional: 2732x2732 splash screen
└── README.md
```

## The CI Process Will:
✅ Detect your `icon.png`  
✅ Install `@capacitor/assets`  
✅ Generate all Android icon sizes  
✅ Apply to Android project  
✅ Build APK/AAB with your icons  

## No Icon Yet?
If no `icon.png` is provided, the build will use Capacitor's default icons and continue successfully.