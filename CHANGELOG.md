# Changelog

All notable changes to the LifeLink Smart Healthcare Platform will be documented in this file.

## [1.0.0] - 2026-09-10

### Added
- **Liquid-Glass Design System**: Integrated translucent glassmorphism surfaces (ackdrop-filter: blur(24px)) across all patient and doctor dashboards.
- **Dual-Session Authentication**: Simultaneous login for patients and doctors using isolated HTTP-only cookies.
- **5-Layer AI Assessment Engine**:
  - Layer 1: Biological and physiological sanity validation.
  - Layer 2: Deterministic emergency regex overrides (e.g., chest pain, stroke signs).
  - Layer 3: Gemini Flash AI cascade with structured clinical confidence scoring.
  - Layer 4: Pediatric and adolescent safety limits.
  - Layer 5: Offline fallback triage matrix.
- **Doctor Portal**: Real-time consultation queue, patient record review, and appointment scheduling.
- **Single-Port Architecture**: Unified dev/prod server on port 3000 with automatic fallback scanning.

### Security
- Inactivity countdown and 5-minute auto-logout.
- bcrypt credential hashing with strict validation.

## [0.5.0] - 2026-08-15

### Added
- Patient intake form with symptom assessment questionnaires.
- Doctor dashboard wireframes and appointment booking logic.
- Initial Gemini API triage integration.

## [0.1.0] - 2026-07-20

### Added
- Initial project scaffolding with Vite, React, and Express.
- Drizzle ORM database schema definition.
