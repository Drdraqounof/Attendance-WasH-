/**
 * App-wide language selection. Chosen once, right after signing in
 * (src/app/login/language/page.tsx — the interstitial shown after
 * "Enter dashboard" / "Continue without credentials"), then read from
 * the cookie by the shared chrome (src/components/ops-shell.tsx) and
 * every page below it.
 *
 * CHROME_COPY covers the shared header/nav. Each page/section below has
 * its own `Record<Lang, {...}>` dictionary (DASHBOARD_COPY,
 * ANALYTICS_COPY, INSIGHTS_COPY, INSIGHTS_REPORT_COPY, SETTINGS_COPY,
 * PROFILE_COPY, PEOPLE_COPY) — only static UI chrome written directly
 * in JSX is translated; data values from src/lib/*-mock.ts or the
 * database (names, per-person narratives, dates, numbers) are not.
 *
 * Client-safe module (no `next/headers`) — the language-picker button
 * (src/app/login/language/language-picker.tsx) and client subcomponents
 * import the constants from here directly. The server-only cookie read
 * lives in src/lib/i18n-server.ts.
 */
import type { TrendDirection } from "@/lib/ai-analysis-mock";
import type { AlertSeverity } from "@/lib/alerts-mock";
import type { RosterEmployee } from "@/lib/dashboard-mock";
import type { ScheduleStatus } from "@/lib/people-mock";
import type { RiskLevel } from "@/lib/policy-engine";

export type Lang = "en" | "es";

export const LANG_COOKIE = "attendpoint_lang";

export function normalizeLang(raw: string | undefined): Lang {
  return raw === "es" ? "es" : "en";
}

/**
 * src/lib/dashboard-mock.ts's RISK_LABELS and src/lib/alerts-mock.ts's
 * ALERT_SEVERITY_LABELS are small, fixed UI-label dictionaries (not
 * per-employee mock data), so — unlike names/narratives/timestamps —
 * they get translated too. Every page/component that renders a risk
 * band or alert severity picks its label from here instead of the
 * English-only constants in those two files.
 */
export const RISK_LABELS_BY_LANG: Record<Lang, Record<RiskLevel, string>> = {
  en: {
    termination: "Termination threshold",
    critical: "Critical",
    at_risk: "At risk",
    elevated: "Elevated",
    low: "Low",
    clear: "Clear",
  },
  es: {
    termination: "Umbral de despido",
    critical: "Crítico",
    at_risk: "En riesgo",
    elevated: "Elevado",
    low: "Bajo",
    clear: "Sin riesgo",
  },
};

export const ALERT_SEVERITY_LABELS_BY_LANG: Record<
  Lang,
  Record<AlertSeverity, string>
> = {
  en: {
    critical: "Manager follow-up",
    warning: "Monitor",
  },
  es: {
    critical: "Seguimiento del gerente",
    warning: "Vigilar",
  },
};

/** src/lib/ai-analysis-mock.ts's TREND_LABELS, translated. */
export const TREND_LABELS_BY_LANG: Record<Lang, Record<TrendDirection, string>> = {
  en: {
    improving: "Improving",
    stable: "Stable",
    worsening: "Worsening",
  },
  es: {
    improving: "Mejorando",
    stable: "Estable",
    worsening: "Empeorando",
  },
};

/** src/lib/people-mock.ts's SCHEDULE_STATUS_LABELS, translated. */
export const SCHEDULE_STATUS_LABELS_BY_LANG: Record<
  Lang,
  Record<ScheduleStatus, string>
> = {
  en: {
    scheduled: "Scheduled",
    worked: "Worked",
    late: "Late",
    absent: "Absent",
    early_out: "Early out",
    off: "Off",
  },
  es: {
    scheduled: "Programado",
    worked: "Trabajado",
    late: "Tarde",
    absent: "Ausente",
    early_out: "Salida anticipada",
    off: "Libre",
  },
};

export const CHROME_COPY: Record<
  Lang,
  {
    navDashboard: string;
    navDashboardShort: string;
    navAnalytics: string;
    navInsights: string;
    navInsightsShort: string;
    navSettings: string;
    navProfile: string;
    signOut: string;
    notificationsLabel: string;
    notificationsUnread: string;
    notificationsMarkAllRead: string;
    notificationsAllRead: string;
    notificationsEmpty: string;
    notificationsSeverityCritical: string;
    notificationsSeverityWarning: string;
    notificationsViewAll: string;
  }
