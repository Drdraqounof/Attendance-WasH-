export type AttendanceStatus =
  | "Excellent"
  | "Good"
  | "Needs Improvement"
  | "Action Required";

export function attendanceScoreFromPoints(
  points: number,
  policyCap = 16,
): number {
  if (policyCap <= 0) return 0;
  const raw = 100 - Math.round((points / policyCap) * 100);
  return Math.max(0, Math.min(100, raw));
}

export function attendanceStatusFromScore(score: number): AttendanceStatus {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Improvement";
  return "Action Required";
}

export function attendanceStatusFromPoints(
  points: number,
  policyCap = 16,
): AttendanceStatus {
  return attendanceStatusFromScore(attendanceScoreFromPoints(points, policyCap));
}
