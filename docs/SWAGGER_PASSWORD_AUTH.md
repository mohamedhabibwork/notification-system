# Swagger Username/Password Authentication Guide

## Overview

Swagger UI now supports **direct username/password authentication** using OAuth2 Password Grant flow. This allows you to authenticate without being redirected to Keycloak's login page.

## Quick Start

### Step 1: Open Swagger UI

Navigate to: http://localhost:3000/api

### Step 2: Click Authorize

Click the **Authorize** button (🔓) in the top right corner.

### Step 3: Choose Authentication Method

You'll see multiple authentication options:

#### Option A: **oauth2 (OAuth2, password)** ⭐ Recommended for Testing

- **Username**: Your Keycloak username
- **Password**: Your Keycloak password
- **Client ID**: `notification-client` (pre-filled)
- **Scopes**: Check `openid`, `profile`, `email`

Click **Authorize** and your credentials will be exchanged for a token directly.

#### Option B: **oauth2 (OAuth2, authorizationCode)**

- Redirects you to Keycloak login page
- More secure for production use
- Requires browser popup

#### Option C: **bearer (http, Bearer)**

- Paste an existing JWT token
- Useful if you already have a token

### Step 4: Test Authenticated Endpoints

Once authorized, you'll see a lock icon (🔒) on the **Authorize** button. You can now test any protected endpoint!

---

## Authentication Methods Comparison

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Password Flow** | Development, Testing, Quick API exploration | Fast, no redirects, simple | Less secure, credentials visible in Swagger UI |
| **Authorization Code** | Production, Secure applications | More secure, SSO support | Requires popup, slower |
| **Bearer Token** | Service-to-service, CI/CD | Direct token use | Need to get token manually first |

---

## Keycloak Configuration Requirements

For username/password authentication to work, ensure these settings in Keycloak:

### 1. Navigate to Client Settings

1. Open Keycloak Admin Console: https://keycloak.habib.cloud
2. Select realm: `notification-realm`
3. Go to **Clients** → `notification-client`

### 2. Required Settings

| Setting | Required Value | Why |
|---------|---------------|-----|
| **Access Type** | `public` | Allows Swagger UI to authenticate |
| **Standard Flow Enabled** | `ON` ✓ | Enables authorization code flow |
| **Direct Access Grants Enabled** | `ON` ✓ | **Enables password flow** ⭐ |
| **Valid Redirect URIs** | `http://localhost:3000/api/oauth2-redirect.html` | For authorization code flow |
| **Web Origins** | `http://localhost:3000` or `*` | Prevents CORS errors |

### 3. Save Changes

Click **Save** at the bottom of the page.

---

## Testing Username/Password Login

### Example: Test with a User

