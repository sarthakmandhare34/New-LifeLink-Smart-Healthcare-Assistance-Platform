# LifeLink — Smart Healthcare Assistance Platform

LifeLink is a full-stack patient healthcare-assistance application. It provides secure patient accounts, patient-owned health records, an AI-assisted symptom-assessment workflow with safety controls, appointment requests, medicines and prescription history, realtime patient updates, and a controlled Mumbai Specialist Finder.

> **Important scope boundary:** LifeLink is not a medical diagnosis service. The Specialist Finder is intentionally restricted to controlled mock directories. However, the **Doctor Portal is fully functional**, allowing you to log in as these synthetic doctors to view, confirm, and complete real patient appointments.

## What Is Implemented

| Area | Status | Notes |
| --- | --- | --- |
| Patient registration and sign-in | Database-backed | Supports native email/password accounts and Google OAuth. |
| Patient dashboard and records | Database-backed | Profiles, Health Passport details, appointments, medicines, prescriptions, and assessment history are patient-owned. |
| AI Assessment | Server-side | Gemini runs server-side only, validates structured output, and has a deterministic emergency override plus a safe platform fallback. |
| Realtime updates | Implemented | Patient-scoped Server-Sent Events refresh relevant data after changes. |
| Specialist Finder | Controlled mock directory | Specialty, Mumbai rail-corridor, and station filters use controlled mock entries and reference markers only. |
| Maps and browser location | Privacy-bounded | The managed map shows controlled markers. Location is optional, page-local, and neither stored nor transmitted. |
| SOS actions | User-confirmed only | Users must confirm before LifeLink opens an SMS draft or the device dialer for 112. LifeLink never sends a message, places a call, or shares location automatically. |
| Doctor portal | Database-backed | Full authentication, appointment confirmation, consultation workspace, and completion flow for seeded synthetic doctors. |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, CSS liquid-glass design system |
| Backend | Node.js, Express, tRPC, TypeScript |
| Database | MySQL with Drizzle ORM and migrations |
| Authentication | Native signed sessions plus Google OAuth with server-side state/nonce validation |
| AI | Server-only Gemini integration with strict validation and fallback behavior |
| Realtime | Authenticated Server-Sent Events |
| Maps | OpenStreetMap with Leaflet; no personal Maps key is required in the frontend |
| Tests | Vitest, TypeScript checking, and production build validation |

## Repository Structure

```text
lifelink/
├── frontend/                 # Browser application (React 19, Tailwind v4, Vite)
│   └── src/
│       ├── components/       # UI primitives, liquid-glass cards, maps
│       ├── context/          # Active React context providers
│       ├── features/         # Patient & Doctor feature workspaces
│       ├── hooks/            # Realtime SSE and lifecycle hooks
│       └── index.css         # Liquid-glass tokens and animations
├── backend/                  # Express/tRPC server application
│   ├── routers/              # Patient & Doctor feature routers
│   ├── _core/                # Server infrastructure, cookies, env, storage
│   └── *.ts                  # Auth, assessment, realtime, directory services
├── database/                 # Drizzle schema, relations, migrations
├── shared/                   # Cross-boundary types, constants, rail network
├── scripts/                  # Utilities (seed-doctors, dev server)
├── implementation-reports/   # Up-to-date architecture and technical documentation
└── package.json              # Commands and dependencies
```

## Local Development

### Prerequisites

Install **Node.js 22 or later**, npm, and a MySQL-compatible database. Clone the repository, then install dependencies:

```bash
git clone https://github.com/sarthakmandhare34/LifeLink-Smart-Healthcare-Assistance-Platform.git
cd LifeLink-Smart-Healthcare-Assistance-Platform
npm install
```

Local npm commands are supported. The managed deployment uses pnpm and its frozen `pnpm-lock.yaml`; both lockfiles are intentionally retained.

### Environment Configuration

Create a private `.env` file for your own local environment. Do not commit it.

| Capability | Required local configuration |
| --- | --- |
| Native patient records | `DATABASE_URL`, `JWT_SECRET` |
| Direct Gemini assessment provider | `GEMINI_API_KEY` server-side only |
| Google OAuth | Google client ID/secret and a configured HTTPS callback URL |
| Managed maps, storage, and platform fallback | Hosting-platform configuration; never copy production credentials into source code |

