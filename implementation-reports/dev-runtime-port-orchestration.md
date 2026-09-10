# Development Runtime Port Orchestration & Codebase Remediation

## 1. Executive Summary

This remediation successfully resolves all identified development-runtime configuration and orchestration issues across the LifeLink Smart Healthcare Assistance Platform while preserving complete application functionality, security architecture, database integrity, and realtime event behavior.

Key outcomes achieved:
- **Port Orchestration**: Configured standard local development ports to **5173** for the Vite frontend and **4000** for the Express backend.
- **Deterministic Port Fallback**: Implemented bounded sequential fallback discovery using Node's `net` module (Frontend: `5173–5177`, Backend: `4000–4004`) with clear, actionable error reporting upon range exhaustion.
- **Dynamic Vite Proxy**: Vite dynamically receives the selected backend port via runtime environment variable `VITE_API_PORT` and proxies `/api` and `/uploads` directly without hardcoding.
- **Clean Two-Process Launcher**: `npm run dev` starts exactly two independent application processes (Backend and Frontend). Drizzle Studio was completely decoupled from `npm run dev` and remains an independent tool invoked via `npm run db:studio`.
- **Targeted Process Lifecycle Management**: Child processes are managed cleanly without orphaned processes on `Ctrl+C` or termination signals. Destructive global commands like `taskkill /F /IM node.exe` are completely avoided, targeting only launcher-spawned PIDs.
- **AI Assessment Typo Correction**: Corrected the misspelling `Sysmpotms` to `symptoms` in `backend/ai/assessmentService.ts` and `backend/ai/assessmentService.test.ts`.
- **Accurate Environment Documentation**: Updated `.env.example` to document all real environment variables used across the project with safe placeholders, clearly distinguishing developer configuration from launcher-generated runtime variables.
- **Full Automated Regression**: Vitest test suite executed with 185 tests passing (0 failures, 1 skipped), TypeScript typecheck passed cleanly, and production build succeeded.

---

## 2. Architecture Before

Prior to this remediation pass:
1. **Port Strategy**: The development runner had an inconsistent configuration that spawned three processes (Backend on 3000–3005, Frontend on 5090–5095, and Drizzle Studio on 8000–8005) instead of the standard 5173 and 4000 ports.
2. **Backend Port Default**: `backend/_core/index.ts` had a default fallback of `3000` (`process.env.PORT || "3000"`), which conflicted with the architectural target of `4000`.
3. **Unintended Process Spawning**: `npm run dev` was launching Drizzle Studio alongside frontend and backend processes, consuming additional ports and system resources.
4. **Environment File Deficiencies**: `.env.example` omitted critical configuration variables (such as `PORT`, Google OAuth credentials, and demo access codes) and did not document runtime-generated variables.
5. **Spelling Bug**: `Sysmpotms` appeared in clinical AI assessment fallback guidance strings and corresponding unit test assertions.

---

## 3. Architecture After

The rectified architecture strictly separates development concerns into two independent processes:

```
                  Browser
                     |
                     v
           Vite Frontend Dev Server
           http://localhost:5173 (fallback: 5173–5177)
                     |
                Vite Proxy
           (targets VITE_API_PORT)
                     |
                     v
           Express Backend Server
           http://localhost:4000 (fallback: 4000–4004)
                     |
          +----------+----------+
          |          |          |
      tRPC API    Uploads   SSE Streams
      (/api/trpc) (/uploads) (/api/*-events)
          |
          v
      MySQL Database
```

Drizzle Studio is completely isolated and executed on demand:
```
npm run db:studio
   └── Drizzle Studio (port 4983 default / independent)
```

---

## 4. Files Modified

The remediation modified only the exact set of authorized files:

1. `backend/_core/index.ts` — Updated default port from `3000` to `4000`, bounded fallback scan `4000–4004`.
2. `scripts/dev.mjs` — Rewrote launcher to orchestrate exactly 2 processes (backend first, then frontend), pass `VITE_API_PORT`, manage child lifecycle, and avoid Drizzle Studio.
3. `vite.config.ts` — Configured dynamic proxy target resolution via `process.env.VITE_API_PORT || process.env.PORT || "4000"` for `/api` and `/uploads`.
4. `backend/ai/assessmentService.ts` — Corrected typo `Sysmpotms` to `symptoms`.
5. `backend/ai/assessmentService.test.ts` — Corrected typo `Sysmpotms` to `symptoms` in mock response and assertion.
6. `.env.example` — Added complete, categorized documentation of real environment variables with safe dummy placeholders.

---

## 5. Port Strategy

- **Frontend Normal Port**: `5173`
- **Frontend Fallback Range**: `5173–5177`
- **Backend Normal Port**: `4000`
- **Backend Fallback Range**: `4000–4004`

