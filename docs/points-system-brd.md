# Attendance Points System — BRD & Implementation Roadmap

Status: **Phase 1 implemented (2026-09-03), thresholds clarified (2026-09-06)** — the policy engine, schema, and seed data below are live. Phases 2–7 (notifications, Zoho, Zoom SMS, anniversary reset, reporting page, CSV export) are still requirements only.
This document has two parts: (1) the business requirements as provided, and (2) a phased engineering roadmap grounded in the app's actual current codebase (Next.js 16, Drizzle ORM, Neon Postgres).

**2026-09-06 update:** the 10-point and 16-point thresholds were clarified — 10 points requires a formal **meeting** between the employee and their manager (not just a generic "action plan" flag), and 16 points places the employee on a **Performance Improvement Plan (PIP)**, not a termination/final-review flag. Part 1 §2 and the implementation below reflect this.

---

## Part 1 — Business Requirements

### 1. Core Points Architecture

- **Point cap:** 16 points maximum.
- **Scoring logic:** Inverse point system — lower points are better. 0 points = perfect attendance.
- **Point penalty schedule** (escalating):

| Points | Infraction |
|---|---|
| 1 | Minor tardy / minor infraction |
| 2 | Moderate tardy / unexcused partial shift |
| 4 | Severe late arrival or unexcused shift absence |
| 8 | No-call, no-show / major infraction |

This is a **deduction-only model**: points start at 0 and only increase via the schedule above. There is no bonus/positive-point offset in this version.

### 2. Policy Thresholds & Automated Workflows

| Point Threshold | Triggered Action | Automated System Output |
|---|---|---|
| 2 Points | Verbal Warning | Auto-trigger notification to Manager/Supervisor to conduct a verbal conversation. Logged in system. |
| 10 Points | Required Manager Meeting | Auto-flag employee profile; require a formal attendance meeting between the employee and their manager/supervisor. |
| 16 Points | Performance Improvement Plan (PIP) | Place the employee on a formal PIP and notify HR — a corrective action step, not automatic termination. |

### 3. Integrations & Data Sources

```
+-------------------+      +-------------------------+      +--------------------------+
|  Zoho Shifts API  | ---> |  Attendance App Engine  | ---> |  Zoom SMS / Comm Engine  |
|  (Time & Shifts)  |      |  (Points & Logic Rules) |      | (Supervisor Notifications|
+-------------------+      +-------------------------+      +--------------------------+
```

- **Zoho Shifts integration:** Ingest real-time clock-in, clock-out, schedule adherence, and shift-miss data from Zoho Shifts to calculate point accruals automatically.
- **Zoom SMS communications:**
  - Auto-send SMS notifications to supervisors when employees hit thresholds (2 or 10 points).
  - In-app feature to directly contact a supervisor via SMS/call for attendance escalations.

### 4. Reset & Anniversary Rules

- **1-year anniversary reset:** System automatically resets active attendance points to zero on the employee's 1-year employment anniversary date.
- **Rolling window:** Multi-year anniversary resets must not purge historical audit logs — the point history stays intact even after a reset.

### 5. Analytics & Managerial Reporting

**Filters:**
- Time period: custom date range, month-to-date, year-to-date, custom rolling periods.
- Supervisor / location filter: team, department, shift, or direct manager.

**KPIs:**
- Warning counts — total active verbal warnings issued across teams.
- Warning distribution — warnings per staff member / per manager over the selected time frame.
- Manager-meeting tracking — count of employees currently required to have the 10-point manager meeting.
- PIP tracking — count of employees currently on a Performance Improvement Plan (16-point cap).
- Risk radar — employees approaching the 16-point cap.

### 6. Data Export

- One-click CSV export for HR and Payroll processing.
- Export fields: Employee ID, Employee Name, Current Points, Active Warnings Count, PIP Status, Last Infraction Date, Anniversary Date.

---

## Part 2 — Reconciliation Against the Codebase (as of 2026-09-06)

This wasn't a greenfield feature — the schema already had real infrastructure for it, only partially wired up. Phase 1 (below) has since closed most of that gap; this section now reflects the **current, implemented** state rather than the original pre-Phase-1 plan.

