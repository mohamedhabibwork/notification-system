# HTML Email Templates - Developer Guide

## Overview

This directory contains all HTML email templates for the notification system. Templates are written in Handlebars (.hbs) format and are loaded from the filesystem during seeding.

## Directory Structure

```
html-templates/
├── services/
│   ├── handlebars-config.service.ts    # Handlebars configuration
│   └── template-loader.service.ts      # Template loader service
├── components/
│   ├── layouts/                         # Base layout components
│   │   ├── base.hbs                    # Main wrapper
│   │   ├── header.hbs                  # Email header
│   │   ├── footer.hbs                  # Email footer
│   │   └── button.hbs                  # CTA button
│   └── partials/                        # Reusable partials
│       ├── hero.hbs                    # Hero section
│       ├── content-block.hbs           # Content block
│       ├── alert.hbs                   # Alert box
│       └── divider.hbs                 # Divider/spacer
├── transactional/                       # Transactional emails
│   ├── authentication/                 # Authentication emails (7)
│   ├── account/                        # Account management (7)
│   └── notifications/                  # System notifications (6)
├── marketing/                           # Marketing emails
│   ├── campaigns/                      # Campaigns (6)
│   ├── engagement/                     # Engagement (8)
│   ├── promotional/                    # Promotional (7)
│   └── educational/                    # Educational (5)
├── templates.metadata.ts                # Template metadata
└── README.md                            # This file
```

## Template Format

All templates use Handlebars syntax (.hbs) and follow email-client-compatible patterns.

### Basic Template Structure

```handlebars
<!-- Header -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px 30px; text-align: center; border-bottom: 1px solid #eeeeee;">
      <h1 style="margin: 0; color: #333333; font-size: 24px;">{{companyName}}</h1>
    </td>
  </tr>
</table>

<!-- Hero Section -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #4CAF50;">
  <tr>
    <td style="padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
        Welcome!
      </h1>
    </td>
  </tr>
</table>

<!-- Content -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 30px; color: #333333; font-size: 16px; line-height: 1.6;">
      <p>Hello {{firstName}},</p>
      <p>Your content here...</p>
    </td>
  </tr>
</table>

<!-- Footer -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
  <tr>
    <td style="padding: 30px; text-align: center; color: #666666; font-size: 14px;">
      <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
    </td>
  </tr>
</table>
```

## Email Client Compatibility

### Table-Based Layouts (Required)

Email clients (especially Outlook) require table-based layouts for consistent rendering.

**✅ DO:**
```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px;">Content here</td>
  </tr>
</table>
```

**❌ DON'T:**
```html
<div style="padding: 20px;">Content here</div>
```

### Inline CSS (Required)

All styles must be inline. No `<style>` tags or external stylesheets.

**✅ DO:**
```html
<table style="background-color: #f4f4f4; padding: 20px;">
```

**❌ DON'T:**
```html
<style>
  .table { background-color: #f4f4f4; }
</style>
<table class="table">
```

### Outlook-Specific Code

Use MSO conditionals for Outlook-specific rendering:

```html
<!--[if mso]>
<style type="text/css">
  body, table, td {font-family: Arial, sans-serif !important;}
</style>
<![endif]-->
```

### CTA Buttons

Buttons must use table-based structure for Outlook compatibility:

```handlebars
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" 
                   href="{{url}}" 
                   style="height:40px;width:200px;" 
                   arcsize="10%" 
                   stroke="f" 
                   fillcolor="#4CAF50">
        <center style="color:#ffffff;font-size:16px;font-weight:bold;">
          {{text}}
        </center>
      </v:roundrect>
      <![endif]-->
      <a href="{{url}}" 
         style="background-color: #4CAF50; 
                border-radius: 4px; 
                color: #ffffff; 
                display: inline-block; 
                font-size: 16px; 
                font-weight: bold; 
                padding: 12px 24px; 
                text-decoration: none; 
                mso-hide: all;">
        {{text}}
      </a>
    </td>
  </tr>
</table>
```

## Handlebars Syntax

### Variables

```handlebars
Hello {{firstName}} {{lastName}}!
```

### Conditionals

```handlebars
{{#if logoUrl}}
  <img src="{{logoUrl}}" alt="Logo" />
{{else}}
  <h1>{{companyName}}</h1>
{{/if}}
```

### Loops

```handlebars
{{#each articles}}
  <p>{{this.title}}</p>
{{/each}}
```

### Comments

```handlebars
{{!-- This is a Handlebars comment --}}
```

### Helpers

Custom helpers available:

```handlebars
{{formatDate loginTime}}
{{currency amount "USD"}}
{{uppercase companyName}}
{{lowercase email}}
{{default firstName "Valued Customer"}}
```

### Missing Variables

Missing variables will be kept as `{{variableName}}` in the output (not replaced with empty string).

This is intentional for debugging - you'll see which variables are missing.

## Creating New Templates

### Step 1: Create the .hbs File

Create a new file in the appropriate directory:

```bash
# For transactional templates
touch transactional/authentication/my-template.hbs

# For marketing templates
touch marketing/campaigns/my-template.hbs
```