### Preferred-Port-First Algorithm
1. The launcher checks if the preferred port (`4000` for backend, `5173` for frontend) is available.
2. If available, it is immediately selected.
3. If occupied, it tests sequential candidate ports (`4001`, `4002`, etc., and `5174`, `5175`, etc.).
4. If all ports in the bounded range are occupied, execution halts with a descriptive error:
   `[Port Discovery Error] All ports in range <START>-<END> for <LABEL> are currently occupied. Please free up a port in the range <START>-<END>.`

---

## 6. Vite Proxy

In `vite.config.ts`, the proxy target dynamically reads:
```typescript
const API_PORT = process.env.VITE_API_PORT || process.env.PORT || "4000";
const target = `http://localhost:${API_PORT}`;
```
Proxied routes:
- `/api`: Proxied to `target` with `changeOrigin: true` and `ws: true`.
- `/uploads`: Proxied to `target` with `changeOrigin: true`.

Frontend client code preserves relative paths (e.g., `/api/trpc`, `/api/patient-events`, `/api/doctor-events`), ensuring no hardcoded ports or URLs in client-side source code.

---

## 7. Backend

- **PORT Handling**: Defaults to `4000`. If `process.env.PORT` is explicitly set, it respects that configuration.
- **Port Discovery**: Uses `findAvailablePort(preferredPort)` with start default `4000` and scans up to `4004`.
- **Informative Logging**: Logs `Port ${preferredPort} is busy, using port ${port} instead` when falling back.
- **Fallback UI**: The standalone API index page (`/`) clearly reflects the active port and displays a link to the frontend at `http://localhost:5173`.

---

## 8. Process Launcher

`scripts/dev.mjs` orchestrates process lifecycles safely:
- **Startup Order**:
  1. Detects available backend port (`4000–4004`).
  2. Detects available frontend port (`5173–5177`).
  3. Injects `PORT` and `VITE_API_PORT` into the child process environment.
  4. Spawns Backend: `cross-env NODE_ENV=development tsx watch backend/_core/index.ts`.
  5. Spawns Frontend: `npx vite --port <FRONTEND_PORT>`.
- **Crash Handling**: Monitors `backendChild` and `frontendChild` exit events. If any child exits unexpectedly with a non-zero code or unexpected signal, it reports:
  `[<Process>] Exited with code <code> (signal: <signal>).`
- **Graceful Shutdown**: On `SIGINT` (Ctrl+C) and `SIGTERM`, `stopProcesses()` executes targeted process termination:
  - On Windows: `taskkill /pid ${child.pid} /T /F` kills only the specific child process tree.
  - On Unix: `child.kill("SIGTERM")`.
  - Global `taskkill /F /IM node.exe` is **never** executed.

---

## 9. Drizzle Studio

- `npm run dev` **does NOT start Drizzle Studio**.
- Drizzle Studio remains strictly independent and accessible via its existing script in `package.json`:
  `npm run db:studio` (invokes `drizzle-kit studio --config database/drizzle.config.ts`).

---

## 10. AI Typo

The spelling error `Sysmpotms` was corrected to `symptoms` in:
- `backend/ai/assessmentService.ts` (Line 93: guidance prompt string).
- `backend/ai/assessmentService.test.ts` (Line 86 and Line 102: mock payload and expectation assertion).

No triage rules, clinical heuristics, severity scoring, or urgency logic were altered.

---

## 11. Environment Configuration

`.env.example` was updated with complete documentation and safe placeholders:

| Variable | Purpose | Classification | Safe Example Value |
|---|---|---|---|
| `PORT` | Backend HTTP port | Developer Configurable | `4000` |
| `DATABASE_URL` | MySQL connection string | Developer Configurable | `mysql://root:password@localhost:3306/lifelink` |
| `JWT_SECRET` | Session token signing secret | Developer Configurable | `your-development-jwt-secret-min-32-chars` |
| `LIFELINK_DEMO_DOCTOR_ACCESS_CODE` | Clinician onboarding access code | Developer Configurable | `lifelink-controlled-clinician-secret-key-2026` |
| `GEMINI_API_KEY` | Google Gemini API key for symptom triage | Developer Configurable | `your-gemini-api-key-here` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth Client ID | Developer Configurable | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth Client Secret | Developer Configurable | `your-google-client-secret` |
| `AUTH_PUBLIC_BASE_URL` | Public origin for OAuth callbacks | Developer Configurable | `http://localhost:5173` |
| `VITE_API_PORT` | Backend port target for Vite proxy | **Runtime-Generated by Launcher** | `4000` (auto-injected; do not set manually) |

No real secrets or production credentials were included.

---

## 12. API Verification

- **Endpoint**: `/api/trpc`
  - Verified via Vite proxy: `GET http://localhost:5173/api/trpc/auth.providers`.
  - Response: Status `200 OK`, valid JSON response `{ "result": { "data": { "json": { "google": true, ... } } } }`.
  - Confirmed proxy forwarding from Vite (5173) to Express backend (4000).
- **Endpoint**: `/uploads`
  - Verified via Vite proxy: `GET http://localhost:5173/uploads/`.
  - Response: Status `404` served cleanly by Express static middleware (confirming proxy path reachability without 502/504 gateway errors).

---

