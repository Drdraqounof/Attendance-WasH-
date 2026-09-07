import { attendanceScoreFromPoints } from "@/lib/attendance-utils";
import { riskLevelFromPoints, type RiskLevel } from "@/lib/dashboard-mock";
import { getAllPeople, type PersonProfile } from "@/lib/people-mock";

export type AlertSeverity = "critical" | "warning";

export type AttendanceAlert = {
  id: string;
  personId: string;
  employee: string;
  issue: string;
  detail: string;
  /** Raw open points (16-point policy) — the display field on the dashboard. */
  points: number;
  riskLevel: RiskLevel;
  /**
   * Legacy 0-100 derived score. No longer shown in the UI (see
   * docs/employee-track-record-plan.md) — kept only because
   * src/db/seed.ts persists it into the attendance_alerts snapshot
   * table's `attendance_score` column.
   */
  attendanceScore: number;
  recommendedAction: string;
  severity: AlertSeverity;
};

// alertSeverityEnum in the DB schema only has critical/warning, so a PIP
// (the most severe band) maps to the same "critical" severity as at_risk
// for now — this alert feed doesn't yet distinguish PIP-level from
// at-risk-level the way policy-engine.ts's riskLevelFromPoints does.
const SEVERITY_BY_RISK: Record<RiskLevel, AlertSeverity | null> = {
  pip_flag: "critical",
  at_risk: "critical",
  watch: "warning",
  clear: null,
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "Manager follow-up",
  warning: "Monitor",
};

/**
 * Automated attendance warnings for managers — the "notification" layer from
 * the attendance plan. Demo: derived from live roster signals rather than a
 * real alerting pipeline, lowest attendance score first.
 */
export function generateAttendanceAlerts(
  people: PersonProfile[] = getAllPeople(),
): AttendanceAlert[] {
  return people
    .map((person): AttendanceAlert | null => {
      const riskLevel = riskLevelFromPoints(person.points);
      const severity = SEVERITY_BY_RISK[riskLevel];
      if (!severity) return null;
      return {
        id: `alert-${person.id}`,
        personId: person.id,
        employee: person.name,
        issue: person.lastSignal,
        detail: person.lastSignalAgo,
        points: person.points,
        riskLevel,
        attendanceScore: attendanceScoreFromPoints(
          person.points,
          person.policyCap,
        ),
        recommendedAction: person.suggestedAction,
        severity,
      };
    })
    .filter((alert): alert is AttendanceAlert => alert !== null)
    .sort((a, b) => a.attendanceScore - b.attendanceScore);
}
