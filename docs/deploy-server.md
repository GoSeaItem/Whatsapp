# Ubuntu 24.04 Staging Deployment

Current release target: `v0.4-v2-sales-enhancement`.

Target:

- Server: Ubuntu 24.04 LTS
- IP staging URL: `http://187.77.138.174`
- Repository: `https://github.com/GoSeaItem/Whatsapp.git`

Security rules:

- Do not write server passwords, database passwords, `SESSION_SECRET`, `COOKIE_SECRET`, or `OPENAI_API_KEY` into code, docs, scripts, or logs.
- Create `.env.production` manually on the server.
- Do not commit `.env.production`.
- V1 does not connect to WhatsApp official API, does not auto-send WhatsApp messages, does not bulk send, and does not bypass WhatsApp risk controls.

## 1. Install Base Dependencies

Run on the server after you log in manually.

```bash
apt-get update
apt-get install -y git curl ufw openssl ca-certificates gnupg
```

## 2. Install Docker and Docker Compose

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
```

## 3. Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
ufw status
```

Later, after HTTPS is enabled, also allow 443:

```bash
ufw allow 443/tcp
```

## 4. Pull Code

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/GoSeaItem/Whatsapp.git whatsapp-ai-sales
cd /opt/whatsapp-ai-sales
```

## 5. Create .env.production

```bash
cp .env.example .env.production
chmod 600 .env.production
nano .env.production
```

Generate strong random values:

```bash
openssl rand -base64 32
openssl rand -hex 64
openssl rand -hex 64
openssl rand -base64 18
```

Use the generated values for:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `COOKIE_SECRET`
- `ADMIN_PASSWORD`

IP staging recommended values:

```env
NODE_ENV=production
PORT=4000

POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generated-postgres-password>
POSTGRES_DB=whatsapp_ai_sales
DATABASE_URL="postgresql://postgres:<same-postgres-password>@postgres:5432/whatsapp_ai_sales?schema=public"

SESSION_SECRET=<generated-hex-secret>
COOKIE_SECRET=<generated-hex-secret>

WEB_ORIGIN=http://187.77.138.174
API_ORIGIN=http://187.77.138.174
CORS_ORIGINS=http://187.77.138.174
CHROME_EXTENSION_ORIGIN=

OPENAI_API_KEY=

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=

ADMIN_EMAIL=<your-admin-email>
ADMIN_PASSWORD=<generated-or-manual-strong-admin-password>
```

Do not paste real values into this document or into Git.

## 6. Start Services

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

The production compose starts:

- `postgres`
- `api`
- `web`

Postgres data is stored in the `postgres_data` Docker volume.

## 7. Run Prisma Migration

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npm run db:migrate:deploy
```

This uses `prisma migrate deploy`, not `migrate dev`.

## 8. Seed Admin User

Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env.production`, then run:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npm run db:seed
```

The seed script:

- reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment variables;
- hashes the password before storing it;
- does not print the password;
- does not create a duplicate admin if the email already exists;
- only runs when you manually execute `npm run db:seed`.

## 9. Install and Configure Nginx

The compose file exposes API and Web only on `127.0.0.1`. Use host Nginx as the public reverse proxy.

```bash
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

Create the IP staging config:

```bash
cat > /etc/nginx/sites-available/whatsapp-ai-sales <<'EOF'
server {
  listen 80;
  server_name 187.77.138.174;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /health {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

ln -sf /etc/nginx/sites-available/whatsapp-ai-sales /etc/nginx/sites-enabled/whatsapp-ai-sales
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 10. Health Check

```bash
curl -i http://187.77.138.174/api/health
```

Expected: `200 OK` and JSON with `ok: true`.

Web dashboard:

```text
http://187.77.138.174
```

## 11. View Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

API only:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
```

Postgres only:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f postgres
```

## 12. Chrome Extension Production Build

Build for IP staging:

```bash
npm ci
VITE_API_BASE_URL=http://187.77.138.174 VITE_WEB_LOGIN_URL=http://187.77.138.174 npm run build -w @wa-ai/extension
```

Load `apps/extension/dist` in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `apps/extension/dist`.
5. Open `https://web.whatsapp.com`.

More details: [extension-production.md](extension-production.md).

## 13. Future Domain and HTTPS Upgrade

Future domains:

- Web: `https://app.yourdomain.com`
- API: `https://api.yourdomain.com`

Install Certbot:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

After HTTPS is enabled, update `.env.production`:

```env
WEB_ORIGIN=https://app.yourdomain.com
API_ORIGIN=https://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://api.yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=.yourdomain.com
```

Then rebuild:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
systemctl reload nginx
```

## 14. Common Troubleshooting

Docker failed to start:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

Migration failed:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx prisma migrate status
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npm run db:migrate:deploy
```

Prisma libssl error:

- The API Docker image installs `openssl` and `ca-certificates` to support Prisma on Debian-based Node images.
- If logs show `PrismaClientInitializationError` or `libssl.so.1.1: cannot open shared object file`, rebuild the API image after pulling the latest `Dockerfile`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache api
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
```

- Do not use `prisma migrate dev` on the staging server. Use `npm run db:migrate:deploy`.

Login failed:

- Confirm seed was executed.
- Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` are correct in `.env.production`.
- Check API logs.

Cookie not working:

- IP staging should use `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`.
- HTTPS production should use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`.
- Confirm browser is using `http://187.77.138.174`, not `localhost`.

CORS error:

- Confirm `WEB_ORIGIN=http://187.77.138.174`.
- Confirm `API_ORIGIN=http://187.77.138.174`.
- Confirm `CORS_ORIGINS=http://187.77.138.174`.
- If the extension ID is stable, set `CHROME_EXTENSION_ORIGIN=chrome-extension://<extension-id>` and restart API.

Extension cannot call API:

- Rebuild extension with `VITE_API_BASE_URL=http://187.77.138.174`.
- Confirm `manifest.json` host permissions include `http://187.77.138.174/*`.
- Confirm all extension fetch calls use `credentials: "include"`.
- Open Chrome DevTools on WhatsApp Web and inspect `/api/auth/me`.
