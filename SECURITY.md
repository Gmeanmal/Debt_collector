# Security policy

## Supported versions

This is a private, single-tenant app. Only the currently-deployed `main` branch receives security fixes. Tagged releases before the active version are not patched.

## Reporting a vulnerability

Do **not** open a public GitHub issue for security reports.

Email the maintainer directly. Include:

- Affected endpoint, route, or component.
- Reproduction steps (minimal request, payload, or screenshot).
- Impact assessment (data exposure, privilege escalation, DoS, etc.).
- Suggested fix if you have one.

Expect an acknowledgement within 3 business days and a fix or mitigation plan within 10 business days for high-severity issues.

## Scope

In scope:

- Authentication and session handling (`/auth/*`, refresh cookie, impersonation).
- Admin generic CRUD (`/admin/*`) — privilege escalation, forbidden-field bypass.
- Payment declaration, validation, and allocation flows.
- Debt contract state machine and ledger integrity.
- WebSocket authentication (`/ws/notifications`).
- Cloudflare R2 presigned URL generation.

Out of scope:

- Denial of service via resource exhaustion on unauthenticated public endpoints — rate limits are configured; abuse reports welcome but lower priority.
- Email deliverability or Resend API outages.
- Vulnerabilities in third-party dependencies already fixed in a newer release; open a dependency-bump PR instead.

## Hardening checklist for operators

Before exposing this app to the public internet:

- [ ] Set `APP_ENV=prod` — enables `Secure` cookies, `SameSite=strict`, and HSTS automatically.
- [ ] Rotate `JWT_SECRET_KEY` via `openssl rand -hex 32`.
- [ ] Replace dev admin + goddess seeds (defined in `server/seeds/bootstrap.py`) with real onboarding before the first login.
- [ ] Terminate TLS at Caddy/Nginx/Traefik — never expose uvicorn directly.
- [ ] Restrict `CORS_ORIGINS` to the production domain.
- [ ] Put the app behind HTTP Basic auth or a VPN while it is invite-only; the invite-link model assumes the UI itself is not crawlable.
- [ ] Configure off-host backups (R2 nightly dump) and test restore at least once.
- [ ] Monitor the `admin_action` table for unexpected entries.

## Known limitations

- Refresh-token reuse detection is not implemented — a stolen refresh cookie remains valid until its next rotation or TTL expiry.
- Impersonation audit currently records the session start only; per-mutation attribution to the acting admin is tracked via the `admin_action` table for admin CRUD but not yet for other controllers (see TODO in `server/dependencies/auth.py`).
- No MFA on any role.
