# Deployment

```bash
docker build -t toshakino-panel .
docker run -p 8080:80 -e API_BASE_URL=https://api.tashkino.ir/api/v1 toshakino-panel
```

- Static build served by nginx with SPA fallback. `index.html` and `config.json` are `no-store`; hashed assets are `immutable`.
- `config.json` is generated at container start from env vars (`API_BASE_URL`, default `https://api.tashkino.ir/api/v1`), so one image serves every environment.
- CSP (in `deploy/nginx.conf.template`): `default-src 'self'`; `connect-src 'self' <API_ORIGIN>`; `img-src 'self' data: https:`; `frame-ancestors 'none'`. Adjust `img-src` once media/CDN hosts are known.
- Serve over HTTPS only (HSTS is set). CORS and the refresh cookie live on the API side (`https://admin.tashkino.ir` must be an allowed origin with credentials).

> The Dockerfile/nginx setup was written but **not run** in the authoring sandbox (no Docker). Build it once in CI or locally before relying on it.

## کوکی refresh و دامنه‌ها (تصمیم استقرار، Q2)
- کوکی `admin_refresh_token`: HttpOnly، مسیر `/api/v1/admin/auth`، `SameSite=lax` (قابل تنظیم با `COOKIE_SAMESITE`)، با rotation و تشخیص استفاده مجدد.
- بک‌اند هدر سفارشی/Origin را بررسی نمی‌کند؛ حفاظت بر پایه `SameSite` + CORS با لیست صریح مبداهاست.
- **پنل و API باید same-site باشند** (مثلاً `admin.tashkino.ir` و `api.tashkino.ir`). اگر دامنه‌ها جدا باشند `lax` کوکی را در fetch نمی‌فرستد و ورود/تمدید کار نمی‌کند (راه دیگر `SameSite=None; Secure` از سمت بک‌اند).
- مبدأ پنل باید در لیست CORS بک‌اند باشد (`allow_credentials` با مبدأ دقیق).