> **Security rule:** Never put database URLs, JWT secrets, Gemini keys, Google OAuth secrets, session cookies, authorization codes, or platform credentials in GitHub, frontend code, screenshots, or chat.

### Ports and Services

LifeLink uses the following ports locally, with built-in fallbacks to prevent conflicts:

| Service | Primary Port | Fallback Behavior |
| --- | --- | --- |
| **Main Application** | `3000` | Automatically scans and uses `3001`–`3004` if busy. |
| **Database** | `3306` | Controlled by `DATABASE_URL` in `.env`. Update if your local MySQL uses a different port (e.g. `3307`). |
| **Database UI Studio** | `4983` | Automatically increments (e.g., `4984`) if the port is busy. |

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server with file watching and interactive shortcuts. |
| `npm test` | Run the Vitest suite. |
| `npm run check` | Run TypeScript checking. |
| `npm run build` | Create the production frontend and server bundle. |
| `npm run start` | Run a previously built production bundle. |
| `npm run verify` | Run checking, tests, and production build together. |
| `npm run db:push` | Generate and apply Drizzle migrations. Review database configuration first. |

When `npm run dev` is running, type a shortcut followed by Enter:


For the managed project environment, equivalent pnpm commands are available:

```bash
pnpm run check
pnpm test
pnpm build
```

## Privacy and Safety Design

Patient ownership is enforced server-side. Patient routes derive identity from the signed session rather than trusting an identifier sent by the browser. The AI assessment is decision support only and applies deterministic emergency wording before model output can affect the result.

The optional browser-location control never stores or sends precise coordinates to LifeLink. It only orders visible controlled entries and centers the current map view in the browser session. The SOS controls require a user confirmation before opening the phone’s SMS composer or dialer; users remain in control of every external action.

## Responsive Interface

LifeLink supports wide desktop monitors, laptops, tablets, and mobile devices. Shared layout rules adapt workspace gutters, navigation, touch targets, dialogs, grids, forms, Specialist Finder filters, and map height across display sizes. Optional visual motion respects `prefers-reduced-motion`.

## Verification

Before a checkpoint is saved, the project is validated with TypeScript checking, Vitest, production build, and responsive browser checks. The current test suite contains regression coverage for authentication safety, assessment validation, realtime boundaries, controlled directory filters, map loading, SOS confirmations, motion preferences, responsive layout rules, and the local development shortcut wrapper. The live Google credential exchange is opt-in via `RUN_PROVIDER_AUTH_TESTS=true`; ordinary local validation remains offline-capable.

## Development Notes

The project is structured deliberately around `frontend`, `backend`, `database`, and `shared` boundaries. Browser-only code—including feature-local styles and browser authentication helpers—lives inside `frontend`; server-only credentials and integrations live inside `backend`; schema and migrations live inside `database`; and cross-boundary contracts live inside `shared`. Phase records are consolidated in `implementation-reports/`. Keep generated build output, dependency folders, logs, and private environment files out of Git.

## Recent Updates (Batches 9-10 & AI Optimizations)

- **Digital Health Passport & Emergency Contacts**: Added secure CRUD for patient health passports with proper authorization and IDOR protections.
- **Doctor Prescriptions**: Implemented Doctor-to-Patient prescription flow with SHA-256 cryptographic integrity and Realtime sync.
- **AI Performance & Latency**: Switched Gemini models to lightweight flash tiers (`gemini-3.5-flash-lite`, `gemini-1.5-flash-8b`) returning responses in ~1.2s instead of 10s.
- **Medical Triage & Safeguards**:
  - Implemented automatic redirection to `Pediatrics` for patients under 18.
  - Hardcoded biological impossibility safety checks (e.g. blocking pregnancy assumptions in biological males and young adolescents) which evaluate in `0ms`.
  - Added strict constraint that blocks conversational or non-medical nonsense (e.g. "How to bake a cake?"). If triggered, the system immediately returns an `ERROR` urgency, surfacing distinct red error UI badges to the user rather than processing gibberish.
