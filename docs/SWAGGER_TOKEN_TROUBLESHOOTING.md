# Swagger UI Token Troubleshooting Guide

## Issue: Token Not Set After OAuth2 Login

### Symptoms

After successfully logging in with OAuth2 (username/password or authorization code flow):
- ✅ Authentication completes successfully
- ✅ "Authorized" message appears
- ❌ But API calls still return 401 Unauthorized
- ❌ Token not applied to requests

### Root Cause

Swagger UI has separate security schemes (`oauth2` and `bearer`). When you authenticate with OAuth2, the token needs to be applied to the `bearer` security scheme that the API endpoints use.

## Automatic Fix (Implemented)

The application now includes custom JavaScript that automatically:
1. Monitors OAuth2 authentication events
2. Extracts the access token from OAuth2 response
3. Automatically applies it to the bearer authentication scheme
4. Syncs tokens every second to ensure consistency

## Verification Steps

### 1. Check Console Logs

After OAuth2 authentication, open browser DevTools console (F12) and look for:

```
✅ OAuth2 access token automatically applied to bearer auth
```

This confirms the token was successfully synced.

### 2. Verify in Swagger UI

After authenticating:

1. Click the **Authorize** button again
2. Check **both** security schemes:
   - ✅ `oauth2` - Should show as authorized
   - ✅ `bearer` - Should also show as authorized with the same token

### 3. Test an API Endpoint

1. Open any protected endpoint (e.g., `GET /api/v1/users/me/notifications`)
2. Click **Try it out**
3. Click **Execute**
4. Check response:
   - ✅ Should return 200 OK with data
   - ❌ If 401 Unauthorized, token sync failed

### 4. Check Request Headers

In the API response section, expand **Request headers**:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cC...
```

The Authorization header should be present with your token.

## Manual Workaround

If automatic token sync doesn't work, manually copy the token:

### Method 1: From Browser Storage

1. Open DevTools (F12) → **Application** tab
2. Go to **Local Storage** → `http://localhost:3000`
3. Find key: `authorized`
4. Copy the `access_token` value
5. Click **Authorize** in Swagger UI
6. Select **bearer** scheme
7. Paste the token
8. Click **Authorize**

### Method 2: From Network Tab

1. Open DevTools (F12) → **Network** tab
2. After OAuth2 login, find the token request to Keycloak
3. Click on the request → **Response** tab
4. Copy the `access_token` value
5. Follow steps 5-8 from Method 1

### Method 3: From Console

1. Open DevTools (F12) → **Console** tab
2. Run this command:

```javascript
// Get OAuth2 token
const auth = window.ui.authSelectors.authorized().toJS();
const token = auth.oauth2?.token?.access_token;
console.log('Access Token:', token);

// Manually apply to bearer
if (token) {
  window.ui.preauthorizeApiKey('bearer', token);
  console.log('✅ Token applied manually');
}
```

## Common Issues

### Issue 1: Token Present but Still 401

**Cause**: Token expired or invalid.

**Solution**:
1. Check token expiration (default: 5 minutes)
2. Re-authenticate to get a new token
3. Or increase token lifespan in Keycloak

**To check token expiration**:

```javascript
const auth = window.ui.authSelectors.authorized().toJS();
const token = auth.oauth2?.token?.access_token;
if (token) {
  // Decode JWT (base64)
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  const exp = new Date(payload.exp * 1000);
  console.log('Token expires:', exp);
  console.log('Is expired:', Date.now() > payload.exp * 1000);
}
```

### Issue 2: Bearer Scheme Empty After OAuth2

**Cause**: Automatic token sync not working.

**Solution**:
1. Check browser console for errors
2. Ensure custom JavaScript loaded (look for initialization message)
3. Try manual workaround above
4. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)

### Issue 3: Token Disappears After Page Refresh

**Cause**: Tokens not persisted properly.

**Solution**:
1. Swagger UI has `persistAuthorization: true` enabled
2. Tokens should persist in localStorage
3. If not persisting, check browser privacy settings
4. Try in normal (non-incognito) browser window

### Issue 4: Different Token in Bearer vs OAuth2

**Cause**: Manually set bearer token, then did OAuth2 login.