1. **Create a Test User in Keycloak** (if you haven't already):
   - Go to **Users** → **Add user**
   - Username: `testuser`
   - Email: `testuser@example.com`
   - Click **Save**
   - Go to **Credentials** tab
   - Set password: `password123`
   - Toggle **Temporary** to `OFF`
   - Click **Set Password**

2. **Authenticate in Swagger UI**:
   - Open: http://localhost:3000/api
   - Click **Authorize**
   - Select **oauth2 (OAuth2, password)**
   - Enter:
     - Username: `testuser`
     - Password: `password123`
     - Client ID: `notification-client`
   - Check scopes: `openid`, `profile`, `email`
   - Click **Authorize**

3. **Verify Authentication**:
   - The modal should close
   - **Authorize** button now shows 🔒
   - You can now test protected endpoints!

---

## How Password Flow Works

```
┌─────────────┐                    ┌──────────────┐                    ┌──────────────┐
│  Swagger UI │                    │   Your API   │                    │   Keycloak   │
└──────┬──────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                  │                                   │
       │ 1. POST /token                   │                                   │
       │    username=testuser             │                                   │
       │    password=password123          │                                   │
       │    grant_type=password           │                                   │
       │    client_id=notification-client │                                   │
       │──────────────────────────────────┼──────────────────────────────────>│
       │                                  │                                   │
       │                                  │  2. Validate credentials          │
       │                                  │     Check user exists             │
       │                                  │     Verify password               │
       │                                  │                                   │
       │ 3. Response:                     │                                   │
       │    {                             │                                   │
       │      "access_token": "eyJ...",   │                                   │
       │      "refresh_token": "eyJ...",  │                                   │
       │      "expires_in": 300           │                                   │
       │    }                             │                                   │
       │<─────────────────────────────────┼───────────────────────────────────│
       │                                  │                                   │
       │ 4. API Request                   │                                   │
       │    Authorization: Bearer eyJ...  │                                   │
       │─────────────────────────────────>│                                   │
       │                                  │                                   │
       │                                  │ 5. Validate token                 │
       │                                  │───────────────────────────────────>│
       │                                  │                                   │
       │                                  │ 6. Token valid ✓                  │
       │                                  │<───────────────────────────────────│
       │                                  │                                   │
       │ 7. API Response                  │                                   │
       │<─────────────────────────────────│                                   │
       │                                  │                                   │
```

---

## Troubleshooting

### Error: "Invalid user credentials" or "Unauthorized"

**Causes**:
1. Wrong username or password
2. User doesn't exist in Keycloak
3. User is disabled

**Solutions**:
1. Double-check username and password (case-sensitive)
2. Verify user exists in Keycloak Users section
3. Ensure user is **Enabled** in Keycloak

---

### Error: "unsupported_grant_type" or "Grant type 'password' not allowed"

**Cause**: Direct Access Grants not enabled in Keycloak client.

**Solution**:
1. Go to Keycloak Admin Console
2. Navigate to **Clients** → `notification-client` → **Settings**
3. Set **Direct Access Grants Enabled** to `ON`
4. Click **Save**
5. Restart your application

---

### Error: "Invalid client" or "Client authentication failed"

**Cause**: Client is set to `confidential` instead of `public`.

**Solution**:
1. Go to Keycloak **Clients** → `notification-client` → **Settings**
2. Set **Access Type** to `public`
3. Click **Save**

---

### Password flow option not appearing in Swagger UI

**Cause**: Keycloak environment variables not configured.

**Solution**: Check your `.env` file has:
```env
KEYCLOAK_SERVER_URL=https://keycloak.habib.cloud
KEYCLOAK_REALM=notification-realm
KEYCLOAK_USER_CLIENT_ID=notification-client
```

Restart your application after updating.

---

### Token expires too quickly

**Issue**: Access token expires in 5 minutes (default).

**Solution**: Increase token lifespan in Keycloak:
1. Go to **Realm Settings** → **Tokens** tab
2. Adjust **Access Token Lifespan** (e.g., 30 minutes)
3. Click **Save**

**Note**: For production, keep token lifespan short for security.

---

## Security Considerations

### Development vs Production

| Environment | Recommended Method | Why |
|-------------|-------------------|-----|
| **Development** | Password Flow | Fast iteration, easy testing |
| **Production** | Authorization Code Flow | More secure, no credential exposure |

### Best Practices

1. ✅ **DO** use password flow for local development and testing
2. ✅ **DO** use authorization code flow in production
3. ✅ **DO** keep access token lifespan short (5-30 minutes)
4. ❌ **DON'T** use password flow in production web apps
5. ❌ **DON'T** store credentials in Swagger UI (use password managers)
6. ❌ **DON'T** share tokens or credentials

---

## Testing with cURL

You can also test password flow directly with cURL:

```bash
# Get token using username/password
curl -X POST "https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=notification-client" \
  -d "username=testuser" \
  -d "password=password123" \
  -d "scope=openid profile email"

# Response:
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
  "token_type": "Bearer",
  "not-before-policy": 0,
  "session_state": "...",
  "scope": "openid profile email"
}

# Use token in API request
curl -X GET "http://localhost:3000/api/v1/users/me/notifications" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI..."
```

---

## Advanced: Programmatic Authentication

### JavaScript/TypeScript

```typescript
async function authenticateWithPassword(username: string, password: string) {
  const response = await fetch(
    'https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'notification-client',
        username,
        password,
        scope: 'openid profile email',
      }),
    }
  );

  const data = await response.json();
  return data.access_token;
}

// Usage
const token = await authenticateWithPassword('testuser', 'password123');
console.log('Access Token:', token);
```

### Python

```python
import requests

def authenticate_with_password(username: str, password: str) -> str:
    url = 'https://keycloak.habib.cloud/realms/notification-realm/protocol/openid-connect/token'
    data = {
        'grant_type': 'password',
        'client_id': 'notification-client',
        'username': username,
        'password': password,
        'scope': 'openid profile email'
    }
    
    response = requests.post(url, data=data)
    response.raise_for_status()
    
    return response.json()['access_token']

# Usage
token = authenticate_with_password('testuser', 'password123')
print(f'Access Token: {token}')
```

---

## Related Documentation

- [Swagger OAuth2 Setup Guide](./SWAGGER_OAUTH_SETUP.md)
- [Swagger OIDC Fix Summary](./SWAGGER_OIDC_FIX.md)
- [Keycloak Setup Guide](../.cursor/KEYCLOAK_SETUP.md)
- [OAuth 2.0 Password Grant](https://oauth.net/2/grant-types/password/)
- [OpenID Connect](https://openid.net/connect/)

---

## Summary

✅ **Username/password authentication is now enabled in Swagger UI!**

**Quick Steps**:
1. Open Swagger UI: http://localhost:3000/api
2. Click **Authorize**
3. Select **oauth2 (OAuth2, password)**
4. Enter username and password
5. Click **Authorize**
6. Start testing your APIs! 🚀

**Requirements**:
- Keycloak client must have **Direct Access Grants Enabled** set to `ON`
- User must exist in Keycloak
- Application must be restarted after configuration changes

If you encounter any issues, check the troubleshooting section above or refer to the application logs.