> = {
  en: {
    navDashboard: "Dashboard",
    navDashboardShort: "Dash",
    navAnalytics: "Analytics",
    navInsights: "AI Insights",
    navInsightsShort: "AI",
    navSettings: "Settings",
    navProfile: "Profile",
    signOut: "Sign out",
    notificationsLabel: "Notifications",
    notificationsUnread: "unread",
    notificationsMarkAllRead: "Mark all as read",
    notificationsAllRead: "All read",
    notificationsEmpty: "No notifications yet.",
    notificationsSeverityCritical: "Critical",
    notificationsSeverityWarning: "Warning",
    notificationsViewAll: "View all on dashboard",
  },
  es: {
    navDashboard: "Panel",
    navDashboardShort: "Panel",
    navAnalytics: "Analítica",
    navInsights: "IA Insights",
    navInsightsShort: "IA",
    navSettings: "Configuración",
    navProfile: "Perfil",
    signOut: "Cerrar sesión",
    notificationsLabel: "Notificaciones",
    notificationsUnread: "sin leer",
    notificationsMarkAllRead: "Marcar todas como leídas",
    notificationsAllRead: "Todas leídas",
    notificationsEmpty: "Aún no hay notificaciones.",
    notificationsSeverityCritical: "Crítico",
    notificationsSeverityWarning: "Advertencia",
    notificationsViewAll: "Ver todo en el panel",
  },
};

export const DASHBOARD_COPY: Record<
  Lang,
  {
    liveShiftOpen: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    metricTermination: string;
    metricCritical: string;
    metricAtRisk: string;
    metricElevated: string;
    metricLow: string;
    metricClear: string;
    metricOpenPointsToday: string;
    recognitionHeading: string;
    recognitionFullList: string;
    recognitionEmpty: string;
    footer: string;
    alertsHeading: string;
    alertsEmpty: string;
    alertsAutomated: string;
    openWord: string;
    rosterEmptyTitle: string;
    rosterEmptyBody: string;
    rosterHeading: string;
    rosterSubheading: string;
    colName: string;
    colRoleTeam: string;
    colRisk: string;
    colPoints: string;
    colLastSignal: string;
    colSuggestedAction: string;
    interveneHeading: string;
    interveneEmpty: string;
    interveneActionTargets: string;
  }
> = {
  en: {
    liveShiftOpen: "Live · Shift open",
    eyebrow: "Live attendance risk",
    heading: "Shift risk console",
    subheading:
      "SMS signals scored against policy — act before the floor slips. Select a name for schedule and points detail.",
    metricTermination: "Termination threshold",
    metricCritical: "Critical",
    metricAtRisk: "At risk",
    metricElevated: "Elevated",
    metricLow: "Low",
    metricClear: "Clear",
    metricOpenPointsToday: "Open points today",
    recognitionHeading: "Employee of the month",
    recognitionFullList: "Full recognition list",
    recognitionEmpty: "No nominee yet this cycle.",
    footer: "Demo data · SMS intake not connected",
    alertsHeading: "Attendance alerts",
    alertsEmpty: "No active warnings. All signals within policy.",
    alertsAutomated: "Automated warnings",
    openWord: "open",
    rosterEmptyTitle: "No roster signals yet",
    rosterEmptyBody:
      "When SMS intake is connected, attendance risk will appear here.",
    rosterHeading: "Priority roster",
    rosterSubheading: "Highest risk first · click a row",
    colName: "Name",
    colRoleTeam: "Role / Team",
    colRisk: "Risk",
    colPoints: "Points",
    colLastSignal: "Last signal",
    colSuggestedAction: "Suggested action",
    interveneHeading: "Intervene now",
    interveneEmpty: "No at-risk employees on this shift. Keep the board clear.",
    interveneActionTargets: "Action targets",
  },
  es: {
    liveShiftOpen: "En vivo · Turno abierto",
    eyebrow: "Riesgo de asistencia en vivo",
    heading: "Consola de riesgo del turno",
    subheading:
      "Señales de SMS evaluadas según la política — actúe antes de que el piso se resienta. Seleccione un nombre para ver el horario y el detalle de puntos.",
    metricTermination: "Umbral de despido",
    metricCritical: "Crítico",
    metricAtRisk: "En riesgo",
    metricElevated: "Elevado",
    metricLow: "Bajo",
    metricClear: "Sin riesgo",
    metricOpenPointsToday: "Puntos abiertos hoy",
    recognitionHeading: "Empleado del mes",
    recognitionFullList: "Ver lista completa de reconocimiento",
    recognitionEmpty: "Aún no hay nominado en este ciclo.",
    footer: "Datos de demostración · recepción de SMS no conectada",
    alertsHeading: "Alertas de asistencia",
    alertsEmpty: "Sin advertencias activas. Todo dentro de la política.",
    alertsAutomated: "Advertencias automáticas",
    openWord: "abiertas",
    rosterEmptyTitle: "Aún no hay señales de nómina",
    rosterEmptyBody:
      "Cuando se conecte la recepción de SMS, el riesgo de asistencia aparecerá aquí.",
    rosterHeading: "Nómina prioritaria",
    rosterSubheading: "Mayor riesgo primero · haga clic en una fila",
    colName: "Nombre",
    colRoleTeam: "Puesto / Equipo",
    colRisk: "Riesgo",
    colPoints: "Puntos",
    colLastSignal: "Última señal",
    colSuggestedAction: "Acción sugerida",
    interveneHeading: "Intervenir ahora",
    interveneEmpty:
      "No hay empleados en riesgo en este turno. El panel está despejado.",
    interveneActionTargets: "Objetivos de acción",
  },
};

