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

| Route                      | Role                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `/`                        | Marketing homepage                                                   |
| `/login`                   | Mock manager sign-in (demo credentials)                              |
| `/dashboard`               | Demo shift risk console (mock roster, metrics, intervene targets)    |
| `/dashboard/people/[id]`   | Employee profile: schedule, open points, points ledger               |
| `/analytics`               | Floor analytics: trends, risk mix, teams, signal types               |

## Dashboard (demo)

After demo sign-in, `/dashboard` shows an **ops floor risk console**:

- Live status strip and shift meta (demo floor / day shift)
- Summary counts: at risk, watch, clear, open points today
- Priority roster sorted highest-risk first — **names link to person profiles**
- Intervene-now list for the top at-risk employees (also links to profiles)
- Mock data only — SMS intake is not connected yet

Risk bands (demo): **At risk** ≥ 6 points, **Watch** 3–5, **Clear** 0–2.

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

Header nav on ops pages: **Dashboard** · **Analytics**.

## Auth note

Demo mode only: any nonempty credentials (or “demo access”) set cookie `ap_demo=1` and redirect to `/dashboard`. No real identity provider yet.
