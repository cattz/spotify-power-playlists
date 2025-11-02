# Build Resources

This directory contains resources needed for building the application installers.

## Required Icons

The following icon files are required for building installers:

### macOS
- **File**: `icon.icns`
- **Format**: Apple Icon Image (.icns)
- **Recommended size**: 1024x1024 source image
- **Tool**: Use `iconutil` or online converters to create .icns from PNG

```bash
# Create icns from iconset (macOS only)
iconutil -c icns icon.iconset
```

### Windows
- **File**: `icon.ico`
- **Format**: Windows Icon (.ico)
- **Recommended sizes**: 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
- **Tool**: Use ImageMagick or online converters

```bash
# Create ico from PNG using ImageMagick
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### Linux
- **File**: `icon.png`
- **Format**: PNG image
- **Recommended size**: 512x512 or 1024x1024
- **Note**: Should have transparent background

## Temporary Workaround

If you don't have icons ready yet, you can:

1. **Option A**: Use a placeholder icon
   - Create a simple 512x512 PNG with your app logo
   - Convert it to the required formats

2. **Option B**: Disable icon in electron-builder.json
   - Comment out the `icon` lines in electron-builder.json
   - Electron will use default icons (not recommended for production)

3. **Option C**: Use Electron's default icon temporarily
   - The build will use Electron's default icon if files are missing
   - Replace with custom icons before release

## Icon Design Guidelines

- Use a simple, recognizable symbol (e.g., musical note, playlist icon, DJ equipment)
- Ensure icon works at small sizes (16x16, 32x32)
- Use the terminal/hacker aesthetic from the app (green/black theme)
- Make it distinctive on both light and dark backgrounds
- Avoid text in the icon (hard to read at small sizes)

## Current Status

⚠️ **Icons are currently missing and need to be created before building production installers.**

The GitHub Actions workflows will attempt to build without icons, but the resulting installers will use default Electron icons.