export const ANALYTICS_COPY: Record<
  Lang,
  {
    eyebrow: string;
    heading: string;
    subheading: string;
    metricOpenPoints: string;
    metricAtRiskNow: string;
    metric7DayPoints: string;
    metricAvgPoints: string;
    trendHeading: string;
    trendWindowLabel: string;
    signalsWord: string;
    riskDistHeading: string;
    onRosterWord: string;
    riskAtRisk: string;
    riskWatch: string;
    riskClear: string;
    teamHeading: string;
    teamSubheading: string;
    thTeam: string;
    thAtRisk: string;
    thWatch: string;
    thClear: string;
    thPoints: string;
    signalsHeading: string;
    signalsSubheading: string;
    leadersHeading: string;
    leadersOpenConsole: string;
    recognitionHeading: string;
    recognitionSubheading: string;
    footer: string;
  }
> = {
  en: {
    eyebrow: "Floor analytics",
    heading: "Attendance analytics",
    subheading:
      "Point load, signal mix, and team risk — so supervisors see patterns before the next shift.",
    metricOpenPoints: "Open points",
    metricAtRiskNow: "At risk now",
    metric7DayPoints: "7-day points",
    metricAvgPoints: "Avg points / person",
    trendHeading: "Points trend",
    trendWindowLabel: "Last 7 days",
    signalsWord: "signals",
    riskDistHeading: "Risk distribution",
    onRosterWord: "on roster",
    riskAtRisk: "At risk",
    riskWatch: "Watch",
    riskClear: "Clear",
    teamHeading: "Risk by team",
    teamSubheading: "Open points",
    thTeam: "Team",
    thAtRisk: "At risk",
    thWatch: "Watch",
    thClear: "Clear",
    thPoints: "Points",
    signalsHeading: "Signal mix",
    signalsSubheading: "From point ledger",
    leadersHeading: "Highest open points",
    leadersOpenConsole: "Open console",
    recognitionHeading: "Employee of the month — nominees",
    recognitionSubheading: "Recognition · current cycle",
    footer: "Demo data · SMS intake not connected",
  },
  es: {
    eyebrow: "Analítica del piso",
    heading: "Analítica de asistencia",
    subheading:
      "Carga de puntos, mezcla de señales y riesgo por equipo — para que los supervisores vean patrones antes del próximo turno.",
    metricOpenPoints: "Puntos abiertos",
    metricAtRiskNow: "En riesgo ahora",
    metric7DayPoints: "Puntos en 7 días",
    metricAvgPoints: "Puntos prom. / persona",
    trendHeading: "Tendencia de puntos",
    trendWindowLabel: "Últimos 7 días",
    signalsWord: "señales",
    riskDistHeading: "Distribución de riesgo",
    onRosterWord: "en la nómina",
    riskAtRisk: "En riesgo",
    riskWatch: "Vigilancia",
    riskClear: "Sin riesgo",
    teamHeading: "Riesgo por equipo",
    teamSubheading: "Puntos abiertos",
    thTeam: "Equipo",
    thAtRisk: "En riesgo",
    thWatch: "Vigilancia",
    thClear: "Sin riesgo",
    thPoints: "Puntos",
    signalsHeading: "Mezcla de señales",
    signalsSubheading: "Del registro de puntos",
    leadersHeading: "Mayor cantidad de puntos abiertos",
    leadersOpenConsole: "Abrir consola",
    recognitionHeading: "Empleado del mes — candidatos",
    recognitionSubheading: "Reconocimiento · ciclo actual",
    footer: "Datos de demostración · recepción de SMS no conectada",
  },
};

