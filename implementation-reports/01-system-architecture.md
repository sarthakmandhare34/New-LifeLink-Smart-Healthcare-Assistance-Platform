# 01. System Architecture & Tech Stack

## 1. Executive Summary

LifeLink is an integrated, full-stack healthcare platform engineered to provide patient-owned health records, a 5-layer clinical AI decision support system, and a dedicated clinician workspace. The platform operates on a single-port architecture during development and production, bridging a modern React 19 single-page application with a type-safe Express and tRPC backend backed by MySQL.

---

## 2. High-Level Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                  │
│  React 19 • TypeScript 5.9 • Vite 7 • Tailwind CSS v4 • Lucide Icons    │
│  Hybrid Design: Liquid-Glass Tokens + WCAG 2.1 AA Clinical Aqua Palette │
│  React Router 7 • TanStack React Query v5 • Leaflet OSM Integration     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / tRPC / Server-Sent Events
┌────────────────────────────────────▼────────────────────────────────────┐
│                        Application Server Layer                         │
│     Node.js 22 • Express 4.21 • tRPC 11 • Server-Sent Events (SSE)      │
│     Dual-Cookie Session Context (app_session_id & doctor_session_id)   │
│     Single Port 3000 Integration (Vite Middleware in Development)       │
└─────────────────┬──────────────────────────────────────┬────────────────┘
                  │                                      │
┌─────────────────▼───────────────────┐┌─────────────────▼─────────────────┐
│        MySQL Database Layer         ││     External AI & Services       │
│  MySQL 8.x • Drizzle ORM 0.44       ││  Google Gemini Flash Cascade     │
│  Type-Safe Schema & Cascade Deletes ││  0ms Deterministic Safety Guard │
└─────────────────────────────────────┘└──────────────────────────────────┘
```

---

## 3. Technology Stack Breakdown

### Frontend Tier
* **Core Framework**: React 19 (`react`, `react-dom`) leveraging functional components and hooks.
* **Language**: TypeScript 5.9 configured with strict type-checking (`noImplicitAny`, strict null checks).
* **Build System**: Vite 7 with Fast Refresh and native ESM bundling.
* **Styling & Design System**:
  - **Liquid-Glass Design System**: CSS custom properties (`--liquid-panel`, `--liquid-edge`, `--liquid-shadow`), 117° iridescent border shimmers, and hardware-accelerated `backdrop-filter: blur(24px) saturate(155%)`.
  - **Clinical Aqua Palette**: High-contrast `#E6F9FC` background, `#9FFBFF` border, `#00C4CC` primary interactive teal, and `#102B2D` slate typography ensuring WCAG 2.1 AA accessibility compliance.
  - **Utility Primitives**: Tailwind CSS v4 paired with Radix UI headless components and Lucide icons.
* **Client State & Cache**: `@tanstack/react-query` orchestrated through `@trpc/react-query` for end-to-end type safety.
* **Geospatial Mapping**: Leaflet and React-Leaflet rendering OpenStreetMap tiles in a privacy-bounded, client-only session.

### Backend Tier
* **Server Runtime**: Node.js (ES Modules mode) running Express 4.21.
* **API Protocol**: tRPC 11 providing end-to-end typed RPC procedures without manual OpenAPI code generation.
* **Session Middleware**: Dual-cookie authentication parser in `backend/_core/context.ts` extracting `app_session_id` (Patient) and `doctor_session_id` (Clinician) independently.
* **Realtime Engine**: Native Server-Sent Events (SSE) broadcaster in `backend/realtime/eventBus.ts` providing instant UI synchronization across appointments, triage assessments, and prescriptions.

### Persistence Tier
* **Database**: MySQL 8.x relational database.
* **ORM & Query Builder**: Drizzle ORM 0.44 providing type-inferred query definitions and migration tooling via Drizzle Kit.
* **Schema Integrity**: Relational constraints with foreign keys enforcing `onDelete: cascade` across credentials, profiles, assessments, appointments, medicines, emergency contacts, and prescriptions.

### AI Decision Support Tier
* **LLM Engine**: Google Gemini Flash API (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-2.5-flash`, `gemini-1.5-flash`) invoked server-side only with strict JSON Schema generation.
* **5-Layer Safety Guardrails**:
  1. Biological Consistency Validation (`shared/biologicalValidation.ts`)
  2. 0ms Deterministic Emergency Regex Override (`hasEmergencyPattern`)
  3. Structured Google Gemini Flash Execution with JSON Schema
  4. Post-Processing Safeguards (Pediatric <18 routing, adolescent reassurance, non-medical input rejection)
  5. Deterministic Safe Offline Fallback

---

## 4. Architectural Boundaries & Data Flow

1. **Client-Server Boundary**: All browser communications route through `/api/trpc` or the `/api/realtime/events` SSE stream. No database or AI credentials ever leak to the browser.
2. **Session Isolation**: Patient operations derive identity strictly from `ctx.user.id`; Doctor operations derive identity strictly from `ctx.user.openId`, preventing cross-tenant data tampering (IDOR).
3. **Fail-Safe Fallbacks**: If upstream LLMs fail or encounter quota restrictions, the system smoothly falls back across the Gemini Flash model cascade to a deterministic safe offline triage response.
4. **Single-Port Runtime**: Development and production execute on port 3000 (with automated scanning up to 3004), proxying Vite client requests through Express middleware.
