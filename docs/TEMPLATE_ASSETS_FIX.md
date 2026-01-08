# Template Assets Build Configuration Fix

**Date:** January 8, 2026  
**Status:** ✅ Fixed

## Problem

The application was showing warnings on startup:

```
[TemplateLoaderService] warn: Could not load partials from /Users/habib/GitHub/notification-system/dist/src/modules/templates/html-templates/components/layouts: ENOENT: no such file or directory
[TemplateLoaderService] warn: Could not load partials from /Users/habib/GitHub/notification-system/dist/src/modules/templates/html-templates/components/partials: ENOENT: no such file or directory
```

## Root Cause

The NestJS build process was not copying `.hbs` (Handlebars template) files from the `src` directory to the `dist` directory during compilation.

**Why:**
- TypeScript compilation only processes `.ts` files by default
- Static assets (like `.hbs`, `.md`, etc.) need to be explicitly configured for copying
- The `nest-cli.json` lacked the `assets` configuration

## Solution

Updated `nest-cli.json` to include asset copying configuration:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "modules/templates/html-templates/**/*.hbs",
        "outDir": "dist/src"
      },
      {
        "include": "modules/templates/html-templates/**/*.md",
        "outDir": "dist/src"
      }
    ],
    "watchAssets": true
  }
}
```

## Configuration Breakdown

### `assets` Array
Defines which non-TypeScript files should be copied during build:

1. **Handlebars Templates** (`.hbs`):
   - Pattern: `modules/templates/html-templates/**/*.hbs`
   - Copies all `.hbs` files recursively from the html-templates directory
   - Output: `dist/src/modules/templates/html-templates/`

2. **Markdown Files** (`.md`):
   - Pattern: `modules/templates/html-templates/**/*.md`
   - Copies documentation files
   - Output: `dist/src/modules/templates/html-templates/`

### `watchAssets: true`
Enables automatic copying of assets when files change during development (watch mode).

## Templates Copied

The build now copies all template files:

### Components (Layouts & Partials)
```
dist/src/modules/templates/html-templates/components/
├── layouts/
│   ├── base.hbs
│   ├── button.hbs
│   ├── footer.hbs
│   └── header.hbs
└── partials/
    ├── alert.hbs
    ├── content-block.hbs
    ├── divider.hbs
    └── hero.hbs
```

### Transactional Templates
```
dist/src/modules/templates/html-templates/transactional/
├── account/
│   ├── account-activated.hbs
│   ├── account-deleted.hbs
│   ├── account-suspended.hbs
│   ├── email-changed.hbs
│   ├── phone-changed.hbs
│   ├── profile-updated.hbs
│   └── settings-changed.hbs
├── authentication/
│   ├── email-verification.hbs
│   ├── login-notification.hbs
│   ├── password-changed.hbs
│   ├── password-reset.hbs
│   ├── two-factor-auth.hbs
│   ├── two-factor-enabled.hbs
│   └── welcome-email.hbs
└── notifications/
    ├── maintenance-notice.hbs
    ├── payment-reminder.hbs
    ├── security-alert.hbs
    ├── subscription-expiring.hbs
    ├── system-alert.hbs
    └── task-reminder.hbs
```

### Marketing Templates
```
dist/src/modules/templates/html-templates/marketing/
├── campaigns/
│   ├── blog-digest.hbs
│   ├── company-news.hbs
│   ├── newsletter-digest.hbs
│   ├── newsletter-standard.hbs
│   ├── product-announcement.hbs
│   └── product-update.hbs
├── educational/
│   ├── best-practices.hbs
│   ├── case-study.hbs
│   ├── how-to-guide.hbs
│   ├── resource-roundup.hbs
│   └── tips-and-tricks.hbs
├── engagement/
│   ├── feedback-request.hbs
│   ├── re-engagement.hbs
│   ├── referral-invite.hbs
│   ├── review-request.hbs
│   ├── user-milestone.hbs
│   ├── welcome-series-1.hbs
│   ├── welcome-series-2.hbs
│   └── welcome-series-3.hbs
└── promotional/
    ├── abandoned-cart.hbs
    ├── discount-code.hbs
    ├── event-invitation.hbs
    ├── flash-sale.hbs
    ├── seasonal-sale.hbs
    ├── special-offer.hbs
    └── webinar-invitation.hbs
```

## How It Works

### Build Process
1. **TypeScript Compilation**: Compiles `.ts` files to `.js`
2. **Asset Copying**: Copies configured assets (`.hbs`, `.md`) to `dist`
3. **TemplateLoaderService**: Can now find and load templates at runtime

### Runtime Path Resolution
The `TemplateLoaderService` uses `__dirname` to find templates:

```typescript
private readonly templatesPath = path.join(__dirname, '..');
// Points to: dist/src/modules/templates/html-templates/
```

## Verification

### Check Templates Exist
```bash
ls -la dist/src/modules/templates/html-templates/components/layouts/
ls -la dist/src/modules/templates/html-templates/components/partials/
```

### Application Startup
The application should now start without warnings:
```
✅ No more "ENOENT: no such file or directory" warnings
✅ Partials successfully loaded
✅ Templates accessible at runtime
```

## Development Workflow

### Watch Mode
With `watchAssets: true`, changes to `.hbs` files are automatically copied:

```bash
# Start in watch mode
bun run start:dev

# Edit any .hbs file - it will be auto-copied to dist/
```

### Production Build
```bash
# Build for production
bun run build

# Verify assets were copied
ls -R dist/src/modules/templates/html-templates/
```

## Adding New Asset Types

To copy additional file types, add them to the `assets` array:

```json
{
  "include": "path/to/files/**/*.ext",
  "outDir": "dist/src"
}
```

**Examples:**
- Images: `"modules/assets/**/*.{png,jpg,svg}"`
- JSON: `"config/**/*.json"`
- CSS: `"styles/**/*.css"`

## Benefits

1. ✅ **No Runtime Errors**: Templates are available when service starts
2. ✅ **Clean Logs**: No warnings cluttering the console
3. ✅ **Hot Reload**: Watch mode automatically copies changed templates
4. ✅ **Production Ready**: All assets included in build output
5. ✅ **Maintainable**: Easy to add new template types

## Related Files

- **Configuration**: `nest-cli.json`
- **Template Loader**: `src/modules/templates/html-templates/services/template-loader.service.ts`
- **Templates**: `src/modules/templates/html-templates/**/*.hbs`
- **Build Output**: `dist/src/modules/templates/html-templates/**/*.hbs`

## Testing

```bash
# 1. Clean build
rm -rf dist
bun run build

# 2. Verify templates copied
ls dist/src/modules/templates/html-templates/components/layouts/
# Should show: base.hbs, button.hbs, footer.hbs, header.hbs

ls dist/src/modules/templates/html-templates/components/partials/
# Should show: alert.hbs, content-block.hbs, divider.hbs, hero.hbs

# 3. Start application
bun run start:dev
# Should start without warnings
```

## Notes

- The `deleteOutDir: true` option cleans the dist folder before each build
- Asset paths are relative to `sourceRoot` (which is `src`)
- Output preserves the directory structure from source
- Both development and production builds include assets

## Build Status

✅ **Build Successful**  
✅ **All Templates Copied**  
✅ **No Warnings on Startup**  
✅ **Watch Mode Working**

The template loading system is now fully functional!