export const INSIGHTS_COPY: Record<
  Lang,
  {
    eyebrow: string;
    heading: string;
    intro: string;
    capability1: string;
    capability2: string;
    capability3: string;
    capability4: string;
    capability5: string;
    latenessHeading: string;
    latenessSubLead: string;
    daysWord: string;
    latenessEmpty: string;
    causesHeading: string;
    atRiskHeading: string;
    atRiskFlagged: string;
    atRiskEmpty: string;
    terminationBadge: string;
    reliabilityHeading: string;
    reliabilityTop: string;
    reliabilityVsPrior: string;
    thEmployee: string;
    thPointsStatus: string;
    thTrend: string;
    footer: string;
    summaryHeading: string;
    sourceOpenAI: string;
    sourceFallback: string;
    buildReport: string;
  }
> = {
  en: {
    eyebrow: "AI attendance analysis",
    heading: "Patterns, causes, and risk — surfaced automatically",
    intro: "The attendance system continuously analyzes signals to identify:",
    capability1: "Frequent lateness patterns",
    capability2: "Common causes of attendance issues",
    capability3: "Employees at risk of attendance problems",
    capability4: "Improvement trends",
    capability5: "Attendance points & policy status",
    latenessHeading: "Frequent lateness patterns",
    latenessSubLead: "3+ late arrivals · last",
    daysWord: "days",
    latenessEmpty:
      "No employee has crossed the frequent-lateness threshold this cycle.",
    causesHeading: "Common causes of attendance issues",
    atRiskHeading: "Employees at risk",
    atRiskFlagged: "flagged",
    atRiskEmpty: "No employees flagged as at risk right now.",
    terminationBadge: "Termination threshold",
    reliabilityHeading: "Attendance points & improvement trends",
    reliabilityTop: "Top",
    reliabilityVsPrior: "vs. prior",
    thEmployee: "Employee",
    thPointsStatus: "Points · Status",
    thTrend: "Trend",
    footer:
      "Live query · reads from Neon (schema in docs/database/database.md) · SMS intake not connected",
    summaryHeading: "AI summary",
    sourceOpenAI: "Generated by OpenAI",
    sourceFallback: "Fallback",
    buildReport: "Build report",
  },
  es: {
    eyebrow: "Análisis de asistencia con IA",
    heading: "Patrones, causas y riesgo — detectados automáticamente",
    intro:
      "El sistema de asistencia analiza continuamente las señales para identificar:",
    capability1: "Patrones frecuentes de tardanzas",
    capability2: "Causas comunes de los problemas de asistencia",
    capability3: "Empleados en riesgo de problemas de asistencia",
    capability4: "Tendencias de mejora",
    capability5: "Puntos de asistencia y estado de la política",
    latenessHeading: "Patrones frecuentes de tardanzas",
    latenessSubLead: "3+ tardanzas · últimos",
    daysWord: "días",
    latenessEmpty:
      "Ningún empleado ha cruzado el umbral de tardanzas frecuentes en este ciclo.",
    causesHeading: "Causas comunes de los problemas de asistencia",
    atRiskHeading: "Empleados en riesgo",
    atRiskFlagged: "marcados",
    atRiskEmpty: "No hay empleados marcados en riesgo por el momento.",
    terminationBadge: "Umbral de despido",
    reliabilityHeading: "Puntos de asistencia y tendencias de mejora",
    reliabilityTop: "Top",
    reliabilityVsPrior: "vs. los",
    thEmployee: "Empleado",
    thPointsStatus: "Puntos · Estado",
    thTrend: "Tendencia",
    footer:
      "Consulta en vivo · lee de Neon (esquema en docs/database/database.md) · recepción de SMS no conectada",
    summaryHeading: "Resumen de IA",
    sourceOpenAI: "Generado por OpenAI",
    sourceFallback: "Alternativo",
    buildReport: "Crear informe",
  },
};

export const INSIGHTS_REPORT_COPY: Record<
  Lang,
  {
    backToInsights: string;
    eyebrow: string;
    heading: string;
    lastWord: string;
    daysWord: string;
    subheadingRest: string;
    summaryLabel: string;
    improveLabel: string;
    placeholder: string;
    updating: string;
    updateSummary: string;
    building: string;
    downloadPdf: string;
    errorRefine: string;
    errorDownload: string;
    errorGeneric: string;
  }