## 13. SSE Verification

- **Endpoints**: `/api/patient-events` and `/api/doctor-events`
  - Verified via Vite proxy: `GET http://localhost:5173/api/patient-events` and `GET http://localhost:5173/api/doctor-events`.
  - Both endpoints returned `401 Unauthorized` with `Content-Type: application/json; charset=utf-8` when called without authentication, confirming request forwarding to backend route handlers and active authentication enforcement.
  - Vitest deep audit realtime test suite (`backend/realtime/security.realtime.test.ts`) verified 32 realtime security cases, including stream header verification (`text/event-stream`, `keep-alive`, `no-cache`), event isolation, event delivery, and client disconnect handling.

---

## 14. Authentication Verification

- **Server-Level Auth Contracts**: All authentication and session persistence mechanisms (`nativePatientAuth`, `doctorAuth`, `simultaneousAuth`, `auth.logout`, `security.idor`) passed automated verification.
- **Browser Authentication Verification**:
  ```
  Browser authentication verification: NOT VERIFIED
  ```
  *Note: End-to-end interactive browser authentication verification was not performed in a headless browser because the Playwright driver environment is unavailable in this runtime container.*

---

## 15. Port Fallback Tests

All four fallback scenarios were verified using isolated port discovery execution:

| Scenario | Frontend | Backend | Proxy Target | Result |
|---|---|---|---|---|
| **CASE 1**: 5173 available, 4000 available | `5173` | `4000` | `http://localhost:4000` | **PASS** |
| **CASE 2**: 4000 occupied | `5173` | `4001` | `http://localhost:4001` | **PASS** |
| **CASE 3**: 5173 occupied | `5174` | `4000` | `http://localhost:4000` | **PASS** |
| **CASE 4**: 5173 and 4000 occupied | `5174` | `4001` | `http://localhost:4001` | **PASS** |

Range exhaustion tests for `4000–4004` and `5173–5177` were also verified: both throw actionable descriptive errors.

---

## 16. Automated Verification

All automated verification commands were executed and recorded:

1. **AI Assessment Test**:
   ```
   npx vitest run backend/ai/assessmentService.test.ts
   Result: 17 passed (17 tests) in 523ms — PASS
   ```

2. **Full Test Suite**:
   ```
   npx vitest run
   Result: 33 test files passed, 185 tests passed, 1 skipped, 0 failed — PASS
   ```

3. **TypeScript Typecheck**:
   ```
   npx tsc --noEmit
   Result: 0 errors — PASS
   ```

4. **Production Build**:
   ```
   npm run build
   Result: Vite build and esbuild bundle succeeded — PASS
   ```

---

## 17. Runtime Verification

- **Normal Frontend URL**: `http://localhost:5173/`
- **Normal Backend URL**: `http://localhost:4000/`
- **Startup Output**: Verified launcher banner:
  ```
  =======================================================
    🚀 LifeLink Smart Healthcare Assistance Platform
    LifeLink dev server running at http://localhost:4000
    [Backend]  API Engine:      http://localhost:4000
    [Frontend] Vite Client:     http://localhost:5173
  =======================================================
  ```
- **Fallback Verification**: Tested and confirmed dynamic assignment to `4001` and `5174` with automatic proxy redirection when preferred ports were held.
- **Shutdown**: Verified that cancelling the launcher terminates both child processes immediately and frees all listening ports.

---

## 18. Data & Security Safety

The remediation strictly observed all safety constraints:
- **No Database Reset**: No `DROP`, `TRUNCATE`, or database migration commands executed.
- **No Data Deletion**: No records in `users`, `patients`, `doctors`, `appointments`, or `prescriptions` were deleted or altered.
- **No Auth Bypass**: Session cookies, JWT signing, and route-level authentication remain strictly intact.
- **No Authorization Weakening**: IDOR and clinician RBAC guards remain untouched.
- **No Fake Healthcare Data**: No artificial records seeded.
- **No Security Weakening**: CORS, CSP, and Vite proxy sanitization preserved.

---

## 19. Browser Environment

- **Status**:
  ```
  Browser verification: NOT VERIFIED
  Infrastructure limitation: Playwright driver environment unavailable
  ```
- The absence of browser automation is purely an environment constraint; all underlying frontend build artifacts, static bundles, and server-side tRPC endpoints verified successfully.

---

## 20. Remaining Findings

- No unresolved functional, build, or typecheck issues exist.
- Drizzle Studio remains available via `npm run db:studio` as intended.
- `providerAuth.test.ts` contains 1 intentionally skipped test (`accepts the configured server-only Google client credentials`) which runs only when `RUN_PROVIDER_AUTH_TESTS=true` is set with live Google credentials.

---

## 21. Final Verdict

```
PASS WITH FINDINGS
```
*(Verdict is PASS WITH FINDINGS strictly because browser-driven E2E verification is unverified due to the unavailable Playwright browser driver in this environment, while all automated tests, typechecks, builds, API proxies, SSE endpoints, and port orchestration verified with 100% success).*
