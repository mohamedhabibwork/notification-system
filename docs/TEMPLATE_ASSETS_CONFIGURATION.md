# Template Assets Configuration

## Overview

This document explains how Handlebars template assets (`.hbs` files) are configured and copied during the NestJS build process.

## Problem

During compilation, TypeScript files are compiled from `src/` to `dist/`, but template files (`.hbs`) need to be copied separately as they are not processed by the TypeScript compiler.

### The Issue

If template assets are not properly configured, you'll see errors like:

```
[TemplateLoaderService] warn: Could not load partials from /path/to/dist/modules/templates/html-templates/components/layouts: ENOENT: no such file or directory
```

## Solution

### Configuration in `nest-cli.json`

The `nest-cli.json` file configures asset copying:

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
        "outDir": "dist"
      },
      {
        "include": "modules/templates/html-templates/**/*.md",
        "outDir": "dist"
      }
    ],
    "watchAssets": true
  }
}
```

### Key Points

1. **`include` path**: Relative to `sourceRoot` (`src/`)
   - Example: `"modules/templates/html-templates/**/*.hbs"` means copy from `src/modules/templates/html-templates/`

2. **`outDir` value**: Must be `"dist"` (not `"dist/src"`)
   - Files are copied maintaining the same directory structure
   - Source: `src/modules/templates/html-templates/components/layouts/base.hbs`
   - Destination: `dist/modules/templates/html-templates/components/layouts/base.hbs`

3. **`watchAssets: true`**: Enables hot-reload for template files during development
   - Changes to `.hbs` files trigger automatic rebuild
   - No need to restart the dev server when editing templates

## How Template Loading Works

### Path Resolution

The `TemplateLoaderService` uses `__dirname` to locate templates:

```typescript
// In template-loader.service.ts (compiled location)
private readonly templatesPath = path.join(__dirname, '..');
```

**Compiled Service Location:**
- Source: `src/modules/templates/html-templates/services/template-loader.service.ts`
- Compiled: `dist/modules/templates/html-templates/services/template-loader.service.js`

**Template Lookup:**
- `__dirname` = `dist/modules/templates/html-templates/services/`
- `path.join(__dirname, '..')` = `dist/modules/templates/html-templates/`
- Templates must exist at: `dist/modules/templates/html-templates/components/`

### Directory Structure

```
dist/
└── modules/
    └── templates/
        └── html-templates/
            ├── components/
            │   ├── layouts/
            │   │   ├── base.hbs
            │   │   ├── header.hbs
            │   │   ├── footer.hbs
            │   │   └── button.hbs
            │   └── partials/
            │       ├── alert.hbs
            │       ├── hero.hbs
            │       ├── divider.hbs
            │       └── content-block.hbs
            ├── transactional/
            │   ├── account/
            │   ├── authentication/
            │   └── notifications/
            ├── marketing/
            │   ├── promotional/
            │   ├── educational/
            │   ├── engagement/
            │   └── campaigns/
            └── services/
                └── template-loader.service.js
```

## Verification

### Check Templates Are Copied

After building, verify templates exist:

```bash
# Build the application
npm run build

# Check components directory exists
ls -la dist/modules/templates/html-templates/components/

# Count template files (should be 54+)
find dist/modules/templates/html-templates -name "*.hbs" | wc -l

# Verify specific directories
ls dist/modules/templates/html-templates/components/layouts/
ls dist/modules/templates/html-templates/components/partials/
```

### Expected Output

```bash
$ ls dist/modules/templates/html-templates/
components/
marketing/
transactional/
services/
README.md
templates.metadata.js
templates.metadata.d.ts
```

## Development Workflow

### Hot Reload

With `watchAssets: true`, template changes are automatically detected:

```bash
# Start dev server
npm run start:dev

# Edit any .hbs file in src/modules/templates/html-templates/
# File is automatically copied to dist/
# Application reloads with new template
```

### Manual Build

```bash
# Clean build
npm run build:clean

# Standard build
npm run build
```

## Common Issues

### Issue 1: Templates Not Found After Build

**Symptom:**
```
[TemplateLoaderService] warn: Could not load partials from .../components/layouts: ENOENT
```

**Solution:**
- Check `nest-cli.json` has correct `outDir: "dist"` (not `"dist/src"`)
- Verify `include` path matches your template location
- Run `npm run build:clean` to ensure fresh build

### Issue 2: Template Changes Not Detected

**Symptom:**
- Edit `.hbs` file but changes don't appear
- Must restart dev server manually

**Solution:**
- Ensure `watchAssets: true` is set in `nest-cli.json`
- Check file is within the `include` glob pattern
- Restart dev server: `npm run start:dev`

### Issue 3: Some Templates Copied, Others Missing

**Symptom:**
- Some directories or files are missing after build

**Solution:**
- Check glob pattern includes all needed extensions
- Verify source files exist in `src/` directory
- Add additional `assets` entries for other file types:

```json
"assets": [
  {
    "include": "modules/templates/**/*.hbs",
    "outDir": "dist"
  },
  {
    "include": "modules/templates/**/*.json",
    "outDir": "dist"
  },
  {
    "include": "modules/templates/**/*.md",
    "outDir": "dist"
  }
]
```

## Production Considerations

### Docker Builds

Ensure your Dockerfile copies assets correctly:

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # This copies assets via nest-cli.json

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/src/main"]
```

### Asset Verification in CI/CD

Add a build verification step:

```bash
# In your CI/CD pipeline
npm run build

# Verify critical assets exist
test -d dist/modules/templates/html-templates/components || exit 1
test -f dist/modules/templates/html-templates/components/layouts/base.hbs || exit 1

# Count templates (adjust number as needed)
TEMPLATE_COUNT=$(find dist/modules/templates/html-templates -name "*.hbs" | wc -l)
if [ "$TEMPLATE_COUNT" -lt 50 ]; then
  echo "Error: Expected at least 50 templates, found $TEMPLATE_COUNT"
  exit 1
fi
```

## Related Files

- `/nest-cli.json` - Asset configuration
- `/src/modules/templates/html-templates/services/template-loader.service.ts` - Template loading logic
- `/src/modules/templates/html-templates/services/handlebars-config.service.ts` - Handlebars configuration
- `/docs/TEMPLATE_SYSTEM.md` - Template system overview (if exists)

## Additional Resources

- [NestJS CLI Assets](https://docs.nestjs.com/cli/overview#assets)
- [NestJS CLI Configuration](https://docs.nestjs.com/cli/monorepo#assets)
- [Handlebars Documentation](https://handlebarsjs.com/)

## Summary

✅ **Correct Configuration**: `outDir: "dist"` in `nest-cli.json`  
✅ **Glob Patterns**: Include all template file types (`*.hbs`, `*.md`, etc.)  
✅ **Watch Assets**: Enable `watchAssets: true` for development  
✅ **Verification**: Always verify templates are copied after build  
✅ **CI/CD**: Add asset verification to your build pipeline  

Proper asset configuration ensures template files are available at runtime and prevents "file not found" errors in production.