> = {
  en: {
    backToInsights: "Back to insights",
    eyebrow: "Build report",
    heading: "Review, refine, and download the attendance report",
    lastWord: "Last",
    daysWord: "days",
    subheadingRest:
      "this AI summary is what will lead the PDF. Ask for changes before you download it, if you like.",
    summaryLabel: "This is the summary that will go in the report",
    improveLabel: "Want any improvements before I build this?",
    placeholder:
      "e.g. keep it shorter, lead with the PIP employees, focus on trends…",
    updating: "Updating…",
    updateSummary: "Update summary",
    building: "Building…",
    downloadPdf: "Download PDF",
    errorRefine: "Couldn't update the summary. Try again.",
    errorDownload: "Couldn't build the report. Try again.",
    errorGeneric: "Something went wrong.",
  },
  es: {
    backToInsights: "Volver a insights",
    eyebrow: "Crear informe",
    heading: "Revise, refine y descargue el informe de asistencia",
    lastWord: "Últimos",
    daysWord: "días",
    subheadingRest:
      "este resumen de IA es el que encabezará el PDF. Pida cambios antes de descargarlo, si lo desea.",
    summaryLabel: "Este es el resumen que irá en el informe",
    improveLabel: "¿Desea alguna mejora antes de que lo genere?",
    placeholder:
      "p. ej. hazlo más breve, destaca a los empleados en PIP, enfócate en tendencias…",
    updating: "Actualizando…",
    updateSummary: "Actualizar resumen",
    building: "Generando…",
    downloadPdf: "Descargar PDF",
    errorRefine: "No se pudo actualizar el resumen. Inténtelo de nuevo.",
    errorDownload: "No se pudo generar el informe. Inténtelo de nuevo.",
    errorGeneric: "Algo salió mal.",
  },
};

export const SETTINGS_COPY: Record<
  Lang,
  {
    eyebrow: string;
    heading: string;
    subheading: string;
    automationHeading: string;
    automationSavedBrowser: string;
    thresholdsHeading: string;
    thresholdsReadOnly: string;
    thresholdsNote: string;
    escalationHeading: string;
    escalationReadOnly: string;
    footer: string;
    notConnected: string;
    saving: string;
    save: string;
    errorPositiveInt: string;
    errorUpdateFailed: string;
    ptsWord: string;
    pipConfirmLead: string;
    pipConfirmTrail: string;
    pipCapNote: string;
  }
> = {
  en: {
    eyebrow: "Settings",
    heading: "Settings & automation",
    subheading:
      "Policy rules behind the point system, plus which automations are active for this floor.",
    automationHeading: "Automation",
    automationSavedBrowser: "Saved to this browser",
    thresholdsHeading: "Automated policy thresholds",
    thresholdsReadOnly: "Read-only — live thresholds unavailable",
    thresholdsNote:
      "0 points is perfect attendance — every employee starts there and only accrues points through the escalation schedule below. Crossing a threshold above drives the dashboard, analytics, and alert severity across the app. All three thresholds are editable above — changing PIP also updates every employee's point cap, since PIP is defined as the cap.",
    escalationHeading: "Attendance escalation schedule",
    escalationReadOnly: "Read-only — live rules unavailable",
    footer:
      "Demo data · toggles persist to this browser only, not a backend · SMS intake not connected",
    notConnected: "Not connected",
    saving: "Saving…",
    save: "Save",
    errorPositiveInt: "Enter a positive whole number of points.",
    errorUpdateFailed: "Update failed.",
    ptsWord: "pts",
    pipConfirmLead: "This also sets every employee's policy cap to",
    pipConfirmTrail: "points. Continue?",
    pipCapNote:
      "This is the policy cap — changing it updates every employee's point cap too.",
  },
  es: {
    eyebrow: "Configuración",
    heading: "Configuración y automatización",
    subheading:
      "Las reglas de política detrás del sistema de puntos, y qué automatizaciones están activas para este piso.",
    automationHeading: "Automatización",
    automationSavedBrowser: "Guardado en este navegador",
    thresholdsHeading: "Umbrales de política automatizados",
    thresholdsReadOnly: "Solo lectura — umbrales en vivo no disponibles",
    thresholdsNote:
      "0 puntos es asistencia perfecta — cada empleado comienza ahí y solo acumula puntos según el calendario de escalamiento a continuación. Cruzar un umbral anterior afecta el panel, la analítica y la severidad de las alertas en toda la aplicación. Los tres umbrales son editables arriba — cambiar el PIP también actualiza el tope de puntos de cada empleado, ya que el PIP se define como ese tope.",
    escalationHeading: "Calendario de escalamiento de asistencia",
    escalationReadOnly: "Solo lectura — reglas en vivo no disponibles",
    footer:
      "Datos de demostración · los interruptores persisten solo en este navegador, no en un backend · recepción de SMS no conectada",
    notConnected: "No conectado",
    saving: "Guardando…",
    save: "Guardar",
    errorPositiveInt: "Ingrese un número entero positivo de puntos.",
    errorUpdateFailed: "La actualización falló.",
    ptsWord: "pts",
    pipConfirmLead: "Esto también establece el tope de puntos de cada empleado en",
    pipConfirmTrail: "puntos. ¿Continuar?",
    pipCapNote:
      "Este es el tope de política — cambiarlo también actualiza el tope de puntos de cada empleado.",
  },
};

