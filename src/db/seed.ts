import "dotenv/config";
import { db } from "@/db/client";
import {
  attendanceAlerts,
  automationToggles,
  employees,
  managers,
  pointEvents,
  pointRules,
  policyThresholds,
  scheduleDays,
  warnings,
} from "@/db/schema";
import { generateAttendanceAlerts } from "@/lib/alerts-mock";
import { DEMO_MANAGER } from "@/lib/manager-mock";
import { getAllPeople } from "@/lib/people-mock";
import {
  ESCALATION_RULES,
  POLICY_CAP,
  POLICY_THRESHOLDS,
} from "@/lib/policy-engine";
import {
  AUTOMATION_TOGGLES,
  DEDUCTION_RULES,
  POSITIVE_POINT_RULES,
} from "@/lib/settings-mock";

/**
 * Seeds Neon Postgres with data equivalent to the mock files, so the
 * real tables (see src/db/schema.ts) hold the same demo dataset the UI
 * currently reads from src/lib/*-mock.ts.
 *
 * Idempotent: deletes existing rows in dependency order before
 * re-inserting, so it can be re-run safely.
 *
 * Run with: npm run db:seed
 */
async function seed() {
  console.log("Seeding database…");

  // Delete in FK-safe order.
  await db.delete(attendanceAlerts);
  await db.delete(warnings);
  await db.delete(pointEvents);
  await db.delete(scheduleDays);
  await db.delete(employees);
  await db.delete(managers);
  await db.delete(pointRules);
  await db.delete(policyThresholds);
  await db.delete(automationToggles);

  // Manager.
  await db.insert(managers).values({
    name: DEMO_MANAGER.name,
    role: DEMO_MANAGER.role,
    email: DEMO_MANAGER.email,
    phoneMasked: DEMO_MANAGER.phoneMasked,
    floor: DEMO_MANAGER.floor,
    joined: DEMO_MANAGER.joined,
  });
  console.log("  ✓ manager");

  // Employees + their schedule days + point ledger.
  const people = getAllPeople();

  await db.insert(employees).values(
    people.map((person) => ({
      id: person.id,
      employeeCode: person.employeeCode,
      name: person.name,
      role: person.role,
      team: person.team,
      hireDate: person.hireDate,
      phoneMasked: person.phoneMasked,
      // The real Neon `employees` table follows the current BRD policy
      // cap (16), independent of people-mock.ts's `policyCap: 12` —
      // that field only feeds the legacy mock-driven pages/tests, which
      // haven't been migrated off the old 12-point model yet.
      policyCap: POLICY_CAP,
      points: person.points,
      lastSignal: person.lastSignal,
      lastSignalAgo: person.lastSignalAgo,
      suggestedAction: person.suggestedAction,
    })),
  );
  console.log(`  ✓ ${people.length} employees`);

  const scheduleRows = people.flatMap((person) =>
    person.schedule.map((day) => ({
      employeeId: person.id,
      date: day.date,
      weekday: day.weekday,
      shift: day.shift,
      status: day.status,
      note: day.note ?? null,
    })),
  );
  if (scheduleRows.length > 0) {
    await db.insert(scheduleDays).values(scheduleRows);
  }
  console.log(`  ✓ ${scheduleRows.length} schedule days`);

  const pointEventRows = people.flatMap((person) =>
    person.pointLedger.map((event) => ({
      id: event.id,
      employeeId: person.id,
      date: event.date,
      delta: event.delta,
      reason: event.reason,
      source: event.source,
    })),
  );
  if (pointEventRows.length > 0) {
    await db.insert(pointEvents).values(pointEventRows);
  }
  console.log(`  ✓ ${pointEventRows.length} point events`);

  // Point rules — legacy display-only catalog (positive + deduction, no
  // `code`, kept for the /settings and /profile pages, which still read
  // settings-mock.ts directly rather than this table) plus the real
  // 16-point escalation schedule (has `code`/`points`, consumed by
  // src/lib/policy-engine.ts via src/lib/policy-queries.ts).
  const legacyRuleRows = [
    ...POSITIVE_POINT_RULES.map((rule, i) => ({
      category: "positive" as const,
      label: rule.label,
      value: rule.value,
      sortOrder: i,
    })),
    ...DEDUCTION_RULES.map((rule, i) => ({
      category: "deduction" as const,
      label: rule.label,
      value: rule.value,
      sortOrder: i,
    })),
  ];
  const escalationRuleRows = ESCALATION_RULES.map((rule, i) => ({
    category: "deduction" as const,
    label: rule.label,
    value: `+${rule.points}`,
    sortOrder: legacyRuleRows.length + i,
    code: rule.code,
    points: rule.points,
  }));
  await db.insert(pointRules).values([...legacyRuleRows, ...escalationRuleRows]);
  console.log(
    `  ✓ ${legacyRuleRows.length + escalationRuleRows.length} point rules (${escalationRuleRows.length} escalation)`,
  );

  // Policy thresholds (2pt verbal warning / 10pt action plan / 16pt final
  // review — termination protocol).
  await db.insert(policyThresholds).values(
    POLICY_THRESHOLDS.map((threshold) => ({
      key: threshold.key,
      pointValue: threshold.pointValue,
      label: threshold.label,
    })),
  );
  console.log(`  ✓ ${POLICY_THRESHOLDS.length} policy thresholds`);

  // Automation toggles.
  await db.insert(automationToggles).values(
    AUTOMATION_TOGGLES.map((toggle) => ({
      key: toggle.key,
      label: toggle.label,
      description: toggle.description,
      defaultOn: toggle.defaultOn,
      locked: toggle.locked ?? false,
    })),
  );
  console.log(`  ✓ ${AUTOMATION_TOGGLES.length} automation toggles`);

  // Derived attendance alerts snapshot.
  const alerts = generateAttendanceAlerts(people);
  if (alerts.length > 0) {
    await db.insert(attendanceAlerts).values(
      alerts.map((alert) => ({
        id: alert.id,
        employeeId: alert.personId,
        issue: alert.issue,
        detail: alert.detail,
        attendanceScore: alert.attendanceScore,
        recommendedAction: alert.recommendedAction,
        severity: alert.severity,
      })),
    );
  }
  console.log(`  ✓ ${alerts.length} attendance alerts`);

  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
