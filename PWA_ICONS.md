# PWA Icon Setup

The PWA requires icon files to be placed in the `public/` directory.

## Required Icons

Create the following files in the `public/` directory:

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

## Quick Generation Options

### Option 1: Use Canva or Figma
1. Create a 512x512 px canvas
2. Add the ⚽ football emoji with "FH" text or "Football Heroes" branding
3. Export as PNG
4. Resize to 192x192 for the smaller icon

### Option 2: Use an Online Icon Generator
- [https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)
- [https://favicon.io/](https://favicon.io/)

Upload your logo and it will generate all required sizes.

### Option 3: Use ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Create a simple green circle with ⚽ emoji (requires emoji font)
convert -size 512x512 xc:"#10b981" -fill white -pointsize 300 -font "Apple-Color-Emoji" -gravity center -annotate +0+0 "⚽" public/icon-512.png

# Resize for 192x192
convert public/icon-512.png -resize 192x192 public/icon-192.png
```

### Option 4: Temporary Placeholder (for testing)

Download a placeholder from:
- [https://via.placeholder.com/512x512/10b981/ffffff?text=FH](https://via.placeholder.com/512x512/10b981/ffffff?text=FH)
- Save as `icon-512.png`
- Resize to 192x192 for `icon-192.png`

## Verify PWA Setup

After adding icons:

1. Build the app: `npm run build`
2. Preview locally: `npm run preview`
3. Open in browser and check:
   - Install banner appears on mobile
   - App can be installed to home screen
   - Works offline after first visit

## Testing PWA

### Chrome DevTools
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section
4. Check "Service Workers" section
5. Use "Lighthouse" for PWA audit

### Mobile Testing
1. Open the deployed app in Chrome/Safari mobile
2. Tap "Add to Home Screen" in browser menu
3. App should install with custom icon
4. Launch from home screen (should open fullscreen, no browser UI)