### Step 2: Write the HTML

Use table-based layout with inline styles:

```handlebars
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding: 20px;">
      <p>Hello {{firstName}},</p>
      <p>{{customMessage}}</p>
    </td>
  </tr>
</table>
```

### Step 3: Add Metadata

Update `templates.metadata.ts`:

```typescript
{
  name: 'My Custom Template',
  templateCode: 'MY_TEMPLATE',
  filePath: 'transactional/authentication/my-template.hbs',
  channel: 'email',
  category: 'AUTHENTICATION',
  subject: 'Subject for {{companyName}}',
  variables: {
    firstName: 'string - User first name',
    customMessage: 'string - Custom message to display',
    companyName: 'string - Company name',
  },
  language: 'en',
  description: 'Brief description of what this template does',
  tags: ['custom', 'authentication'],
}
```

### Step 4: Test the Template

Run the seeder to load the new template:

```bash
npm run seed
```

Preview the template:

```http
POST /api/v1/admin/templates/system/MY_TEMPLATE/preview
{
  "variables": {
    "firstName": "John",
    "customMessage": "Test message",
    "companyName": "Acme Corp"
  }
}
```

## Color Palettes

### Transactional (Clean, Neutral)

- Primary: `#4CAF50` (Green)
- Secondary: `#2196F3` (Blue)
- Success: `#4CAF50`
- Warning: `#FF9800` (Orange)
- Danger: `#F44336` (Red)
- Text: `#333333`
- Text Light: `#666666`
- Background: `#ffffff`
- Background Alt: `#f4f4f4`
- Border: `#dddddd`

### Marketing (Vibrant, Engaging)

- Primary: `#7C3AED` (Purple)
- Secondary: `#EC4899` (Pink)
- Accent: `#F59E0B` (Amber)
- Text: `#1F2937`
- Background: `#ffffff`
- Background Alt: `#F9FAFB`

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### Font Sizes

- `12px`: Small text, footer
- `14px`: Secondary text
- `16px`: Body text
- `18px`: Large body text
- `24px`: Subheadings
- `32px`: Headings
- `48px`: Large codes (2FA)

### Line Heights

- `1.2`: Tight (headings)
- `1.5`: Normal
- `1.6`: Relaxed (body text)

## Spacing

- xs: `8px`
- sm: `12px`
- md: `16px`
- lg: `20px`
- xl: `24px`
- 2xl: `32px`
- 3xl: `40px`

## Testing Templates

### 1. Local Preview

Use the API endpoint to preview with test data:

```bash
curl -X POST http://localhost:3000/api/v1/admin/templates/system/WELCOME_EMAIL/preview \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "companyName": "Acme Corp",
      "loginUrl": "https://app.example.com"
    }
  }'
```

### 2. Email Client Testing

Test in real email clients:

- Gmail (Web & Mobile)
- Outlook (Desktop & Web)
- Apple Mail (Mac & iOS)
- Yahoo Mail
- Thunderbird

### 3. Tools

- [Litmus](https://litmus.com/): Professional email testing
- [Email on Acid](https://www.emailonacid.com/): Email testing platform
- [Putsmail](https://putsmail.com/): Free HTML email testing

## Best Practices

### 1. Keep It Simple

- Avoid complex layouts
- Use single-column layouts for mobile
- Minimize nested tables

### 2. Mobile-First

- Use `max-width: 600px` for main container
- Use readable font sizes (min 14px)
- Make buttons large and tappable (min 44x44px)

### 3. Accessibility

- Use semantic HTML where possible
- Include `alt` text for images
- Use sufficient color contrast (4.5:1 minimum)
- Make text resizable

### 4. Performance

- Optimize images (use compression)
- Keep email size under 102KB
- Minimize inline CSS duplication

### 5. Testing

- Always test with real data
- Test in multiple email clients
- Test on mobile devices
- Check spam score

## Common Issues

### Issue: Template Not Rendering in Outlook

**Solution**: Ensure you're using table-based layout and MSO conditionals.

### Issue: Buttons Not Clickable on Mobile

**Solution**: Use table-based button structure with proper padding (min 44x44px touch target).

### Issue: Images Not Loading

**Solution**: 
- Use absolute URLs for images
- Include width/height attributes
- Add descriptive alt text

### Issue: Fonts Look Different in Outlook

**Solution**: Use the font stack with system fonts and MSO conditionals.

### Issue: Colors Look Different

**Solution**: Use web-safe colors and avoid transparency.

## Resources

- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)
- [Can I Email](https://www.caniemail.com/): Email client support tables
- [Email Toolbox](https://email-toolbox.com/): Email development tools
- [Litmus Community](https://litmus.com/community): Email developer community

## Support

For issues with templates:

1. Check this README
2. Review existing templates for patterns
3. Test in multiple email clients
4. Consult the team

## Contributing

When contributing new templates:

1. Follow the established patterns
2. Test in major email clients
3. Document all required variables
4. Update `templates.metadata.ts`
5. Submit for review
