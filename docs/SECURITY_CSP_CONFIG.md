# Content Security Policy (CSP) Configuration

## Overview

This application uses Helmet middleware to configure Content Security Policy headers for enhanced security. The CSP is configured to allow Swagger UI to function properly while maintaining security best practices.

## Current CSP Configuration

### Purpose

The CSP configuration prevents XSS attacks and other code injection attacks by controlling which resources can be loaded and executed by the browser.

### Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| **defaultSrc** | `'self'` | Default policy - only allow resources from same origin |
| **scriptSrc** | `'self'`, `'unsafe-inline'`, `https://cdnjs.cloudflare.com` | Allow scripts from same origin, inline scripts (Swagger UI), and CDN |
| **styleSrc** | `'self'`, `'unsafe-inline'`, `https://cdnjs.cloudflare.com` | Allow styles from same origin, inline styles (Swagger UI), and CDN |
| **imgSrc** | `'self'`, `data:`, `https:` | Allow images from same origin, base64 data URIs, and HTTPS sources |
| **connectSrc** | `'self'`, `<keycloak-url>` | Allow API calls to same origin and Keycloak server |
| **fontSrc** | `'self'`, `data:`, `https://cdnjs.cloudflare.com` | Allow fonts from same origin, data URIs, and CDN |
| **frameSrc** | `'self'` | Only allow iframes from same origin |

### Special Settings

- **crossOriginEmbedderPolicy**: `false` - Required for Swagger UI OAuth2 flow to work properly

## Why These Settings?

### 1. `'unsafe-inline'` for Scripts and Styles

**Issue**: Swagger UI uses inline scripts and styles that would be blocked by strict CSP.

**Solution**: Allow `'unsafe-inline'` for `scriptSrc` and `styleSrc`.

**Security Note**: This is required for Swagger UI to function. In production, consider:
- Serving Swagger UI only in development/staging environments
- Using a separate subdomain for API documentation
- Implementing nonces for inline scripts

### 2. Keycloak in `connectSrc`

**Issue**: Swagger UI needs to make fetch requests to Keycloak for OAuth2/OIDC token exchange.

**Solution**: Add Keycloak server URL to `connectSrc` directive.

**Example**:
```javascript
connectSrc: ["'self'", "https://keycloak.habib.cloud"]
```

### 3. CDN Resources

**Issue**: Swagger UI loads additional resources from CDN.

**Solution**: Allow `https://cdnjs.cloudflare.com` in relevant directives.

## CSP Errors Fixed

### Error: "Refused to connect to Keycloak"

```
Fetch API cannot load https://keycloak.habib.cloud/realms/.../token
Refused to connect because it violates the document's Content Security Policy.
```

**Cause**: Keycloak URL not in `connectSrc`.

**Fix**: Added Keycloak server URL to `connectSrc` directive.

### Error: "Refused to execute inline script"

```
Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'self'"
```

**Cause**: Swagger UI uses inline scripts.

**Fix**: Added `'unsafe-inline'` to `scriptSrc`.

### Error: "Refused to apply inline style"

```
Refused to apply inline style because it violates the following 
Content Security Policy directive: "style-src 'self'"
```

**Cause**: Swagger UI uses inline styles.

**Fix**: Added `'unsafe-inline'` to `styleSrc`.

## Production Considerations

### Tightening Security

For production environments, consider these improvements:

#### 1. Separate Swagger UI

Host Swagger UI on a separate subdomain with relaxed CSP:

```
docs.example.com → Relaxed CSP for Swagger UI
api.example.com → Strict CSP for API
```

#### 2. Remove Swagger in Production

Disable Swagger UI entirely in production:

```typescript
if (environment === 'production') {
  // Don't setup Swagger
} else {
  SwaggerModule.setup('api', app, document);
}
```

#### 3. Use CSP Nonces

Replace `'unsafe-inline'` with nonces:

```typescript
// Generate nonce
const nonce = crypto.randomBytes(16).toString('base64');

// Use in CSP
scriptSrc: ["'self'", `'nonce-${nonce}'`]

// Add to script tags
<script nonce="${nonce}">...</script>
```

#### 4. Content Security Policy Report-Only

Test CSP changes without breaking functionality:

```typescript
helmet({
  contentSecurityPolicy: {
    directives: { /* ... */ },
    reportOnly: true, // Don't enforce, just report violations
  },
})
```

### Monitoring CSP Violations

Set up CSP violation reporting:

```typescript
contentSecurityPolicy: {
  directives: {
    // ... other directives
    reportUri: '/api/csp-report',
  },
}
```

Then create an endpoint to receive reports:

```typescript
@Post('csp-report')
@Public()
async handleCspReport(@Body() report: any) {
  this.logger.warn('CSP Violation:', report);
  // Store in database, send to monitoring service, etc.
}
```

## Testing CSP Configuration

### 1. Check Browser Console

Open browser DevTools (F12) and check the Console tab for CSP errors.

### 2. Test OAuth2 Flow

1. Open Swagger UI: http://localhost:3000/api
2. Click **Authorize**
3. Try username/password login
4. Should work without CSP errors

### 3. Check CSP Headers

Use browser DevTools Network tab to inspect response headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; ...
```

### 4. Use CSP Evaluator

Online tool: https://csp-evaluator.withgoogle.com/

Paste your CSP header to check for issues.

## Troubleshooting

### Still Getting CSP Errors?

1. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check environment variables**: Ensure `KEYCLOAK_SERVER_URL` is set correctly
3. **Restart application**: CSP is configured at startup
4. **Check logs**: Look for "Security middleware configured" message

### Different Keycloak URL?

If your Keycloak is on a different domain, update the environment variable:

```env
KEYCLOAK_SERVER_URL=https://your-keycloak-domain.com
```

The CSP will automatically include this URL in `connectSrc`.

### CORS Issues Alongside CSP?

CSP and CORS are different. If you see CORS errors:

1. Check Keycloak client **Web Origins** setting
2. Ensure CORS is enabled in NestJS (already configured)
3. Verify Keycloak allows the origin

## Environment-Specific CSP

### Development

Current configuration is suitable for development:
- Allows inline scripts/styles for Swagger UI
- Permits CDN resources
- Connects to external Keycloak

### Staging

Similar to development but with tighter controls:
- Specific CDN URLs only
- No `'unsafe-inline'` if possible
- Enable CSP reporting

### Production

Strictest configuration:
- No Swagger UI (or separate subdomain)
- No `'unsafe-inline'`
- CSP nonces for necessary inline content
- Full CSP violation reporting
- Specific allowed domains only

## Related Documentation

- [Helmet Documentation](https://helmetjs.github.io/)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Swagger OAuth Setup](./SWAGGER_OAUTH_SETUP.md)

## Summary

✅ **CSP is now configured to allow**:
- Swagger UI to load and function properly
- OAuth2/OIDC authentication with Keycloak
- External CDN resources for Swagger UI
- Inline scripts and styles required by Swagger UI

⚠️ **Security Notes**:
- `'unsafe-inline'` is required for Swagger UI
- Consider disabling Swagger UI in production
- Or serve Swagger UI from a separate subdomain
- Monitor CSP violations in production

The current configuration balances security with functionality for development and testing environments.
