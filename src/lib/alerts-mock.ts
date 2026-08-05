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
  attendanceScore: number;
  recommendedAction: string;
  severity: AlertSeverity;
};

const SEVERITY_BY_RISK: Record<RiskLevel, AlertSeverity | null> = {
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
      const severity = SEVERITY_BY_RISK[riskLevelFromPoints(person.points)];
      if (!severity) return null;
      return {
        id: `alert-${person.id}`,
        personId: person.id,
        employee: person.name,
        issue: person.lastSignal,
        detail: person.lastSignalAgo,
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
