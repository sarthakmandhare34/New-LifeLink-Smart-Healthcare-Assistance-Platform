# 05. Local Development, Ports & Operations

## Ports Configuration & Fallback Rules

| Service | Primary Port | Backup / Fallback Behavior |
| :--- | :--- | :--- |
| **Main Application** (Frontend + Backend) | **`3000`** | Automatically scans and uses `3001`–`3004` if `3000` is busy. |
| **MySQL Database** | **`3306`** | Configured via `DATABASE_URL` in `.env`. Change port to `3307` / `8889` if needed. |
| **Drizzle Studio UI** | **`4983`** | Automatically increments (e.g. `4984`, `4985`) if busy. |

## Quick Commands Reference

* **Start Full Application**:
  ```bash
  npm run dev
  ```
  Launches the complete React frontend and Express backend unified on `http://localhost:3000`.

* **Clear & Re-Seed Doctor Directory**:
  ```bash
  npx tsx scripts/seed-doctors.ts
  ```
  Wipes old patient test accounts and restores the default 12 Mumbai specialist accounts with login credentials.

* **Open Visual Database Studio**:
  ```bash
  npm run db:studio
  ```
  Opens Drizzle Studio UI at `https://local.drizzle.studio` (or `http://localhost:4983`).

* **Run Full Validation Suite**:
  ```bash
  npm run verify
  ```
  Runs TypeScript compiler check (`tsc --noEmit`), Vitest suite (80+ unit and integration tests), and production bundle generation.
