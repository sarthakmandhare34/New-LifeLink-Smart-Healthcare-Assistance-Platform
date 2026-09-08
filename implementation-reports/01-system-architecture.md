# 01. System Architecture & Tech Stack

## Overview
LifeLink is an integrated, full-stack patient healthcare-assistance platform and clinician workspace built for modern local and production deployment.

## High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  React 19 • TypeScript • Vite • Tailwind CSS • Lucide Icons │
│  CSS Liquid-Glass Design System • React Router • TanStack Q │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / tRPC / SSE
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Server                       │
│     Node.js • Express • tRPC 11 • Server-Sent Events (SSE)  │
│  Direct Port 3000 Integration (Vite Middleware + Backend)   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     MySQL Database Layer    ││    External AI & Services    │
│  MySQL 8.x • Drizzle ORM    ││  Google Gemini 2.5 Flash API │
│  Type-Safe Migrations       ││  Deterministic Safety Guard  │
└─────────────────────────────┘└──────────────────────────────┘
```

## Active Technology Stack
* **Frontend Framework**: React 19 (`react`, `react-dom`) with TypeScript 5.9.
* **Build & Dev Tooling**: Vite 7 with Express middleware integration (single-port runtime on `http://localhost:3000`).
* **Styling & UI**: Tailwind CSS v4, custom Liquid-Glass theme tokens, Radix UI primitives, Framer Motion.
* **API Communication**: tRPC 11 with TanStack React Query for end-to-end type safety.
* **Realtime Layer**: Native Server-Sent Events (SSE) for instant patient and doctor appointment updates.
* **Database**: MySQL with Drizzle ORM, schema type inference, foreign key relations with `onDelete: cascade`.
* **AI Engine**: Server-side Google Gemini 2.5 Flash integration with deterministic regex-based emergency pattern safety overrides.
* **Testing**: Vitest with unit and integration coverage for routers, authentication, and layout stability.
