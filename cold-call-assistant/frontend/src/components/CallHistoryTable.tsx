import Link from "next/link";
import { callLabel, fmtDate } from "@/lib/format";
import { STAGES, outcomeLabel } from "@/lib/stages";
import type { Call } from "@/lib/types";
import { StatusBadge } from "./Shell";

export default function CallHistoryTable({ calls }: { calls: Call[] }) {
  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{["Prospect / company", "Started", "Status", "Last stage", "Outcome", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {calls.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{callLabel(c)}</td>
              <td className="px-4 py-3">{fmtDate(c.started_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
                {c.status === "completed" && c.current_stage < 8 && <span className="ml-2 text-xs text-slate-500">ended early</span>}
              </td>
              <td className="px-4 py-3">{c.current_stage}/8 · {STAGES[c.current_stage - 1].name}</td>
              <td className="px-4 py-3">{outcomeLabel(c.outcome)}</td>
              <td className="px-4 py-3 text-right"><Link className="font-semibold text-indigo-700 hover:underline" href={`/calls/${c.id}`}>{c.status === "in_progress" ? "Resume" : "View"}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