export const PROFILE_COPY: Record<
  Lang,
  {
    eyebrow: string;
    labelEmail: string;
    labelPhone: string;
    labelFloor: string;
    labelManagerSince: string;
    footer: string;
    heading: string;
    manageAutomation: string;
    shortSummary: string;
    showSummary: string;
    showFullCatalog: string;
    notConnected: string;
    on: string;
    off: string;
  }
> = {
  en: {
    eyebrow: "Manager profile",
    labelEmail: "Email",
    labelPhone: "Phone",
    labelFloor: "Floor",
    labelManagerSince: "Manager since",
    footer: "Demo account · not connected to a real identity provider",
    heading: "Notification preferences",
    manageAutomation: "Manage automation",
    shortSummary:
      "Manager alerts, 30-day trend analysis, and recognition automations are configured on the settings page and apply across every floor you supervise.",
    showSummary: "Show summary",
    showFullCatalog: "Show full catalog",
    notConnected: "Not connected",
    on: "On",
    off: "Off",
  },
  es: {
    eyebrow: "Perfil del gerente",
    labelEmail: "Correo electrónico",
    labelPhone: "Teléfono",
    labelFloor: "Piso",
    labelManagerSince: "Gerente desde",
    footer: "Cuenta de demostración · no conectada a un proveedor de identidad real",
    heading: "Preferencias de notificación",
    manageAutomation: "Gestionar automatización",
    shortSummary:
      "Las alertas al gerente, el análisis de tendencia de 30 días y las automatizaciones de reconocimiento se configuran en la página de configuración y aplican a cada piso que supervisa.",
    showSummary: "Mostrar resumen",
    showFullCatalog: "Mostrar catálogo completo",
    notConnected: "No conectado",
    on: "Activado",
    off: "Desactivado",
  },
};

export const PEOPLE_COPY: Record<
  Lang,
  {
    backToDashboard: string;
    eyebrow: string;
    employeeOfMonthBadge: string;
    riskLabel: string;
    pipBadge: string;
    phoneLabel: string;
    hireDateLabel: string;
    openPointsLabel: string;
    suggestedPrefix: string;
    towardCapLabel: string;
    lastSignalPrefix: string;
    lastWord: string;
    daysWord: string;
    incidentHistoryLabel: string;
    lateArrivals: string;
    absences: string;
    otherIncidents: string;
    scheduleHeading: string;
    ledgerHeading: string;
    ledgerDemoHistory: string;
    ledgerEmpty: string;
    trackRecordHeading: string;
    trackRecordLiveData: string;
    currentStanding: string;
    noHistory: string;
    crossedThreshold: string;
    pointsAtTrigger: string;
    trackRecordFooter: string;
    trackRecordUnavailable: string;
    footer: string;
    openStatus: string;
    acknowledgedStatus: string;
    resolvedStatus: string;
    confirmChangeLead: string;
    confirmChangeMid: string;
    confirmChangeTrail: string;
    applying: string;
    changeStatus: string;
    errorStatusChangeFailed: string;
    targetStatusLabel: string;
    noteLabel: string;
    notePlaceholder: string;
    noteHint: string;
    errorNoteRequired: string;
    changeStatusModalHeading: string;
    cancelButton: string;
    confirmButton: string;
  }
