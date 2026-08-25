# MujuzPM

A full-stack project management platform — real auth/RBAC, nested tasks with dependencies and a critical path, budgets in USD, file attachments, comments with @mentions, automation rules, an audit log, and an AI Copilot backed by your own Anthropic API key. A 3D spaceship on the dashboard visualizes overall portfolio build progress.

## Tech stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 19, Vite, React Router 7, Three.js (`@react-three/fiber` + `drei`) |
| Backend  | Node.js, Express, Prisma ORM 7, SQLite (via `@prisma/adapter-better-sqlite3`) |
| Auth     | JWT (`jsonwebtoken`) + `bcryptjs`, role-based access (viewer/member/admin/owner) |
| Integrations | Anthropic Claude (AI Copilot), Slack (Incoming Webhooks), SMTP email — all opt-in via your own credentials, never fabricated |

## Project structure

```
MujuzPM/
├── backend/
│   ├── prisma/            # schema, migrations, seed script
│   ├── src/
│   │   ├── lib/            # auth, prisma client, notifications, automations, AI, mailer
│   │   ├── routes/         # Express route handlers, one file per resource
│   │   └── server.js       # app entrypoint
│   └── uploads/            # attachment storage (gitignored contents)
└── frontend/
    └── src/
        ├── components/     # reusable UI (Sidebar, Topbar, CommandPalette, TaskPanel, …)
        ├── pages/           # one component per route
        ├── hooks/           # context providers (auth, tasks, theme, i18n)
        ├── services/        # typed fetch wrappers per API resource
        ├── styles/          # design tokens + global CSS
        └── utils/
```

## Prerequisites

- Node.js 18+ and npm
- No external database needed — SQLite lives in `backend/dev.db`

## Setup

Run once after cloning:

```bash
# 1. Install dependencies for both apps (and the root orchestrator)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Configure the backend
cd backend
cp .env.example .env
# open .env and set JWT_SECRET — generate one with:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Create the database and seed demo data
npm run db:migrate
npm run db:seed
cd ..
```

`db:seed` creates 9 demo users (all password `mujuzpm123`) and 8 sample ventures with tasks, budgets, and an automation rule. See [`backend/prisma/seed.js`](backend/prisma/seed.js) for the full list — sign in as `mohd@mujuzpm.com` for the owner/CEO view.

## Running the app

**Option A — one command from the root** (runs both servers together):

```bash
npm run dev
```

**Option B — two terminals, run manually:**

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Then open **http://localhost:5173**. The frontend dev server proxies `/api/*` to the backend on port 4000.

## Environment variables

All backend config lives in `backend/.env` (gitignored). See [`backend/.env.example`](backend/.env.example) for the full, commented list — `DATABASE_URL`, `JWT_SECRET`, `PORT`, and optional `SMTP_*` for real email delivery. Without SMTP configured, outbound mail falls back to a disposable Ethereal test inbox and logs a preview link to the console.

Slack and the Anthropic (AI Copilot) API key are **not** environment variables — they're per-workspace credentials entered once at Settings → Integrations and stored in the database, so every teammate shares the same connection.

If the backend runs on a port other than 4000, set `BACKEND_PORT` in `frontend/.env` (see `frontend/.env.example`) so the Vite dev proxy still finds it.

## Useful backend scripts

Run from `backend/`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the API with auto-restart on file changes |
| `npm run db:migrate` | Apply/create Prisma migrations (dev) |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:reset` | Drop, re-migrate, and re-seed the database |
| `npm run db:studio` | Open Prisma Studio to browse/edit data visually |

## Running in VS Code

See [`.vscode/`](.vscode) — open this folder in VS Code and either:
- Run the **"Full Stack: Dev"** compound task (`Terminal → Run Task…`), or
- Use the **Run and Debug** panel to launch the backend with the debugger attached.

Recommended extensions are proposed automatically on first open (`.vscode/extensions.json`).
