# Swagger OAuth2 Setup Guide

## Quick Fix for "Wrong Redirect URL" Error

If you're seeing the error **"Wrong redirect URL"** in Swagger UI, follow these steps:

### Required Redirect URL

Swagger UI requires this **exact** redirect URL to be registered in Keycloak:

```
http://localhost:3000/api/oauth2-redirect.html
```

### Step-by-Step Fix

#### 1. Access Keycloak Admin Console

Navigate to: `https://keycloak.habib.cloud` (or your Keycloak URL)

Login with your admin credentials.

#### 2. Navigate to Your Client

1. Select your realm: `notification-realm`
2. Click **Clients** in the left sidebar
3. Find and click your client: `notification-client`

#### 3. Configure Valid Redirect URIs

1. Click the **Settings** tab
2. Scroll to **Valid Redirect URIs**
3. Add the following URLs:

```
http://localhost:3000/api/oauth2-redirect.html
http://localhost:3000/*
```

**Important**: Press the **+** button after each URL to add it!

#### 4. Configure Web Origins

In the same Settings page, scroll to **Web Origins** and add:

```
http://localhost:3000
*
```

#### 5. Verify Client Settings

Make sure these settings are correct:

| Setting | Required Value |
|---------|---------------|
| **Access Type** | `public` |
| **Standard Flow Enabled** | `ON` ✓ |
| **Direct Access Grants Enabled** | `ON` ✓ |
| **Valid Redirect URIs** | `http://localhost:3000/api/oauth2-redirect.html` |
| **Web Origins** | `http://localhost:3000` or `*` |

#### 6. Save Changes

Click **Save** at the bottom of the page.

### Testing the Setup

1. Restart your NestJS application
2. Navigate to: http://localhost:3000/api
3. Click the **Authorize** button (🔓)
4. You should see two authentication options:
   - **bearer** - For direct token input
   - **oauth2** - For OAuth2 flow

5. Select **oauth2**
6. Check the scopes you want
7. Click **Authorize**
8. You should be redirected to Keycloak login

### Using Bearer Token Instead

If OAuth2 flow isn't working or you prefer direct token authentication:

1. Get a token from Keycloak:
   ```bash
   curl -X POST "https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=password" \
     -d "client_id=notification-client" \
     -d "username=YOUR_USERNAME" \
     -d "password=YOUR_PASSWORD"
   ```

2. Copy the `access_token` from the response
3. In Swagger UI, click **Authorize**
4. Select **bearer** (HTTPBearer)
5. Paste your token in the **Value** field
6. Click **Authorize**

### Troubleshooting

#### Error: "Wrong redirect URL"

**Cause**: The redirect URL in Keycloak doesn't match exactly.

**Solution**: 
- Make sure the URL is EXACTLY: `http://localhost:3000/api/oauth2-redirect.html`
- No trailing slashes
- Check for typos
- Make sure you clicked **Save** after adding the URL

#### Error: "CORS error" or "Access blocked"

**Cause**: Web Origins not configured correctly.

**Solution**: Add `*` to Web Origins in Keycloak client settings.

#### Error: "Invalid client" or "Client authentication failed"

**Cause**: Client Access Type is set to `confidential` instead of `public`.

**Solution**: Set Access Type to `public` in Keycloak client settings.

#### OAuth2 button not appearing

**Cause**: Keycloak environment variables not set correctly.

**Solution**: Check your `.env` file has:
```env
KEYCLOAK_SERVER_URL=https://keycloak.habib.cloud
KEYCLOAK_REALM=notification-realm
KEYCLOAK_USER_CLIENT_ID=notification-client
```

### Application Logs

When the app starts, you'll see the OAuth2 configuration in the logs:

```
🔐 OAuth2 Configuration:
   Authorization URL: https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/auth
   Token URL: https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token
   Redirect URI: http://localhost:3000/api/oauth2-redirect.html
   Client ID: notification-client

⚠️  KEYCLOAK CLIENT CONFIGURATION REQUIRED:
   1. Access Type: MUST be "public" (NOT confidential)
   2. Standard Flow Enabled: MUST be ON
   3. Valid Redirect URIs: MUST include "http://localhost:3000/api/oauth2-redirect.html"
   4. Web Origins: MUST include "http://localhost:3000" or "*"
   5. PKCE: Should be enabled (default for public clients)
```

Use these values to verify your Keycloak configuration is correct!

## Production Setup

For production environments, update the redirect URL to match your production domain:

```
https://your-domain.com/api/oauth2-redirect.html
```

And update in:
1. Keycloak client Valid Redirect URIs
2. Your production environment variables
