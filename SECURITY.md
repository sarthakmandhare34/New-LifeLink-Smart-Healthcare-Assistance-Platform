# Security Policy - LifeLink Smart Healthcare Platform

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

As a healthcare assistance platform, data privacy and platform integrity are top priorities. If you discover a security vulnerability, please report it responsibly:

1. **Do not** report security vulnerabilities through public GitHub issues.
2. Email your findings directly to the maintainer.
3. Include detailed steps to reproduce, affected endpoints, and potential impact.
4. Reports are acknowledged within 48 hours.

## Architectural Security Measures

- **Dual-Session Isolation**: Completely separate cookie domains for patient (pp_session_id) and clinician (doctor_session_id) sessions.
- **Inactivity Guard**: Automatic session termination after 5 minutes of idle time.
- **Safe AI Triage**: Multi-layer safety net preventing AI hallucination during medical assessments (Biological validation + regex emergency overrides).
- **Password Security**: Passwords hashed using bcrypt with salt rounds.
- **Transport Security**: HTTPS and SameSite HTTP-only session cookies.
