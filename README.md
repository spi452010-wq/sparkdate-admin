# SparkDate Admin Panel

React 18 + TypeScript + Vite, React Router, TanStack Query. No UI kit; plain CSS with design tokens (`src/styles/global.css`).

Screens: Login · Dashboard · Events (status filter, boys/girls seats booked vs capacity) · Create/Edit event (gender capacity ≤300 total, 3-min rounds, free or paid with Google Play product ID) · Event detail + bookings + publish · Users (search, selfie verification approve/reject, block/unblock) · Reports (dismiss / block user) · Refund requests (approve/reject; backend processes the Google Play refund) · Google Play purchases.
Roles: `admin` sees everything; `host` sees dashboard and events.

## Setup
```bash
cd apps/admin
npm install
cp .env.example .env     # optional
npm run dev              # http://localhost:5173
```

## Environment variables
| Var | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCK` | `true` | `true` = in-memory mock data, no backend. Set `false` for the real API |
| `VITE_API_BASE_URL` | `/api/v1` | API base. Keep it same-origin (`/api/v1`) so the httpOnly session cookie works |

These are baked in at build time.

## Mock mode
Default. Accounts: `admin@sparkdate.in` (admin) and `host@sparkdate.in` (host), any password of 12+ characters. 5 wrong passwords lock the mock account (`ACCOUNT_LOCKED`), like the server. Data resets on reload.

## Real API (`VITE_USE_MOCK=false`)
- Login: `POST /admin/auth/login {email,password}`, session check `GET /admin/auth/me`, `POST /admin/auth/logout`.
- Live: users (server `q` search, verification review, block/unblock), `/admin/stats`, events CRUD + bookings, **event Cancel** (`POST /admin/events/:id/cancel`, paid bookings auto-refunded), **refunds** (approve / reject with reason, retry failed) and **Google Play purchases** (filter by status and user ID). Contract: `docs/api/SPRINT2_API.md` in sparkdate-api.
- **Reports are not in the backend yet.** With the real API the Reports page shows "Coming soon: not available yet" and makes no request; the dashboard tile shows "Soon".
- Refunds, payments and Cancel event are admin-only (the API gives hosts 403; hosts don't see them).
- Hosts: see and edit only their own events; no dashboard stats or users (they get a "My events" summary).

Create admin/host accounts on the server: `ADMIN_EMAIL=.. ADMIN_PASSWORD=.. ADMIN_ROLE=admin npm run create-admin:prod` (in services/api).

## Auth & security
- Session cookies `sd_at` (15 min) and `sd_rt` are httpOnly, set by the API; requests use `credentials: 'include'`. No token is ever stored in localStorage/sessionStorage or read by JS.
- On a 401 the client calls `GET /admin/auth/me` once (rotates `sd_at` from `sd_rt`) and retries; otherwise you go to /login.
- Unsafe requests send `X-CSRF-Token` = the readable `csrf_token` cookie. `403 CSRF_INVALID`, `429 ACCOUNT_LOCKED`, `429 TOO_MANY_ATTEMPTS`, `401 INVALID_CREDENTIALS`, `403 ACCOUNT_BLOCKED` show clear messages.
- Cookies are SameSite=Strict + Secure: panel and API must be served from the same HTTPS origin.
- `selfieUrl` (signed, 5 min) and photo URLs (15 min) are used directly in `<img>`; the users list refetches every 4 min and immediately when an image fails to load. Never cached long-term.

## Scripts
`npm run dev` · `npm run build` (typecheck + `dist/`) · `npm test` (Vitest + React Testing Library) · `npm run preview`

## Deploy (DigitalOcean VPS, same origin)
1. Build: `VITE_USE_MOCK=false VITE_API_BASE_URL=/api/v1 npm ci && npm run build`
2. Copy: `rsync -av dist/ root@YOUR_VPS:/var/www/sparkdate-admin/`
3. Nginx (TLS via certbot), serving the panel and proxying the API on the same host:
```nginx
server {
  server_name admin.example.com;
  root /var/www/sparkdate-admin;
  location /api/ {
    proxy_pass http://127.0.0.1:4000;      # services/api
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10m;
  }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri /index.html; add_header Cache-Control "no-cache"; }
}
```
4. `sudo nginx -t && sudo systemctl reload nginx`. Add `https://admin.example.com` to the API's `CORS_ORIGINS` only if you serve the API on a different origin.

The backend must provide the endpoints in [docs/admin-api.md](docs/admin-api.md) (admin cookie login, events, reports, refunds and payments are still to be built; users/verification/status exist).
