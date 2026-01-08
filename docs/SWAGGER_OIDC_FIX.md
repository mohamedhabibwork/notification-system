# Swagger OAuth2/OIDC Fix Summary

## Issues Fixed

### 1. **Duplicate OAuth2 Redirect Handlers** ✅
**Problem**: There were two route handlers for `/api/oauth2-redirect.html`:
- One in `src/main.ts` (middleware)
- One in `src/modules/auth/auth.controller.ts` (controller)

This caused routing conflicts and unpredictable behavior.

**Solution**: Removed the duplicate handler from `main.ts`, keeping only the one in `auth.controller.ts`.

---

### 2. **OAuth2 Redirect Script Error** ✅
**Problem**: JavaScript error when OAuth2 redirect page loaded:
```
Cannot read properties of null (reading 'swaggerUIRedirectOauth2')
```

**Solution**: Added proper error handling in the OAuth2 redirect HTML:
- Check if `window.opener` exists before accessing it
- Check if `window.opener.swaggerUIRedirectOauth2` exists
- Display user-friendly error messages if authentication fails
- Auto-close window after successful authentication

---

### 3. **Incorrect Redirect URL** ✅
**Problem**: The OAuth2 redirect URL was set to:
```
http://0.0.0.0:3000/oauth2-redirect.html  ❌
```

Should have been:
```
http://localhost:3000/api/oauth2-redirect.html  ✅
```

**Issues**:
- Used `0.0.0.0` (not valid in browser)
- Missing `/api` prefix

**Solution**: 
- Changed to use `localhost` when host is `0.0.0.0`
- Added `/api` prefix to match the controller route

---

## Testing the Fix

### 1. Restart Your Application

If your app is running, restart it to apply the changes:

```bash
# Stop the current process (Ctrl+C)
# Then restart
bun run start:debug
```

### 2. Verify Configuration in Logs

You should see output like this:

```
🔐 OAuth2 Configuration:
   Authorization URL: https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/auth
   Token URL: https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token
   Redirect URI: http://localhost:3000/api/oauth2-redirect.html  ✅
   Client ID: notification-client
```

**Important**: Make sure the Redirect URI shows `http://localhost:3000/api/oauth2-redirect.html` (with `/api`).

### 3. Update Keycloak Configuration

In your Keycloak Admin Console:

1. Navigate to: **Clients** → `notification-client` → **Settings**
2. Add this URL to **Valid Redirect URIs**:
   ```
   http://localhost:3000/api/oauth2-redirect.html
   ```
3. Also add:
   ```
   http://localhost:3000/*
   ```
4. Set **Web Origins** to:
   ```
   http://localhost:3000
   ```
   or
   ```
   *
   ```
5. Click **Save**

### 4. Test OAuth2 Flow in Swagger UI

1. Open Swagger UI: http://localhost:3000/api
2. Click the **Authorize** button (🔓)
3. You should see two authentication options:
   - **bearer** - Direct token authentication
   - **oauth2** - OAuth2/OIDC flow
4. Select **oauth2**
5. Check the scopes you want (openid, profile, email)
6. Click **Authorize**
7. You should be redirected to Keycloak login
8. After login, you'll be redirected back to Swagger UI
9. The **Authorize** button should now show a lock icon (🔒)

---

## OAuth2 vs OIDC

**Note**: You mentioned wanting to use OIDC. The current implementation **already uses OIDC**!

OIDC (OpenID Connect) is built on top of OAuth2. The configuration uses:
- OAuth2 **Authorization Code Flow** with PKCE
- OIDC scopes: `openid`, `profile`, `email`
- Keycloak as the identity provider (supports OIDC)

This is the **standard and recommended** way to implement OIDC in Swagger UI.

---

## Authentication Options

### Option 1: OAuth2/OIDC Flow (Recommended)

Use this for testing user authentication:
1. Click **Authorize** → Select **oauth2**
2. Log in with Keycloak user credentials
3. Swagger UI automatically handles token refresh

### Option 2: Bearer Token (For Development)

Use this for service-to-service authentication or when you already have a token:
1. Get a token from Keycloak:
   ```bash
   curl -X POST "https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=password" \
     -d "client_id=notification-client" \
     -d "username=YOUR_USERNAME" \
     -d "password=YOUR_PASSWORD"
   ```
2. Copy the `access_token`
3. Click **Authorize** → Select **bearer**
4. Paste your token

---

## Troubleshooting

### Error: "Cannot read properties of null"

**Cause**: OAuth2 redirect page is opened directly (not from Swagger UI popup).

**Solution**: Always use the **Authorize** button in Swagger UI. Don't navigate directly to the redirect URL.

---

### Error: "Wrong redirect URL" or "Invalid redirect_uri"

**Cause**: Keycloak client configuration doesn't include the correct redirect URL.

**Solution**: 
1. Add `http://localhost:3000/api/oauth2-redirect.html` to Keycloak Valid Redirect URIs
2. Make sure to click **Save**
3. Verify the URL is exactly the same (no trailing slashes)

---

### OAuth2 button not appearing in Swagger UI

**Cause**: Keycloak environment variables not set.

**Solution**: Check your `.env` file has:
```env
KEYCLOAK_SERVER_URL=https://keycloak.habib.cloud
KEYCLOAK_REALM=notification-realm
KEYCLOAK_USER_CLIENT_ID=notification-client
```

---

### CORS errors

**Cause**: Web Origins not configured in Keycloak.

**Solution**: Add `*` or `http://localhost:3000` to Web Origins in Keycloak client settings.

---

## Files Modified

1. **src/main.ts**
   - Removed duplicate OAuth2 redirect handler
   - Fixed redirect URL to use `localhost` instead of `0.0.0.0`
   - Fixed redirect URL to include `/api` prefix

2. **src/modules/auth/auth.controller.ts**
   - Enhanced OAuth2 redirect handler with proper error handling
   - Added null checks for `window.opener`
   - Added user-friendly error messages
   - Added visual feedback for success/error states

---

## Additional Resources

- [Keycloak Setup Guide](./KEYCLOAK_SETUP.md)
- [Swagger OAuth2 Setup Guide](./SWAGGER_OAUTH_SETUP.md)
- [OpenID Connect Specification](https://openid.net/connect/)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://oauth.net/2/pkce/)

---

## Next Steps

1. ✅ Restart your application
2. ✅ Verify logs show correct redirect URI
3. ✅ Update Keycloak client configuration
4. ✅ Test OAuth2 flow in Swagger UI
5. ✅ Try making authenticated API calls

If you encounter any issues, check the browser console and application logs for error messages.
