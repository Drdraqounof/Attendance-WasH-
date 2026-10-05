# AttendPoint — System Overview

AttendPoint is an **Automated Attendance Notification & Attendance Point System** for operations managers and supervisors.

## Purpose

Frontline teams often report attendance by SMS. AttendPoint converts those messages into **live attendance risk scores** so managers can see who is at risk, who is clear, and where to intervene — without digging through inboxes.

## Core ideas

- **Intake**: Attendance signals arrive via SMS (and related channels).
- **Scoring**: Messages map to attendance points / risk scores against policy rules.
- **Visibility**: Managers get a calm, professional dashboard focused on risk, not noise.
- **Notification**: Escalations and summaries keep supervisors ahead of shift issues.

## Current app surfaces

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Marketing homepage | Public |
| `/capabilities` | Core features plus the live policy-engine point matrix and risk bands (reads `ESCALATION_RULES`/`POLICY_THRESHOLDS` directly) | Public |
| `/how-it-works` | The 5-step signal → risk → action flow, plus an FAQ | Public |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Sign-in and account flows | Public |
| `/login/workspace` | Role/station picker for users with more than one assignment | Signed in |
| `/dashboard` | Shift risk console (mock roster, metrics, intervene targets), filtered to the active station | HR, Supervisor |
| `/dashboard/people/[id]` | Employee profile: schedule, open points, ledger, live track record | HR, Supervisor (own station only) |
| `/analytics` | Floor analytics: trends, risk mix, teams, signal types | HR, Supervisor |
| `/insights`, `/insights/report` | DB-backed insights with an AI summary; PDF report builder | HR, Supervisor |
| `/map` | Fleet delivery routes (Leaflet + OSRM), full-screen mode; depot is the real Lynn plant, routes are demo | HR, Supervisor |
| `/settings` | Automation toggles, policy thresholds, escalation schedule | Edit: HR · View: Supervisor |
| `/profile` | Signed-in user's account and role assignments | Signed in |

## Dashboard (demo)

After sign-in, `/dashboard` shows an **ops floor risk console**:

- Live status strip and shift meta (the active station, day shift)
- Summary counts: at risk, watch, clear, open points today
- Priority roster sorted highest-risk first — **names link to person profiles**
- Intervene-now list for the top at-risk employees (also links to profiles)
- Mock data only — SMS intake is not connected yet

Risk bands (policy PDF §5, rolling 12-month points): **Clear** 0, **Low** 1–3, **Elevated** 4–7, **At risk** 8–11, **Critical** 12–15, **Termination threshold** 16+.

## Person profile (demo)

`/dashboard/people/[id]` shows:

- Open points and progress toward policy cap
- This week’s schedule (shift times + status: worked, late, absent, etc.)
- Points ledger (SMS / policy / supervisor events)

## Analytics (demo)

`/analytics` shows floor-level patterns:

- Summary metrics and 7-day points trend
- Risk distribution and risk-by-team table
- Signal mix from point ledgers
- Highest open-points list (links to person profiles)

Header nav on ops pages: **Dashboard** · **Analytics** · **AI Insights** · **Map** · **Settings**, plus a role/station badge (with **Switch** when the user has more than one assignment), notifications, Profile and Sign out. On phones, the nav sits on its own horizontally scrolling row.

## Auth note

Each user signs in with their own account. That creates a per-user session (httpOnly `ap_session` cookie; its sha256 is stored in `sessions`). Users work under an assigned role, **HR** or **Supervisor**, at a **station**, and every page and API route is scoped to that choice. Registration and password reset are self-service.

- Sign-in, registration, reset: [docs/auth/authentication.md](../auth/authentication.md)
- Roles, stations, permission matrix, audit log: [docs/auth/roles-and-stations.md](../auth/roles-and-stations.md)
