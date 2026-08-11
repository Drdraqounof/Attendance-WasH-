/**
 * Static settings/automation reference data (demo). Mirrors the point rule
 * tables and automation toggles described in the attendance plan. Nothing
 * here is wired to a backend — the automation toggles are stored per-browser
 * via localStorage in the settings page's client component.
 */

export type PointRule = {
  label: string;
  value: string;
};

export const POSITIVE_POINT_RULES: PointRule[] = [
  { label: "Arrives on time", value: "+2" },
  { label: "Perfect attendance — weekly", value: "+10" },
  { label: "Perfect attendance — monthly", value: "+25" },
  { label: "Covers another employee's shift", value: "+5" },
  { label: "Picks up an additional shift", value: "+5" },
  { label: "Early notification (24+ hours)", value: "+3" },
  { label: "Excellent attendance for 90 days", value: "+20" },
];

export const DEDUCTION_RULES: PointRule[] = [
  { label: "Late 1–10 minutes", value: "−2" },
  { label: "Late 11–30 minutes", value: "−5" },
  { label: "Late 30+ minutes", value: "−10" },
  { label: "Leaving early without approval", value: "−10" },
  { label: "Missed shift without notice", value: "−15" },
  { label: "No call / no show", value: "−20" },
  { label: "Repeated attendance problems", value: "Additional review" },
];

/** localStorage key the settings page writes toggle state to (read by
 * the profile page's read-only catalog too, so both stay in sync). */
export const AUTOMATION_TOGGLES_STORAGE_KEY = "ap_automation_toggles";

export type AutomationToggleKey =
  | "smsIntake"
  | "managerAlerts"
  | "employeeOfMonth"
  | "trendAnalysis"
  | "weeklyDigest";

export type AutomationToggleDef = {
  key: AutomationToggleKey;
  label: string;
  description: string;
  defaultOn: boolean;
  /** Toggle is shown but can't actually be turned on in this demo build. */
  locked?: boolean;
};

export const AUTOMATION_TOGGLES: AutomationToggleDef[] = [
  {
    key: "smsIntake",
    label: "Automated SMS intake & AI extraction",
    description:
      "Parse incoming attendance texts and extract name, time, and reason automatically.",
    defaultOn: false,
    locked: true,
  },
  {
    key: "managerAlerts",
    label: "Automated manager alerts",
    description:
      "Push a warning notification when an employee crosses the watch or at-risk threshold.",
    defaultOn: true,
  },
  {
    key: "trendAnalysis",
    label: "30-day trend analysis",
    description:
      "Continuously scan the last 30 days of incidents for lateness patterns and risk trends.",
    defaultOn: true,
  },
  {
    key: "employeeOfMonth",
    label: "Employee-of-the-month nomination",
    description:
      "Automatically nominate the best attendance record each cycle for recognition.",
    defaultOn: true,
  },
  {
    key: "weeklyDigest",
    label: "Weekly manager digest email",
    description:
      "Send a summary of risk changes and recognitions to supervisors every Monday.",
    defaultOn: false,
  },
];