> = {
  en: {
    backToDashboard: "Back to dashboard",
    eyebrow: "Employee profile",
    employeeOfMonthBadge: "Employee of the month",
    riskLabel: "Risk",
    pipBadge: "Termination",
    phoneLabel: "Phone",
    hireDateLabel: "Hire date",
    openPointsLabel: "Open points",
    suggestedPrefix: "Suggested:",
    towardCapLabel: "Toward policy cap",
    lastSignalPrefix: "Last signal:",
    lastWord: "Last",
    daysWord: "days",
    incidentHistoryLabel: "Incident history",
    lateArrivals: "Late arrivals",
    absences: "Absences",
    otherIncidents: "Other incidents",
    scheduleHeading: "This week's schedule",
    ledgerHeading: "Points ledger",
    ledgerDemoHistory: "Demo history",
    ledgerEmpty: "No point events on record. Clear standing.",
    trackRecordHeading: "Track record",
    trackRecordLiveData: "Live data",
    currentStanding: "Current standing:",
    noHistory: "No history recorded yet.",
    crossedThreshold: "Crossed threshold:",
    pointsAtTrigger: "pts at trigger",
    trackRecordFooter:
      "Sourced from the live database — may differ from the demo points ledger above until the rest of this page is migrated off mock data.",
    trackRecordUnavailable: "Live track record is unavailable right now.",
    footer: "Demo data · SMS intake not connected",
    openStatus: "Open",
    acknowledgedStatus: "Acknowledged",
    resolvedStatus: "Resolved",
    confirmChangeLead: "Change this employee's status from",
    confirmChangeMid: "to",
    confirmChangeTrail:
      "? Points will be added or deducted to match.",
    applying: "Applying…",
    changeStatus: "Change status",
    errorStatusChangeFailed: "Status change failed.",
    targetStatusLabel: "Target status",
    noteLabel: "Reason for change",
    notePlaceholder: "Why is this changing? e.g. \"Cleared after doctor's note on file.\"",
    noteHint: "Required — saved with this change and visible in the track record below.",
    errorNoteRequired: "Enter a reason for this status change before applying it.",
    changeStatusModalHeading: "Change status",
    cancelButton: "Cancel",
    confirmButton: "Confirm change",
  },
  es: {
    backToDashboard: "Volver al panel",
    eyebrow: "Perfil del empleado",
    employeeOfMonthBadge: "Empleado del mes",
    riskLabel: "Riesgo",
    pipBadge: "Despido",
    phoneLabel: "Teléfono",
    hireDateLabel: "Fecha de contratación",
    openPointsLabel: "Puntos abiertos",
    suggestedPrefix: "Sugerido:",
    towardCapLabel: "Hacia el tope de política",
    lastSignalPrefix: "Última señal:",
    lastWord: "Últimos",
    daysWord: "días",
    incidentHistoryLabel: "Historial de incidentes",
    lateArrivals: "Tardanzas",
    absences: "Ausencias",
    otherIncidents: "Otros incidentes",
    scheduleHeading: "Horario de esta semana",
    ledgerHeading: "Registro de puntos",
    ledgerDemoHistory: "Historial de demostración",
    ledgerEmpty: "No hay eventos de puntos registrados. Historial limpio.",
    trackRecordHeading: "Historial de desempeño",
    trackRecordLiveData: "Datos en vivo",
    currentStanding: "Estado actual:",
    noHistory: "Aún no hay historial registrado.",
    crossedThreshold: "Umbral cruzado:",
    pointsAtTrigger: "pts al momento del disparo",
    trackRecordFooter:
      "Proviene de la base de datos en vivo — puede diferir del registro de puntos de demostración anterior hasta que el resto de esta página migre fuera de los datos simulados.",
    trackRecordUnavailable:
      "El historial de desempeño en vivo no está disponible en este momento.",
    footer: "Datos de demostración · recepción de SMS no conectada",
    openStatus: "Abierto",
    acknowledgedStatus: "Reconocido",
    resolvedStatus: "Resuelto",
    confirmChangeLead: "¿Cambiar el estado de este empleado de",
    confirmChangeMid: "a",
    confirmChangeTrail:
      "? Se sumarán o restarán puntos para coincidir.",
    applying: "Aplicando…",
    changeStatus: "Cambiar estado",
    errorStatusChangeFailed: "El cambio de estado falló.",
    targetStatusLabel: "Estado objetivo",
    noteLabel: "Motivo del cambio",
    notePlaceholder:
      "¿Por qué se hace este cambio? p. ej. \"Se levantó tras justificante médico archivado.\"",
    noteHint:
      "Obligatorio — se guarda con este cambio y es visible en el historial de desempeño.",
    errorNoteRequired:
      "Ingresa un motivo para este cambio de estado antes de aplicarlo.",
    changeStatusModalHeading: "Cambiar estado",
    cancelButton: "Cancelar",
    confirmButton: "Confirmar cambio",
  },
};

