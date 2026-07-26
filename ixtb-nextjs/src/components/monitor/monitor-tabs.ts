export const kMonitorTabs = {
  details: "details",
  alerts: "alerts",
  runs: "runs",
  edit: "edit",
} as const;

export type MonitorTab = (typeof kMonitorTabs)[keyof typeof kMonitorTabs];

const kMonitorTabValues = new Set<string>(Object.values(kMonitorTabs));

export function isMonitorTab(value: string): value is MonitorTab {
  return kMonitorTabValues.has(value);
}
