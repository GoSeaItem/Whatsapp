# Chrome Extension Production Build

The Chrome Extension is Manifest V3 and runs only on:

```text
https://web.whatsapp.com/*
```

It does not auto-send WhatsApp messages, does not bulk send, and does not click the WhatsApp send button. It only generates drafts that the salesperson can copy or insert, then manually review and send.

## 1. Build for IP Staging

From the repository root:

```bash
npm ci
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

Output directory:

```text
apps/extension/dist
```

## 2. Build for Future HTTPS Domains

```bash
npm ci
VITE_API_BASE_URL=https://api.yourdomain.com VITE_WEB_LOGIN_URL=https://app.yourdomain.com npm run build -w @wa-ai/extension
```

## 3. Load the Extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select `apps/extension/dist`.
6. Open `https://web.whatsapp.com`.

Expected:

- The sidebar appears on the right side of WhatsApp Web.
- The sidebar calls `/api/auth/me` on startup.
- If logged in, it shows the current user.
- If not logged in, it shows `请先登录 Web 后台` and an open-login button.

## 4. Find the Extension ID

1. Open `chrome://extensions`.
2. Find `WhatsApp AI Sales Assistant V1`.
3. Copy the `ID` shown on the extension card.
4. On the server, set:

```env
CHROME_EXTENSION_ORIGIN=chrome-extension://<extension-id>
```

Restart API:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

## 5. Required Manifest Permissions

`apps/extension/public/manifest.json` must include:

```json
{
  "host_permissions": [
    "http://187.77.138.174/*",
    "https://api.yourdomain.com/*",
    "https://web.whatsapp.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"]
    }
  ]
}
```

The extension must not request broad hosts such as `<all_urls>`.

## 6. API Base URL

The content script reads:

```text
VITE_API_BASE_URL
```

The popup login button reads:

```text
VITE_WEB_LOGIN_URL
```

Do not hardcode production secrets into the extension.

## 7. Cookie and CORS Checklist

For IP staging:

```env
WEB_ORIGIN=http://187.77.138.174
API_ORIGIN=http://187.77.138.174
CORS_ORIGINS=http://187.77.138.174
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
```

For future HTTPS:

```env
WEB_ORIGIN=https://app.yourdomain.com
API_ORIGIN=https://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://api.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.yourdomain.com
CHROME_EXTENSION_ORIGIN=chrome-extension://<extension-id>
```

All extension fetch calls must use:

```ts
credentials: "include"
```

## 8. Troubleshooting

Sidebar shows not logged in:

- Confirm you logged in at `http://187.77.138.174` in the same Chrome profile.
- Open DevTools on WhatsApp Web and inspect `/api/auth/me`.
- Confirm response is not blocked by CORS.
- Confirm the `wa_ai_session` cookie exists for the API origin.

CORS error:

- Add Web origin to `CORS_ORIGINS`.
- Add fixed extension origin to `CHROME_EXTENSION_ORIGIN`.
- Restart API.

Cookie not sent:

- IP staging must use `COOKIE_SECURE=false`, `COOKIE_SAME_SITE=lax`.
- HTTPS must use `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`.
- Fetch must include `credentials: "include"`.

Extension uses old API URL:

- Rebuild with `VITE_API_BASE_URL=http://187.77.138.174`.
- Reload the unpacked extension in `chrome://extensions`.

Remote JS risk:

- Manifest V3 build must use bundled local files from `apps/extension/dist`.
- Do not add remotely hosted JavaScript.