**Solution**:
1. Click **Authorize**
2. Click **Logout** for both schemes
3. Re-authenticate using your preferred method

## Debugging Token Issues

### Check Token Content

```javascript
// In browser console
const auth = window.ui.authSelectors.authorized().toJS();
console.log('OAuth2 token:', auth.oauth2?.token);
console.log('Bearer token:', auth.bearer?.value);

// Should be the same token
if (auth.oauth2?.token?.access_token === auth.bearer?.value) {
  console.log('✅ Tokens match');
} else {
  console.log('❌ Tokens do not match - syncing...');
  window.ui.preauthorizeApiKey('bearer', auth.oauth2?.token?.access_token);
}
```

### Check Authorization Header

```javascript
// Intercept requests to see what's being sent
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  if (options && options.headers) {
    console.log('Request to:', url);
    console.log('Authorization:', options.headers.Authorization || options.headers.authorization);
  }
  return originalFetch.apply(this, args);
};
```

### Monitor Token Sync

The custom JavaScript syncs tokens every second. Watch the console:

```javascript
// Should see this message periodically when token is synced
"✅ OAuth2 access token automatically applied to bearer auth"
```

If you don't see this message after OAuth2 login:
1. Check browser console for JavaScript errors
2. Ensure CSP allows inline scripts
3. Hard refresh the page

## Testing End-to-End

### Complete Test Flow

1. **Open Swagger UI**: http://localhost:3000/api

2. **Authenticate**:
   - Click **Authorize**
   - Select **oauth2 (OAuth2, password)**
   - Enter username: `testuser`
   - Enter password: `password123`
   - Click **Authorize**

3. **Verify Console**:
   ```
   ✅ OAuth2 access token automatically applied to bearer auth
   ```

4. **Check Both Schemes**:
   - Click **Authorize** again
   - Both `oauth2` and `bearer` should show as authorized
   - Click **Close**

5. **Test API Call**:
   - Open `GET /api/v1/users/me/notifications`
   - Click **Try it out**
   - Click **Execute**
   - Should return 200 OK (not 401)

6. **Verify Headers**:
   - In the response, check **Request headers**
   - Should see: `Authorization: Bearer eyJ...`

## Alternative: Use Bearer Token Directly

If OAuth2 token sync continues to have issues, you can bypass it:

### Get Token via cURL

```bash
curl -X POST "https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=notification-client" \
  -d "username=testuser" \
  -d "password=password123" \
  -d "scope=openid profile email"
```

### Apply Manually

1. Copy the `access_token` from response
2. In Swagger UI, click **Authorize**
3. Select **bearer (http, Bearer)**
4. Paste token
5. Click **Authorize**

## Production Recommendations

### For Production Environments

1. **Use Authorization Code Flow** instead of password flow
2. **Implement Token Refresh** - handle expired tokens gracefully
3. **Monitor Token Issues** - log authentication failures
4. **Disable Swagger UI** - or serve on separate subdomain
5. **Use Shorter Token Lifespans** - 5-15 minutes max

### For Development

Current setup is fine:
- Automatic token sync enabled
- Both OAuth2 and bearer work
- Tokens persist across refreshes
- Easy debugging with console tools

## Getting Help

If issues persist:

1. **Check application logs** for authentication errors
2. **Check browser console** for JavaScript errors
3. **Check network tab** for failed requests
4. **Verify Keycloak configuration** (client settings, user exists)
5. **Clear browser cache** and try in incognito mode

## Related Documentation

- [Swagger OAuth Setup](./SWAGGER_OAUTH_SETUP.md)
- [Swagger Password Auth](./SWAGGER_PASSWORD_AUTH.md)
- [Swagger OIDC Fix](./SWAGGER_OIDC_FIX.md)
- [Security CSP Config](./SECURITY_CSP_CONFIG.md)

## Summary

✅ **The application automatically syncs OAuth2 tokens to bearer auth**

After OAuth2 authentication:
1. Token is extracted from OAuth2 response
2. Automatically applied to bearer security scheme
3. Synced every second to ensure consistency
4. Works with both password and authorization code flows

If automatic sync fails, use manual workarounds provided above.

**Remember**: Tokens expire! Default is 5 minutes. Re-authenticate when you get 401 errors after some time.