**Live in `src/db/schema.ts` today:**
- `employees` — `points` + `policyCap`, defaulting to **16** for real (Neon-backed) rows, seeded explicitly from `POLICY_CAP` in `src/db/seed.ts`. (`people-mock.ts`'s separate `policyCap: 12` field still feeds the legacy mock-driven pages — see below.)
- `pointEvents` — the ledger (`employeeId`, `date`, `delta`, `reason`, `source`, plus a nullable `ruleCode` added in Phase 1 for traceability). Insert-only by convention — the audit trail the (still-unbuilt) anniversary-reset rule will depend on.
- `pointRules` — `code`/`points`/`active` were added in Phase 1 and are populated for the four real escalation rules (`minor_tardy`, `moderate_tardy`, `severe_late_absence`, `nc_ns_major`); the legacy positive/deduction display rows (for `/settings`, `/profile`) are unchanged and have `code = null`.
- `policyThresholds` — new in Phase 1: `verbal_warning` (2pt), `manager_meeting` (10pt), `pip` (16pt).
- `warnings` — new in Phase 1: a stateful `open`/`acknowledged`/`resolved` record per threshold crossing, distinct from the raw `attendanceAlerts` feed.

**Model, as implemented:** deduction-only, inverse scoring (0 = perfect), 16-point hard cap, the four-tier 1/2/4/8 escalation schedule, three automated-workflow thresholds (2pt verbal warning, 10pt required manager meeting, 16pt PIP — see the 2026-09-06 update above). All of it lives in `src/lib/policy-engine.ts` (pure logic) + `src/lib/policy-queries.ts` (Drizzle read/write), and is exercised today by `/insights`' "Employees at risk" list.

Note: `docs/Attendance-Plan.md` describes an older, unrelated 100-point *subtractive* model (start at 100, subtract for infractions). That document is **superseded** by this BRD for anything points-related — kept for historical context, not deleted, but not current.

**Still not built (unchanged since Phase 1):**
- Zoho Shifts ingestion — no Zoho code/SDK anywhere in the repo.
- Zoom SMS dispatch — no SMS/Zoom code anywhere; `notification-bell.tsx` and the `automationToggles` settings are in-app UI stubs only, with no backend dispatch.
- The anniversary reset job — no scheduler exists in this app (no cron config).
- The managerial reporting page's specific filters/KPIs — `src/app/analytics/page.tsx` exists but is mock-data-driven and doesn't match this BRD's filter/KPI set.
- CSV export — no CSV code anywhere in the repo.
- The legacy mock-driven pages (`/dashboard`, `/analytics`, `/dashboard/people/[id]`) still run on `people-mock.ts`'s old 12-point model, untouched by Phase 1 — see Phase 6.

---

## Part 3 — Phased Implementation Roadmap

Locked decisions for this roadmap:
- **SMS provider:** Zoom SMS (already in use by the organization for tracking) — integration targets Zoom's SMS/Contact Center API specifically.
- **Point model:** deduction-only, per Part 1 — no positive/bonus rules carried forward.
- **Hosting:** Vercel — scheduled jobs (anniversary reset, any Zoho polling) use Vercel Cron Jobs.
- **Zoho product:** Zoho Shifts, confirmed. Webhook-vs-polling mechanism is still unknown — resolve with Zoho's docs/support before Phase 3 begins.

### Phase 1 — Policy Engine & Data Model Foundation ✅ Done

*Goal: make the 16-point escalating model the computational source of truth, independent of any integration.*

**Implemented 2026-09-03; threshold terminology updated 2026-09-06.** Delivered as planned below, plus notes:
- `src/db/seed.ts` seeds the real `employees.policyCap` from `POLICY_CAP` (16), not from `people-mock.ts`'s `policyCap` field — that mock field stays at 12 on purpose, since it only feeds the legacy mock-driven pages (`/dashboard`, `/analytics`, `/dashboard/people/[id]`), which are unchanged in this phase (see Phase 6).
- `src/lib/insights-queries.ts::employeesAtRisk` (the one real DB-backed page, `/insights`) now uses `policy-engine.ts`'s `riskLevelFromPoints` instead of the old `dashboard-mock.ts` `RISK_THRESHOLDS`, and surfaces an "On PIP" badge for anyone at the 16-point cap. Migration `drizzle/0001_open_slayback.sql` applied and the database reseeded.
- The `policyThresholds` key at 10 points is `manager_meeting` (was `action_plan`) and at 16 points is `pip` (was `final_review`) — renamed to match the 2026-09-06 clarification; `RiskLevel`'s `"pip_flag"` value (was `"termination_flag"`) and `isPipFlag` (was `isTerminationFlag`) follow the same rename across `policy-engine.ts`, `policy-queries.ts`, and `insights-queries.ts`.

- Migrate `employees.policyCap` default 12 → 16.
- Add `pointRules.code` (unique text) + `pointRules.points` (integer) + `pointRules.active` (boolean); seed the four escalation codes: `minor_tardy=1`, `moderate_tardy=2`, `severe_late_absence=4`, `nc_ns_major=8`. Skip positive-rule seeding (deduction-only).
- New `policyThresholds` table: `key`, `pointValue` (2/10/16), `label`, `active` — admin-editable thresholds instead of hardcoded numbers.
- New `warnings` table: `employeeId`, `thresholdKey`, `pointsAtTrigger`, `status` (`open`/`acknowledged`/`resolved`), `createdAt` — the stateful record the KPIs in Part 1 §5 need.
- `pointEvents.ruleCode` (nullable) — traceability for new events without rewriting history.
- **New files:** `src/lib/policy-engine.ts` (pure functions: `pointsForRule`, `applyPointEvent`, `thresholdsCrossed`), `src/lib/policy-queries.ts` (transactional Drizzle writes, following the conventions in `src/lib/insights-queries.ts`).
- **Modify:** `src/lib/attendance-utils.ts` (cap 12→16), `src/db/seed.ts` (seed rules/thresholds), `docs/database.md`.
- **Tests:** `src/lib/policy-engine.test.ts` — threshold-crossing correctness, cap clamp at 16, and the multi-threshold-in-one-event edge case (open question below).

### Phase 2 — Automated Workflow Triggers & In-App Notifications

*Goal: wire threshold crossings to visible in-app notifications/logs, before any external SMS dependency.*

- First real API routes in the app: `src/app/api/point-events/route.ts` (manager-entered infractions), `src/app/api/warnings/route.ts` (list/update warning & action-plan status).
- `src/lib/notifications.ts` for in-app notification creation; update `src/components/notification-bell.tsx` to read real data instead of the current static mock state.
- **Decision needed at this phase:** no `employees.managerId` FK exists today. Assigning a notification to "the employee's supervisor" requires adding that mapping (or an interim "notify all managers" simplification).

### Phase 3 — Zoho Shifts Ingestion

*Goal: replace manual point entry as the primary point-accrual source.*

- `src/lib/integrations/zoho-shifts-client.ts` — lazy/soft-fail client, following the pattern in `src/lib/openai-client.ts`.
- Webhook route (`src/app/api/integrations/zoho/webhook/route.ts`) if Zoho Shifts supports push, otherwise a Vercel-Cron-triggered polling sync (`src/lib/integrations/zoho-shifts-sync.ts`) — **confirm which with Zoho before starting this phase.**
- `src/lib/integrations/shift-to-points.ts` — maps a shift-adherence record to a `pointRules.code`, then calls Phase 1's `recordPointEvent` (no duplicated deduction logic).
- Add `scheduleDays.sourceExternalId` for idempotent dedupe of webhook retries/backfills.
- Needs an employee-identity mapping between Zoho's IDs and `employees.id`/`employeeCode`.

### Phase 4 — Zoom SMS Dispatch & Escalation UI

*Goal: automated supervisor SMS at the 2pt/10pt thresholds, plus a manual "contact supervisor" escalation.*

- `src/lib/integrations/sms-client.zoom.ts` — Zoom SMS/Contact Center API client, lazy/soft-fail pattern, env-var configured. Confirm the exact API surface/product tier with Zoom before implementation (their SMS capability lives in Zoom Contact Center, a separate license from core Zoom Meetings).
- Extend `src/lib/notifications.ts`: on a `verbal_warning` (2pt) or `manager_meeting` (10pt) crossing, dispatch SMS to the employee's supervisor.
- New `src/app/api/escalate/route.ts` + `src/components/escalate-button.tsx` for the in-app manual escalation feature.
- **Data-sensitivity decision:** `managers.phoneMasked` is masked by design; real SMS dispatch needs an actual unmasked `managers.phone` field, resolved server-side only.
- New `notificationLog` table for outbound-SMS audit trail — don't reuse `pointEvents.source = 'SMS'`, which currently means *inbound* SMS-reported attendance signals, a different meaning than outbound dispatch logging.
- Flag for HR/legal: consent/opt-in and message-template review for supervisor SMS alerts (not addressed in Part 1).

### Phase 5 — Anniversary Reset Job

*Goal: automatic 1-year-anniversary point reset without purging history.*

- Vercel Cron entry (`vercel.json` `crons`) hitting `src/app/api/jobs/anniversary-reset/route.ts` (shared-secret protected), running daily.
- For each employee whose `hireDate` anniversary is today: insert a `pointEvents` row (`delta = -currentPoints`, `reason = "Anniversary reset"`), update `employees.points = 0`. Never deletes rows — ledger-based, audit trail preserved.
- Add `employees.lastResetAt` to prevent double-firing on reruns.
- `src/lib/policy-queries.ts`: add `resetPointsForAnniversary(employeeId)`.
- Open question to confirm at this phase: recurring annual reset vs. one-time at year 1 only.

### Phase 6 — Analytics & Managerial Reporting Page

*Goal: the filters/KPIs from Part 1 §5, DB-backed.*

- New `src/app/reports/page.tsx` — modeled on the DB-backed pattern in `src/app/insights/page.tsx`, not the mock-driven `src/app/analytics/page.tsx`.
- `src/lib/reports-queries.ts`: `activeWarningCounts`, `warningDistributionByManager`, `pipEmployees`, `riskRadar` (employees ≥12 points, approaching 16) — querying Phase 1's `warnings`/`policyThresholds` tables directly.
- `src/components/reports-filter-bar.tsx` for filter controls.
- **Schema gap to resolve here:** `employees` has `team` but no `location`, `department`, or `managerId`. Confirm whether "location"/"department" map to existing `team`/`managers.floor`, or are new fields, and add `employees.managerId` if not already added in Phase 2.

### Phase 7 — CSV Export

*Goal: one-click CSV for HR/Payroll, matching Part 1 §6's field list exactly.*

- `src/app/api/reports/export/route.ts` (GET, streams CSV), reusing `reports-queries.ts` so the export and the UI never disagree on what counts as an "active warning" or "on a PIP."
- `src/lib/csv-export.ts` — plain string-join CSV serialization (no new dependency needed for 7 columns).
- `src/components/export-csv-button.tsx`.
- "Last Infraction Date" = `max(pointEvents.date)` filtered to `pointRules.category = 'deduction'`.
- Confirm access control: should export be restricted to an HR/payroll role, given `managers.role` is currently free text with no permission tiers?

---

## Open Questions

| # | Question | Blocks |
|---|---|---|
| 1 | ~~If a single event crosses two thresholds at once (e.g. an 8pt event moving 9→17) — does it fire both the 10pt and 16pt workflows, and does the score hard-clamp at 16?~~ **Resolved in Phase 1:** yes to both — `thresholdsCrossed()` fires every threshold in range and `applyPointEvent()` hard-clamps at 16 (`clampToCap`). See `policy-engine.test.ts`. | Phase 1 ✅ |
| 2 | Does the anniversary reset repeat every year, or only fire once at the 1-year mark? | Phase 5 |
| 3 | Are "location"/"department" new concepts, or existing `team`/`managers.floor` renamed? | Phase 6 |
| 4 | Does Zoho Shifts support outbound webhooks, or is polling required? | Phase 3 |
| 5 | What is the exact Zoom SMS API surface/product tier available to this org? | Phase 4 |
| 6 | Has HR/legal signed off on SMS consent and message-template wording for supervisor alerts? | Phase 4 |

---

## Verification Before Coding Begins

- Confirm this document's schema/file references still match `src/db/schema.ts`, `src/lib/attendance-utils.ts`, `src/lib/insights-queries.ts`, `src/lib/openai-client.ts`, and `src/db/seed.ts` (the codebase may have moved on since this was written).
- This document defines requirements and sequencing only — no migrations or feature code are included here. Phase 1 implementation starts only once this BRD is reviewed and approved.
