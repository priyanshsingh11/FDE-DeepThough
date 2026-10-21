export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export const callLabel = (c: { prospect_name: string | null; company_name: string | null }) =>
  [c.prospect_name, c.company_name].filter(Boolean).join(" · ") || "Unnamed call";
