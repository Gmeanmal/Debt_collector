# Windows setup guide

Step-by-step install for Debt Collector on **Windows 10 / 11**, from a bare machine.

The root README assumes Linux/macOS with `make`. Windows has no native `make`, so this guide uses the equivalent raw commands (PowerShell). Everything else works unchanged.

> Use **PowerShell** (not cmd). All commands below assume `pwsh` or `powershell` in the project root unless noted.

---

## 1. Install the toolchain

### 1.1 Git

Download + install from https://git-scm.com/download/win — default options are fine. Accept "Git from the command line and also from 3rd-party software".

Verify:

```powershell
git --version
```

### 1.2 Python 3.12+

Download the latest **Python 3.12 or 3.13** Windows installer from https://www.python.org/downloads/windows/.

During install, **tick "Add python.exe to PATH"**. Use "Customize installation" → keep defaults → Install.

Verify:

```powershell
python --version
```

### 1.3 `uv` (Python package manager)

In PowerShell:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Close and reopen PowerShell, then verify:

```powershell
uv --version
```

### 1.4 Node.js 20 LTS

Download and install the **LTS** installer from https://nodejs.org/en/download (Windows Installer `.msi`, 64-bit). Default options.

Verify:

```powershell
node --version
npm --version
```

### 1.5 `pnpm` (JS package manager)

```powershell
npm install -g pnpm
pnpm --version
```

### 1.6 Docker Desktop (for Postgres + Mailhog)

Download and install from https://www.docker.com/products/docker-desktop/. On Windows 10/11 it uses **WSL2** under the hood — the installer handles this automatically.

After install:

1. Reboot if prompted.
2. Open Docker Desktop and let it finish setup (accept the WSL2 backend).
3. Keep Docker Desktop **running** whenever you want the project's Postgres to be reachable.

Verify:

```powershell
docker --version
docker compose version
```

### 1.7 WeasyPrint native dependencies (PDF generation)

The server generates contract PDFs via WeasyPrint. On Windows it needs GTK runtime libraries.

Install GTK for Windows:

1. Download the installer from https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases (`gtk3-runtime-*-ts-win64.exe`).
2. Run it with default options. It adds GTK DLLs to `PATH`.
3. **Restart PowerShell** after install.

Verify (optional, just to confirm the DLLs are on PATH):

```powershell
where.exe libpango-1.0-0.dll
```

If WeasyPrint still complains at runtime, reboot the machine once.

---

## 2. Clone and configure the project

```powershell
cd $HOME\Documents
git clone <this-repo-url> debt-collector
cd debt-collector
```

Copy the env templates:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Open `server\.env` in an editor (VS Code, Notepad++, etc.) and pick local dev values for:

- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `GODDESS_EMAIL` / `GODDESS_PASSWORD`
- `JWT_SECRET_KEY` — any long random string for dev (production: `[System.Web.Security.Membership]::GeneratePassword(64, 10)` in PowerShell, or just use any 64-char random string).

The seed script uses whatever you put here.

---

## 3. Install project dependencies

From the project root:

```powershell
# server
cd server
uv sync
cd ..

# client
cd client
pnpm install
cd ..
```

---

## 4. Start the infrastructure (Postgres + Mailhog)

Docker Desktop must be running.

```powershell
docker compose up -d
```

Verify the two containers are healthy:

```powershell
docker ps
```

You should see `postgres:16-alpine` and `mailhog/mailhog:latest`.

To stop later: `docker compose down`.

---

## 5. Initialise the database

From the project root:

```powershell
cd server
uv run python -m scripts.flush_db
uv run alembic upgrade head
uv run python -m scripts.init_db
cd ..
```

This drops any existing schema, re-applies all migrations, and seeds 11 fake subs + goddess + admin + sample contracts/rollings/payments.

To re-seed later (destroys data): re-run the three commands above.

---

## 6. Run the app (two terminals)

### Terminal A — backend (FastAPI on port 8000)

```powershell
cd server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal B — frontend (Vite on port 5173)

```powershell
cd client
pnpm dev
```

### Open in your browser

| URL                         | What                                  |
| --------------------------- | ------------------------------------- |
| http://localhost:5173       | Web app                               |
| http://localhost:8000/docs  | Swagger UI (full API contract)        |
| http://localhost:8025       | Mailhog inbox (catches dev emails)    |

### Login

Use the credentials you wrote into `server\.env`. If you left the defaults from `.env.example`, check that file.

---

## 7. Day-to-day commands (Windows cheat sheet)

Replacements for the `make` targets. Run from the **project root** unless stated.

| Task                                 | PowerShell command                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Install deps                         | `cd server; uv sync; cd ..; cd client; pnpm install; cd ..`                                                                     |
| Start infra                          | `docker compose up -d`                                                                                                          |
| Stop infra                           | `docker compose down`                                                                                                           |
| Run server                           | `cd server; uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`                                                        |
| Run client                           | `cd client; pnpm dev`                                                                                                           |
| Apply migrations                     | `cd server; uv run alembic upgrade head`                                                                                        |
| Create migration                     | `cd server; uv run alembic revision --autogenerate -m "message"`                                                                |
| Flush DB                             | `cd server; uv run python -m scripts.flush_db`                                                                                  |
| Init DBs (flush + migrate + seed)    | `cd server; uv run python -m scripts.flush_db; uv run alembic upgrade head; uv run python -m scripts.init_db`                   |
| Format                               | `cd server; uv run ruff format .; cd ..; cd client; pnpm format`                                                                |
| Lint                                 | `cd server; uv run ruff check .; cd ..; cd client; pnpm lint`                                                                   |
| Typecheck                            | `cd server; uv run pyright; cd ..; cd client; pnpm tsc --noEmit`                                                                |
| Tests                                | `cd server; uv run pytest -q; cd ..; cd client; pnpm vitest run`                                                                |
| Regenerate OpenAPI types             | `cd client; pnpm sync-types` (server must be running)                                                                           |
| Regenerate ERD                       | `cd server; uv run python scripts\generate_erd.py`                                                                              |

---

## 8. Troubleshooting

### Port already in use (5173 / 8000 / 5432)

Find and kill the process holding the port:

```powershell
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

Replace `5173` with the offending port.

### `uv` / `pnpm` not found after install

Close and reopen PowerShell. If still missing, reboot (PATH refresh).

### Docker says "Cannot connect to the Docker daemon"

Open Docker Desktop and wait for it to finish starting. The whale icon in the system tray must be stable (not animated).

### WeasyPrint "cannot load library 'libgobject-2.0-0.dll'"

GTK DLLs are not on PATH. Re-install the GTK runtime (step 1.7) and reboot.

### `alembic upgrade head` fails with "database does not exist"

The Postgres container isn't up. Run `docker compose up -d` and retry.

### Line ending warnings on `git status`

Windows line endings. Run once:

```powershell
git config --global core.autocrlf input
```

Then re-clone the repo.

### Long path errors (`filename too long`)

Enable long paths:

```powershell
git config --global core.longpaths true
```

And in an elevated PowerShell:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

Reboot.

---

## 9. Optional: WSL2 instead of native Windows

If you run into too many native Windows quirks, a cleaner option is to develop inside **WSL2 Ubuntu** and use the main `README.md` instructions as-is (everything `make`-based works natively there). Docker Desktop already runs on WSL2 under the hood.

Install Ubuntu via the Microsoft Store → open Ubuntu → clone the repo inside the Linux filesystem (`~/debt-collector`, not `/mnt/c/...` for performance) → follow the Linux README.

VS Code has the "WSL" extension for a seamless editor experience.
