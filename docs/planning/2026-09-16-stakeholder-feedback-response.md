# Stakeholder Feedback — Response & Status (2026-09-16)

Status: **Response document.** Answers the feedback list below against the app as it stands today, item by item — what's already done, what's a real gap, and where we need a decision before building. Nothing in this file is a commitment to scope; it's the starting point for prioritizing the next pass of work.

Legend: ✅ Already done · 🔧 Real gap, needs building · ❓ Needs a decision before we can build it · 📋 Already scoped as a later phase, no code yet

---

## Key feedback / improvements

### 1. Point cap at 16, with 8 already a meaningful risk level

**✅ Already done.** `POLICY_CAP = 16` in `src/lib/policy-engine.ts` — points never register above 16, and reaching it flags the employee at the termination threshold (see `riskLevelFromPoints`). 8 points already opens the "At Risk" band (written warning + unpaid suspension eligible) — one of the 5 bands between 0 and 16:

| Points | Band |
|---|---|
| 0 | Clear |
| 1–3 | Low |
| 4–7 | Elevated |
| 8–11 | **At Risk** |
| 12–15 | Critical |
| 16+ | Termination threshold |

All 5 thresholds are editable from `/settings` if these exact cut lines ever need to move.

### 2. Point values should be 1, 2, 4, or 8 only

**✅ Already done, with one thing worth confirming.** Every rule in the escalation schedule (`ESCALATION_RULES`) scores a delta of 1, 2, 4, or 8 — nothing outside that set:

| Rule | Points |
|---|---|
| Late 15min–1hr — with notice | 1 |
| Late 15min–1hr — without notice | 2 |
| Late 1–3hr — with notice | 2 |
| Late 1–3hr — without notice | 4 |
| Absent or late 3hr+ — with notice | 4 |
| Absent or late 3hr+ — without notice | 8 |
| Written warning — non-attendance issue | 4 |

