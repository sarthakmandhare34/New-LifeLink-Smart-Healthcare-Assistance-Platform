# 05. Local Development, Operations & Port Configuration

## 1. Environment Configuration

LifeLink requires configuration via a `.env` file located in the root directory:

```env
# Database Connection (MySQL 8.x)
DATABASE_URL="mysql://root:password@localhost:3306/lifelink"

# Session Security Secret (Minimum 32 characters)
JWT_SECRET="your-development-jwt-secret-key-32-chars-min"

# Google Gemini AI Integration (Server-Side Only)
GEMINI_API_KEY="your-gemini-api-key"

# Optional: Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Port Configuration
PORT=3000
```

---

## 2. Ports Allocation & Conflict Resolution

LifeLink employs intelligent port management to eliminate development conflicts:

| Service | Primary Port | Conflict / Fallback Mechanism |
| :--- | :--- | :--- |
| **Main Full-Stack Server** (Vite + Express) | **`3000`** | Automatically tests port availability; scans and binds to **`3001`**, **`3002`**, **`3003`**, or **`3004`** if `3000` is in use. |
| **MySQL Database Engine** | **`3306`** | Defined via `DATABASE_URL` in `.env`. Update connection string if your MySQL instance uses `3307` or a Docker custom port. |
| **Drizzle Studio Visual UI** | **`4983`** | Automatically increments to **`4984`**, **`4985`**, etc., if occupied. |

---

## 3. Step-by-Step Local Initialization

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Provision MySQL Database
```powershell
# Idempotently creates the 'lifelink' database in MySQL if it doesn't already exist
npx tsx scripts/init-db.ts
```

### Step 3: Run Database Migrations
```powershell
# Generates and applies Drizzle schema migrations to MySQL
npm run db:push
```

### Step 4: Seed Doctor Directory & Sample Patients
```powershell
# Resets test patient data and provisions all 12 Mumbai specialist accounts
npx tsx scripts/seed-doctors.ts
```

### Step 5: Start Unified Development Server
```powershell
npm run dev
```

---

## 4. Interactive Dev Server Console Shortcuts (`scripts/dev.mjs`)

When running `npm run dev`, type any of the following single-character shortcuts into the terminal and press `Enter`:

* `r` ➔ Restart the dev server process.
* `u` ➔ Clear and re-seed the test doctor directory (`scripts/seed-doctors.ts`).
* `c` ➔ Clear the terminal console.
* `q` ➔ Gracefully shut down the server and exit.

---

## 5. Testing & Quality Verification

Run the verification suite before committing code:

```powershell
# 1. Type-Checking (Zero TypeScript Errors)
npm run check

# 2. Automated Test Suite (Vitest)
npm test

# 3. Production Build Validation
npm run build

# 4. Full End-to-End Pipeline (Check + Test + Build)
npm run verify
```
