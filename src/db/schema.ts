import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema mirroring the mock-data shapes in src/lib/*-mock.ts
 * (people-mock.ts, dashboard-mock.ts, alerts-mock.ts, manager-mock.ts,
 * settings-mock.ts). The app still reads from those mock files —
 * this schema/seed only stands up the real Neon Postgres tables
 * alongside them. See docs/database/database.md.
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

export const notificationStatusEnum = pgEnum("notification_status", [
  "unread",
  "read",
]);

/**
 * Login allowlist — email + salted/hashed password checked by
 * src/lib/auth-mock.ts::verifyCredentials() at /api/login. Deliberately
 * separate from `managers` below: this only stores what's needed to
 * gate sign-in, not a full HR profile, and doesn't assume every login
 * email has a matching managers row (or vice versa) — see
 * docs/auth/authentication.md for the "no identity" limitation this
 * doesn't yet solve.
 */
export const loginCredentials = pgTable("login_credentials", {
  email: text("email").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  // 16-point escalating policy cap — see docs/planning/points-system-brd.md.
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
  // Who recorded this event (login email) — null for legacy/seeded rows.
  createdBy: text("created_by"),
  // Soft delete: a voided event stays in the ledger (audit trail) but is
  // excluded from every points total. See docs/auth/roles-and-stations.md.
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedBy: text("voided_by"),
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
 * (low / elevated / at_risk / critical / termination — the policy PDF
 * §5 risk bands). See src/lib/policy-engine.ts's POLICY_THRESHOLDS for
 * the seeded defaults.
 */
export const policyThresholds = pgTable("policy_thresholds", {
  key: text("key").primaryKey(), // e.g. "low", "at_risk", "termination"
  pointValue: integer("point_value").notNull(),
  label: text("label").notNull(),
  active: boolean("active").notNull().default(true),
});

/**
 * Stateful record of a threshold crossing (distinct from the raw
 * attendance_alerts feed below) — backs the "active warning" / "action
 * plan status" KPIs in docs/planning/points-system-brd.md's analytics section.
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
  // Who triggered this warning (login email) — null for legacy/seeded
  // rows and automated crossings with no signed-in actor.
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Persisted in-app notification feed, generated whenever a `warnings`
 * row is inserted for the "termination" threshold (see recordPointEvent /
 * setEmployeeStatus in policy-queries.ts) — covers both an automated
 * infraction pushing points to the cap and a manager manually setting
 * status to the termination threshold. Append-only. Visibility is scoped by the
 * employee's station, and read state is per user in
 * `notification_reads` below — `status`/`readAt` here are legacy and
 * no longer written. Distinct from `attendanceAlerts` below,
 * which is a regenerate-and-replace snapshot, not an event log.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  warningId: integer("warning_id")
    .notNull()
    .references(() => warnings.id, { onDelete: "cascade" }),
  thresholdKey: text("threshold_key")
    .notNull()
    .references(() => policyThresholds.key),
  pointsAtTrigger: integer("points_at_trigger").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  status: notificationStatusEnum("status").notNull().default("unread"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
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

// ---------------------------------------------------------------------------
// Role- and station-based access. See docs/auth/roles-and-stations.md.
// These tables only *reference* login_credentials / employees — nothing
// here writes to credential or HR rows.
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["hr", "supervisor"]);

/**
 * A station is a group of employees a supervisor is responsible for.
 * For now `name` equals an `employees.team` value — that's the join,
 * so no column has to be added to `employees`.
 */
export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

/**
 * Role assignments, managed by an admin (src/db/seed-roles.ts today).
 * `stationId` null = all stations, which is only valid for HR.
 */
export const userRoles = pgTable(
  "user_roles",
  {
    id: serial("id").primaryKey(),
    email: text("email")
      .notNull()
      .references(() => loginCredentials.email, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull(),
    stationId: integer("station_id").references(() => stations.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("user_roles_assignment").on(t.email, t.role, t.stationId).nullsNotDistinct()],
);

/** Display info for a signed-in user (replaces the hardcoded DEMO_MANAGER). */
export const userProfiles = pgTable("user_profiles", {
  email: text("email")
    .primaryKey()
    .references(() => loginCredentials.email, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  managerId: integer("manager_id").references(() => managers.id, {
    onDelete: "set null",
  }),
});

/**
 * Server-side sessions. `id` is the sha256 of the random token held in
 * the httpOnly `ap_session` cookie — the raw token is never stored.
 * The active role/station is what the user picked at /login/workspace.
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  email: text("email")
    .notNull()
    .references(() => loginCredentials.email, { onDelete: "cascade" }),
  activeRole: userRoleEnum("active_role"),
  activeStationId: integer("active_station_id").references(() => stations.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/**
 * Per-user notification read state — marking a notification read only
 * affects the user who did it (replaces the global notifications.status).
 */
export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    readAt: timestamp("read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.email] })],
);

/** Append-only record of who changed what, under which role/station. */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorEmail: text("actor_email").notNull(),
  role: userRoleEnum("role"),
  stationId: integer("station_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One-time password reset links. `id` is the sha256 of the random token
 * in the emailed/logged link — the raw token is never stored. A token
 * works once, within `expiresAt`. See docs/auth/authentication.md.
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  email: text("email")
    .notNull()
    .references(() => loginCredentials.email, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});
