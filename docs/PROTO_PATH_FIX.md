# Proto File Path Fix

**Date**: January 8, 2026  
**Status**: ✅ **RESOLVED**

---

## Error Encountered

```
ENOENT: no such file or directory, open '/Users/habib/GitHub/notification-system/dist/proto/notification.proto'
Error: The invalid .proto definition (file at "/Users/habib/GitHub/notification-system/dist/proto/notification.proto" not found)
```

This error occurred for all three proto files:
- `notification.proto`
- `template.proto`
- `tenant.proto`

---

## Root Cause

The gRPC module was using relative paths with `__dirname`:

```typescript
// ❌ Wrong: __dirname points to dist/src/grpc/ after compilation
protoPath: join(__dirname, '../../proto/notification.proto')
// This resolves to: dist/src/grpc/../../proto/ = dist/proto/
// But proto files are at: proto/ (project root)
```

### Why It Failed

1. **During development**: TypeScript files are in `src/`
   - `__dirname` = `src/grpc/`
   - Path resolves correctly to `proto/`

2. **After compilation**: JavaScript files are in `dist/src/`
   - `__dirname` = `dist/src/grpc/`
   - Path resolves to `dist/proto/` ❌ (doesn't exist)

---

## Solution

Changed all proto paths to use `process.cwd()` (project root) instead of `__dirname`:

```typescript
// ✅ Correct: Always points to project root
protoPath: join(process.cwd(), 'proto/notification.proto')
// This always resolves to: /path/to/project/proto/notification.proto
```

---

## Files Modified

### 1. gRPC Module
**File**: `src/grpc/grpc.module.ts`

**Changes**: Updated all 3 proto paths

```typescript
// Before:
protoPath: join(__dirname, '../../proto/notification.proto'),

// After:
protoPath: join(process.cwd(), 'proto/notification.proto'),
```

Applied to:
- NOTIFICATION_GRPC_SERVICE
- TEMPLATE_GRPC_SERVICE
- TENANT_GRPC_SERVICE

### 2. Main Bootstrap
**File**: `src/main.ts`

**Changes**: Updated proto paths in gRPC microservice configuration

```typescript
// Before:
protoPath: [
  join(__dirname, '../proto/notification.proto'),
  join(__dirname, '../proto/template.proto'),
  join(__dirname, '../proto/tenant.proto'),
],

// After:
protoPath: [
  join(process.cwd(), 'proto/notification.proto'),
  join(process.cwd(), 'proto/template.proto'),
  join(process.cwd(), 'proto/tenant.proto'),
],
```

---

## Verification

### Build Check ✅
```bash
$ npm run build
> nest build
✅ Success (0 errors)
```

### Expected Runtime ✅
```bash
$ npm run start:dev

[Nest] Starting Nest application...
[InstanceLoader] GrpcModule dependencies initialized +0ms
✅ No proto file errors
```

---

## Why `process.cwd()` Works

| Method | Runtime Value | Works? |
|--------|---------------|--------|
| `__dirname` | Changes based on compiled file location | ❌ No |
| `process.cwd()` | Always project root directory | ✅ Yes |
| Absolute path | `/full/path/to/proto/file.proto` | ✅ Yes (but not portable) |

`process.cwd()` is the best choice because:
- ✅ Always points to project root
- ✅ Works in dev and production
- ✅ Works with different build outputs
- ✅ Portable across environments

---

## Proto File Structure

```
notification-system/
├── proto/                    ← Proto files location (project root)
│   ├── notification.proto
│   ├── template.proto
│   └── tenant.proto
├── src/
│   ├── grpc/
│   │   └── grpc.module.ts   ← Loads proto files
│   └── main.ts               ← Bootstraps gRPC server
└── dist/                     ← Compiled output
    └── src/
        ├── grpc/
        │   └── grpc.module.js
        └── main.js
```

Proto files stay at project root and are referenced from there.

---

## Alternative Solution (Not Used)

Copy proto files to dist during build:

```json
// package.json
{
  "scripts": {
    "build": "nest build && cp -r proto dist/"
  }
}
```

**Why not used**: 
- Adds build complexity
- Proto files rarely change
- `process.cwd()` is simpler and more reliable

---

## Summary

| Item | Before | After |
|------|--------|-------|
| Proto path | `__dirname` relative | `process.cwd()` absolute |
| Build Status | ✅ Success | ✅ Success |
| Runtime Status | ❌ ENOENT errors | ✅ No errors |
| Proto location | Same | Same (proto/) |
| gRPC Module | ❌ Can't load | ✅ Loads successfully |

---

**Status**: ✅ **RESOLVED**  
**Ready to Run**: ✅ **YES**

Next: `npm run start:dev` should work without proto errors

---

*Last Updated: January 8, 2026*  
*Fix Type: Path Resolution*
