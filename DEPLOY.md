# DEPLOY

Production deployment playbook. Target: single **Hetzner CX22** VPS (~£46/yr, 2 vCPU, 4 GB RAM, 40 GB SSD, Nuremberg/Helsinki/Ashburn). No cold starts. Single-host Docker Compose.

Rationale over the free-tier combo (Cloudflare Pages + Fly.io + Neon): notifications rely on a long-lived WebSocket and APScheduler runs inside the FastAPI process — both penalise scale-to-zero. Single VPS removes that class of bug. Portable: the same `docker compose` stack runs anywhere.

## 1. Prerequisites

- Hetzner Cloud account, new project, SSH key uploaded.
- Domain pointed at the VPS (A record root + `www`).
- Cloudflare R2 bucket `debt-collector-contracts` + API token (Object Read & Write).
- Resend API key (or other SMTP).
- Fresh 32-byte JWT secret: `openssl rand -base64 32`.

## 2. Provision

1. Create CX22 in Hetzner Cloud, image Ubuntu 24.04 LTS, your SSH key.
2. Assign a Hetzner firewall allowing `22/tcp`, `80/tcp`, `443/tcp` inbound only.
3. SSH in as `root`, create a non-root user and lock down SSH:

```bash
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

4. Install Docker Engine + Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

## 3. Repo layout on host

```
/opt/debt-collector/
  ├── .env                 # prod secrets (chmod 600)
  ├── compose.prod.yml     # postgres + server + client + caddy
  ├── Caddyfile
  └── data/                # postgres volume bind mount
```

Clone the repo to `/opt/debt-collector/src`, create `compose.prod.yml` alongside it. Keep source tree and operational files side by side — lets `git pull && docker compose build` work without path gymnastics.

## 4. `compose.prod.yml` (sketch)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: debt
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
      POSTGRES_DB: debt
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    secrets: [pg_password]

  server:
    build: ./src/server
    restart: always
    env_file: .env
    depends_on: { postgres: { condition: service_healthy } }
    command: uv run uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'

  client:
    build:
      context: ./src/client
      args:
        VITE_API_BASE_URL: https://${DOMAIN}
    restart: always

  caddy:
    image: caddy:2-alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

secrets:
  pg_password: { file: ./secrets/pg_password }

volumes:
  caddy_data:
  caddy_config:
```

### `Caddyfile`

```
{$DOMAIN} {
  encode zstd gzip
  @ws path /ws/*
  handle @ws { reverse_proxy server:8000 }
  handle /api/* { reverse_proxy server:8000 }
  handle /docs   { reverse_proxy server:8000 }
  handle /openapi.json { reverse_proxy server:8000 }
  handle { reverse_proxy client:80 }
}
```

Caddy auto-provisions Let's Encrypt. WebSocket upgrades are handled natively by `reverse_proxy`.

## 5. `.env` (prod)

```ini
DOMAIN=debt.example.com
DATABASE_URL=postgresql+asyncpg://debt:REDACTED@postgres:5432/debt
JWT_SECRET=REDACTED
RESEND_API_KEY=re_REDACTED
FRONTEND_BASE_URL=https://debt.example.com
R2_ACCOUNT_ID=REDACTED
R2_ACCESS_KEY_ID=REDACTED
R2_SECRET_ACCESS_KEY=REDACTED
R2_BUCKET=debt-collector-contracts
CRON_ENABLED=true
```

`chmod 600 .env`. Never commit.

## 6. First boot

```bash
docker compose -f compose.prod.yml build
docker compose -f compose.prod.yml run --rm server uv run alembic upgrade head
docker compose -f compose.prod.yml run --rm server uv run python -m seeds.bootstrap
docker compose -f compose.prod.yml up -d
```

Bootstrap seeds the goddess + admin accounts. Rotate their default passwords via `/login` → profile immediately.

## 7. Backups

Postgres dump to R2 nightly. Add to `deploy`'s crontab:

```
15 2 * * * docker compose -f /opt/debt-collector/compose.prod.yml exec -T postgres pg_dump -U debt debt | gzip | aws --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com s3 cp - s3://debt-collector-backups/pg-$(date +\%F).sql.gz
```

Retention: keep 30 daily + 12 monthly. Test restore quarterly.

## 8. Observability

Minimum viable:

- `docker compose logs -f server` → `journalctl` via `--log-driver=journald`.
- Uptime Kuma on the same box (separate compose) probing `/healthz` + `/docs`.
- Caddy access logs rotated daily.

Defer Prometheus / Grafana until there's a second host or traffic justifies it.

## 9. Update flow

```bash
cd /opt/debt-collector/src && git pull
cd .. && docker compose -f compose.prod.yml build server client
docker compose -f compose.prod.yml run --rm server uv run alembic upgrade head
docker compose -f compose.prod.yml up -d server client
```

Zero-downtime for client (Caddy keeps old upstream until new one is healthy). Server has a brief 502 window — acceptable for single-user scale.

## 10. Rollback

```bash
cd /opt/debt-collector/src && git checkout <previous-tag>
docker compose -f ../compose.prod.yml build server client
# downgrade migration only if the failed release added one:
docker compose -f ../compose.prod.yml run --rm server uv run alembic downgrade -1
docker compose -f ../compose.prod.yml up -d server client
```

Tag every release (`git tag vX.Y.Z`) so rollback is a single checkout.

## 11. Not-yet-decided

- CDN in front of Caddy (Cloudflare proxy) — cheap ddos shield, adds a cache tier. Enable when public.
- Managed Postgres (Neon / Hetzner managed) — move off local volume once backup + PITR requirements outgrow `pg_dump`.
- Second region — not needed at current scale.
