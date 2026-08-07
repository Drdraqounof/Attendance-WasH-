/** Signed-in manager account (demo) — no real identity provider yet. */
export type ManagerProfile = {
  name: string;
  role: string;
  email: string;
  phoneMasked: string;
  floor: string;
  joined: string;
};

export const DEMO_MANAGER: ManagerProfile = {
  name: "Jordan Ellis",
  role: "Shift Supervisor",
  email: "jordan.ellis@ops.example",
  phoneMasked: "••• ••• 7790",
  floor: "Demo floor · Day shift",
  joined: "2022-04-11",
};
