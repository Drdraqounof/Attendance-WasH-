# Leave Accrual & Restorative-Process Follow-Up

Status: **Not built — explicitly scoped as follow-up work (2026-09-15).**

## Why this exists

`docs/WCL_Attendance_Policy_AttendPoint_Reference.pdf` (the official, effective Wash Cycle Laundry Hourly Attendance & Leave Policy) describes two areas this app does not implement yet. They were deliberately left out of the 2026-09-15 policy-engine realignment (see `docs/planning/points-system-brd.md`'s note at the top and `docs/policy/policy-thresholds-editing.md`) because each is a materially larger feature than a constant/threshold change — a new data model, in the first case, and a new stateful workflow, in the second. This document scopes both so the gap doesn't silently reappear.

## 1. Leave-type accrual & balances (policy PDF §2)

The policy defines 4 leave types with accrual rates, caps, and carryover rules:

| Leave Type | Paid? | Accrual | Cap | Carryover |
|---|---|---|---|---|
| Sick | Paid | 1 hr / 30 hrs worked | 40 hrs/year | Up to 40 hrs |
| Personal | Unpaid | 4 hrs/month | 48 hrs/year | — |
| Vacation | Paid | 1 hr / 40 hrs worked (+0.25 hr/40 hrs after 3rd & 5th anniversaries) | 80 hrs/year | Up to 80 hrs |
| Bereavement | Paid | Up to 3 days/year | 3 days/year | No carryover |

None of this exists in `src/db/schema.ts` today — no leave-type tables, no accrual/balance columns on `employees`. It also interacts directly with the point system: per policy PDF §3, an unplanned absence with notice avoids points only if available Sick or Personal leave covers the *entire* missed time — so accurate point-avoidance logic needs real leave balances, not just a notice flag.

**Scope for a future pass:**
- New schema: a `leave_balances` (or per-type) table tracking accrued/used/carried-over hours per employee per leave type, plus the accrual-rate logic itself (hours-worked-driven for Sick/Vacation, calendar-driven for Personal/Bereavement).
- Wire `src/lib/policy-queries.ts::recordPointEvent` (or a new "record absence" flow) to check available leave before deciding whether a with-notice unplanned absence gets points at all — today, `EscalationRuleCode`'s `late_*_notice`/`absence_notice` codes are chosen by the caller with no leave-balance check.
- UI for viewing/adjusting balances, likely on the employee profile page.

## 2. Restorative process / PIP workflow (policy PDF §7)

The policy describes a distinct, **management-discretion, written-only** process — separate from simply crossing the 16-point termination threshold:

- Offered at management's sole discretion, always in writing (never a verbal cancellation).
- Options include: maintain perfect attendance for a defined period, cover a defined number of co-workers' call-outs, switch to a less popular shift/day, or a restorative justice / circle process.
- Successful completion can **cancel points** — an explicit downward adjustment tied to a specific written plan and its outcome, not an ad hoc note.

Today, the closest equivalent is the manual status-changer (`src/app/dashboard/people/[id]/status-changer.tsx` → `src/lib/policy-queries.ts::setEmployeeStatus`), which lets a manager move an employee to any point band with a required reason note. That's a generic point adjustment, not the policy's specific offer/track/complete/cancel workflow.

**Scope for a future pass:**
- New schema: a `restorative_plans` table (employee, plan type, terms, offered-by, offered-at, status: offered/in-progress/completed/failed, points-to-cancel-on-completion).
- A written-offer UI (mirrors the existing "reason note" pattern, but as a distinct, trackable record rather than a point-ledger reason string).
- Completion logic that inserts the point-cancellation as an auditable `pointEvents` row (same ledger-it-don't-erase-it pattern already used by `setEmployeeStatus`), linked back to the plan record.
