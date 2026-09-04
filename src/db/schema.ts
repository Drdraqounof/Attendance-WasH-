import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema mirroring the mock-data shapes in src/lib/*-mock.ts
 * (people-mock.ts, dashboard-mock.ts, alerts-mock.ts, manager-mock.ts,
 * settings-mock.ts). The app still reads from those mock files —
 * this schema/seed only stands up the real Neon Postgres tables
 * alongside them. See docs/database.md.
 */

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "scheduled",
  "worked",
  "late",
  "absent",
  "early_out",
  "off",
]);

export const pointSourceEnum = pgEnum("point_source", [
  "SMS",
  "Policy",
  "Supervisor",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical",
  "warning",
]);

export const pointRuleCategoryEnum = pgEnum("point_rule_category", [
  "positive",
  "deduction",
]);

export const warningStatusEnum = pgEnum("warning_status", [
  "open",
  "acknowledged",
  "resolved",
]);

/** Signed-in manager accounts. Demo: no real identity provider yet. */
export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull().unique(),
  phoneMasked: text("phone_masked").notNull(),
  floor: text("floor").notNull(),
  joined: date("joined").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Floor roster / employee directory (mirrors RosterEmployee + PersonProfile). */
export const employees = pgTable("employees", {
  id: text("id").primaryKey(), // e.g. "e01" — kept string to match mock ids
  employeeCode: text("employee_code").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  team: text("team").notNull(),
  hireDate: date("hire_date").notNull(),
  phoneMasked: text("phone_masked").notNull(),
  // 16-point escalating policy cap — see docs/points-system-brd.md.
  policyCap: integer("policy_cap").notNull().default(16),
  points: integer("points").notNull().default(0),
  lastSignal: text("last_signal").notNull(),
  lastSignalAgo: text("last_signal_ago").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Weekly schedule rows per employee (ScheduleDay). */
export const scheduleDays = pgTable("schedule_days", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  weekday: text("weekday").notNull(),
  shift: text("shift").notNull(),
  status: scheduleStatusEnum("status").notNull(),
  note: text("note"),
});

/** Attendance point ledger entries (PointEvent). */
export const pointEvents = pgTable("point_events", {
  id: text("id").primaryKey(), // e.g. "p01a" — kept string to match mock ids
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  source: pointSourceEnum("source").notNull(),
  // Stable rule code (see src/lib/policy-engine.ts) this event was generated
  // from — nullable so pre-existing/legacy ledger rows stay valid.
  ruleCode: text("rule_code"),
});

/** Point rule reference table (positive + deduction rules from settings-mock.ts). */
export const pointRules = pgTable("point_rules", {
  id: serial("id").primaryKey(),
  category: pointRuleCategoryEnum("category").notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // Stable identifier used by the policy engine to compute points
  // (see src/lib/policy-engine.ts's ESCALATION_RULES). Nullable/unique —
  // only the escalating deduction rules have one today; legacy
  // display-only rows (positive point catalog) are left without a code.
  code: text("code").unique(),
  points: integer("points"),
  active: boolean("active").notNull().default(true),
});

/**
 * Admin-editable point thresholds that trigger an automated workflow
 * (verbal warning / action plan / final review). See
 * src/lib/policy-engine.ts's POLICY_THRESHOLDS for the seeded defaults
 * and docs/points-system-brd.md for the business rules.
 */
export const policyThresholds = pgTable("policy_thresholds", {
  key: text("key").primaryKey(), // e.g. "verbal_warning", "action_plan", "final_review"
  pointValue: integer("point_value").notNull(),
  label: text("label").notNull(),
  active: boolean("active").notNull().default(true),
});

/**
 * Stateful record of a threshold crossing (distinct from the raw
 * attendance_alerts feed below) — backs the "active warning" / "action
 * plan status" KPIs in docs/points-system-brd.md's analytics section.
 */
export const warnings = pgTable("warnings", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  thresholdKey: text("threshold_key")
    .notNull()
    .references(() => policyThresholds.key),
  pointsAtTrigger: integer("points_at_trigger").notNull(),
  status: warningStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Automation toggle definitions (AutomationToggleDef from settings-mock.ts). */
export const automationToggles = pgTable("automation_toggles", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  defaultOn: boolean("default_on").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
});

/**
 * Generated attendance alerts snapshot (AttendanceAlert from alerts-mock.ts).
 * In the mock layer these are derived at request time from employees; this
 * table lets a real alerting pipeline persist/replay them later.
 */
export const attendanceAlerts = pgTable("attendance_alerts", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  issue: text("issue").notNull(),
  detail: text("detail").notNull(),
  attendanceScore: doublePrecision("attendance_score").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