**❓ Worth confirming:** this is 7 rules because duration and notice status are scored separately (per the WCL policy document we aligned to on 2026-09-15). If what's actually wanted is a simpler 4-rule model — one flat value per severity, no notice distinction — that's a smaller, different table (this is closer to the original BRD's minor/moderate/severe/no-call-no-show schedule). Worth a quick confirm on which one the team wants going forward, since they score attendance differently in practice.

### 3. "Intervene Now" should reflect the actual HR action for the point level

**🔧 Real gap.** Today, `/dashboard`'s "Intervene Now" list (`src/app/dashboard/priority-roster.tsx`) shows a hand-written `suggestedAction` string per demo employee (e.g. "Reassign delivery route coverage") — it's flavor text, not derived from the employee's actual point total.

The fix is more of a wiring job than new logic: `recommendedNextStep()` in `src/lib/policy-engine.ts` already generates exactly the sentence this needs, grounded in the real threshold crossed —

> "At 9 pts (crossed the At Risk threshold at 8), Employee is eligible for a written warning and unpaid suspension."

— and this is already live on `/insights`' "Employees at risk" card. It just needs to replace the mock `suggestedAction` field in the dashboard's Intervene Now list (and ideally the Priority Roster's "Suggested action" column too, same gap).

### 4. Mark an intervention/follow-up as completed

**🔧 Real gap.** The schema already has what's needed — `warnings.status` is `open` / `acknowledged` / `resolved` — but today the only way a warning becomes `resolved` is as a side effect of an employee's points dropping back below that threshold (via the manual status-changer). There's no "mark this handled" button.

Needed: a small action on the employee's Track Record (`src/app/dashboard/people/[id]/page.tsx`) — "Mark acknowledged" / "Mark resolved" — backed by a new API route that updates one `warnings` row directly, independent of a point change. Same pattern as the existing status-changer: should probably also want a short note ("completed the required meeting on 9/12") for the audit trail, matching how manual status changes already require one.

### 5. Historical record per employee: points and actions taken

**✅ Already done.** `getEmployeeHistory()` (`src/lib/policy-queries.ts`) merges every point-ledger entry and every threshold crossing into one reverse-chronological timeline, shown as "Track record" on the employee profile page (`/dashboard/people/[id]`). This is append-only — nothing is ever overwritten, only added to.

### 6. HR can manually add, deduct, or reset points

**✅ Mostly done.** The Status Changer on the employee profile lets a manager move an employee to any risk band (Clear / Low / Elevated / At Risk / Critical / Termination); it computes and applies whatever point delta that requires, and requires a written reason before it'll submit — logged as a normal, auditable ledger entry (`src/lib/policy-queries.ts::setEmployeeStatus`).

**🔧 Possible gap:** this moves an employee to a *band boundary*, not to an arbitrary number. There's no "add exactly +3" or literal "reset to 0" action distinct from "move to Clear." If HR wants to enter a specific point delta (not just a target band) — e.g. correcting a data-entry mistake by exactly -2 — that's a small additional input mode on the same component, not new backend logic.

### 7. Date-range filters on Analytics

**🔧 Real gap.** `/analytics` currently reads a fixed 7-day demo trend (`ANALYTICS_TREND` in `src/lib/people-mock.ts`) with no filter control at all. The DB-backed queries this would need already exist in similar form on `/insights` (`src/lib/insights-queries.ts` takes a `days` window parameter today) — extending Analytics to a real date-range picker means wiring it to the DB the same way `/insights` already is, plus a UI control, rather than inventing new query logic from scratch.

### 8. "Risk by Team" should reflect our actual teams/departments

**✅ Likely already current — worth a confirm.** The team list (`TEAMS` in `src/lib/dashboard-mock.ts`) already reads:

- Laundry Team Members – First Shift
- Laundry Team Members – Second Shift
- Delivery Drivers
- Team Leads
- Maintenance Technicians
- Production Supervisors

This was updated in a recent pass and lines up with the team sheets in the live tracker. Flagging as "confirm" rather than "done" since this is still mock data (`DEMO_ROSTER`), not read from a real employee roster yet — worth double-checking against HR's current team list before this goes live for real.

### 9. Keep developing AI Insights beyond what Dashboard/Analytics show

**Acknowledged — ongoing direction, not a specific defect.** Today `/insights` already surfaces frequent-lateness patterns, common causes, at-risk employees with grounded recommendations, and reliability trend rankings, plus an AI-written executive summary (grounded in those same numbers, with a deterministic fallback if OpenAI isn't configured — never invented figures). This feedback reads as "keep going in that direction," not a specific ask — happy to scope concrete next additions (e.g., seasonal/day-of-week pattern detection, manager-level rollups) once there's a specific pattern the team wants surfaced.

### 10. Change "Floor" to "Role" or "Position" on the profile page

**🔧 Trivial to rename — one nuance to flag first.** The manager profile page (`/profile`) already shows two different things:

- The page subtitle under the manager's name — already labeled by their job title (e.g. "Shift Supervisor").
- A separate grid field currently labeled **"Floor"** — today holds a floor/shift string (e.g. "Demo floor · Day shift").

Renaming that second field's *label* to "Role" would collide with the job-title subtitle already on the page. Recommend either (a) relabeling it "Position" instead of "Role" to avoid the duplicate, or (b) relabeling to "Role" and changing what the field actually holds (e.g. department/location instead of floor+shift) so it doesn't say the same thing twice. Either is a small change — just needs a call on which.

---

## Integrations / technical next steps

### Zoho Shifts API (schedules, timecards, employee info, team assignments)

**📋 Already scoped, not built.** This is Phase 3 in `docs/planning/points-system-brd.md` — a webhook-or-polling client mapping Zoho shift-adherence records to the point rules above. Open question already on record there: whether Zoho Shifts supports outbound webhooks or needs polling — worth confirming with Zoho before any code starts.

### Zoom integration (attendance-line communications, employee notifications)

**📋 Already scoped, not built.** Phase 4 in the same document — outbound SMS to supervisors on a threshold crossing, plus an in-app "contact supervisor" escalation. Needs the exact Zoom SMS/Contact Center API surface confirmed (that capability is a separate license from core Zoom Meetings) and an HR/legal pass on consent/message-template wording before building.

### Keep Excel/CSV upload as backup and for historical imports

**✅ Already the plan, already built.** CSV bulk import (`src/lib/csv-import.ts`, `/api/attendance-import`) already exists and writes through the same `recordPointEvent()` path as every other point event — no separate/parallel logic to keep in sync. This stays the right fallback path once Zoho/Zoom are live, exactly as described.

### Manual point adjustments and restorative-plan reductions stay HR-controlled, not automated

**✅ Already the design.** The manual status-changer requires a written reason and is a deliberate, logged human action — nothing about it is automatic. The full restorative-process workflow (written PIP-style offers, completion tracking, point cancellation on success) is explicitly scoped as management-discretion, written-only, in `docs/policy/leave-and-restorative-followup.md` — not built yet, and by design not something the system does on its own when it is built.

---

## Suggested next pass, in order

Roughly cheapest-and-clearest-value first:

1. Wire "Intervene Now" (and the Priority Roster's suggested action) to the real `recommendedNextStep()` text — removes stale mock copy, no new backend logic (item 3).
2. Add a "mark acknowledged / resolved" action on warnings, with a required note — closes item 4.
3. Confirm the team list against HR's current org chart — closes item 8, or tells us what to change.
4. Decide the "Floor" field question (rename label vs. repurpose content) — closes item 10.
5. Confirm the 7-rule (duration × notice) vs. 4-rule (flat severity) point model — resolves the open question in item 2 before any further tuning of point values.
6. Analytics date-range filter — larger than 1–4, but follows the same DB-wiring pattern already proven on `/insights`.
7. Zoho Shifts / Zoom — largest, and gated on answers from Zoho/Zoom and HR/legal before any code starts.