/**
 * src/lib/dashboard-mock.ts's DEMO_ROSTER is a small, fixed set of 11
 * demo employees (not live/generated data), and its role/team/last
 * signal/suggested-action text shows up verbatim on the dashboard,
 * analytics, and alerts — so it gets a Spanish translation per id here,
 * keyed the same way as DEMO_ROSTER. Names stay as-is (proper nouns).
 * localizeRoster() below applies these over any RosterEmployee[] (or
 * PersonProfile[], which extends it) read from src/lib/people-mock.ts.
 */
const ROSTER_TEXT_ES: Record<
  string,
  Pick<RosterEmployee, "role" | "team" | "lastSignal" | "lastSignalAgo" | "suggestedAction">
> = {
  e01: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Primer turno",
    lastSignal: "No se presentó ni avisó — inicio de turno",
    lastSignalAgo: "Hace 12 min",
    suggestedAction: "En el tope de la política — colocar en PIP formal",
  },
  e02: {
    role: "Líder de equipo",
    team: "Líderes de equipo",
    lastSignal: "Con retraso de 45 min — tráfico",
    lastSignalAgo: "Hace 28 min",
    suggestedAction: "Programar reunión obligatoria con el gerente",
  },
  e03: {
    role: "Conductor de reparto",
    team: "Conductores de reparto",
    lastSignal: "Ausente por enfermedad — fiebre",
    lastSignalAgo: "Hace 1 h",
    suggestedAction: "Reasignar cobertura de la ruta de reparto",
  },
  e04: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Segundo turno",
    lastSignal: "Se retira antes — cuidado de hijos",
    lastSignalAgo: "Hace 2 h",
    suggestedAction: "Verificar el relevo con el suplente",
  },
  e05: {
    role: "Técnico de mantenimiento",
    team: "Técnicos de mantenimiento",
    lastSignal: "Con retraso de 20 min",
    lastSignalAgo: "Hace 45 min",
    suggestedAction: "Vigilar la ventana de marcaje de entrada",
  },
  e06: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Primer turno",
    lastSignal: "Cubriendo con retraso — cambio de turno aprobado",
    lastSignalAgo: "Hace 3 h",
    suggestedAction: "Anotar el cambio de turno en el tablero",
  },
  e07: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Primer turno",
    lastSignal: "En el piso — marcó entrada",
    lastSignalAgo: "Hace 4 h",
    suggestedAction: "Ninguna — solo vigilar",
  },
  e08: {
    role: "Conductor de reparto",
    team: "Conductores de reparto",
    lastSignal: "Regreso de descanso confirmado",
    lastSignalAgo: "Hace 90 min",
    suggestedAction: "Ninguna — sin riesgo",
  },
  e09: {
    role: "Supervisor de producción",
    team: "Supervisores de producción",
    lastSignal: "A tiempo — línea lista",
    lastSignalAgo: "Hace 5 h",
    suggestedAction: "Ninguna — sin riesgo",
  },
  e10: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Segundo turno",
    lastSignal: "Inicio de turno confirmado",
    lastSignalAgo: "Hace 5 h",
    suggestedAction: "Ninguna — sin riesgo",
  },
  e11: {
    role: "Miembro del equipo de lavandería",
    team: "Miembros del equipo de lavandería – Primer turno",
    lastSignal: "En el piso — marcó entrada",
    lastSignalAgo: "Hace 5 h",
    suggestedAction: "Ninguna — sin riesgo",
  },
};

/** Applies ROSTER_TEXT_ES over a roster/person list when lang is "es". */
export function localizeRoster<T extends RosterEmployee>(
  list: T[],
  lang: Lang,
): T[] {
  if (lang === "en") return list;
  return list.map((row) => {
    const es = ROSTER_TEXT_ES[row.id];
    return es ? { ...row, ...es } : row;
  });
}

/**
 * The two "Employee of the month" reason variants generated by
 * src/lib/people-mock.ts's attendanceNominees() — a fixed pair of
 * sentences (one interpolates the person's points), not per-employee
 * free text, so it's translated like any other UI copy.
 */
export function nomineeReason(
  hasCleanLedger: boolean,
  points: number,
  lang: Lang,
): string {
  if (lang === "es") {
    return hasCleanLedger
      ? "Cero incidentes de asistencia en este ciclo — asistencia perfecta."
      : `Menor cantidad de puntos abiertos en el piso (${points}) con una tendencia reciente limpia.`;
  }
  return hasCleanLedger
    ? "Zero attendance incidents this cycle — perfect attendance."
    : `Lowest open points on the floor (${points}) with a clean recent trend.`;
}
