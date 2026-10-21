import Link from "next/link";
import { callLabel, fmtDate } from "@/lib/format";
import { STAGES, outcomeLabel, resultLabel } from "@/lib/stages";
import type { CallDetail } from "@/lib/types";
import { StatusBadge } from "./Shell";

export default function CallDetailView({ call }: { call: CallDetail }) {
  const byStage = new Map(call.stage_results.map((r) => [r.stage_number, r]));
  const earlyEnd = call.status === "completed" && call.current_stage < 8;
  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{callLabel(call)}</h1>
          <StatusBadge status={call.status} />
          {earlyEnd && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold">Ended early at stage {call.current_stage}</span>}
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-slate-500">Started</dt><dd>{fmtDate(call.started_at)}</dd></div>
          <div><dt className="text-slate-500">Ended</dt><dd>{fmtDate(call.ended_at)}</dd></div>
          <div><dt className="text-slate-500">Last stage reached</dt><dd>{call.current_stage} · {STAGES[call.current_stage - 1].name}</dd></div>
          <div><dt className="text-slate-500">Outcome</dt><dd>{outcomeLabel(call.outcome)}</dd></div>
        </dl>
        {call.close_notes && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm"><b>Closing note:</b> {call.close_notes}</p>}
        {call.status === "in_progress" && (
          <Link href={`/calls/${call.id}`} className="btn-primary mt-4">Resume call</Link>
        )}
      </section>
      <ol className="space-y-3">
        {STAGES.map((s) => {
          const r = byStage.get(s.stage_number);
          const reached = s.stage_number <= call.current_stage;
          return (
            <li key={s.stage_number} className={`card !p-4 ${r ? "" : "bg-slate-50"}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{s.stage_number}. {s.name}</h2>
                {!r && <span className="text-xs text-slate-500">{reached ? "Reached — nothing recorded" : "Not reached"}</span>}
              </div>
              {r && (
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-slate-500">Result:</span> <b>{resultLabel(s.stage_number, r.selected_result)}</b></p>
                  {r.prospect_words && <p><span className="text-slate-500">Prospect’s words:</span> “{r.prospect_words}”</p>}
                  {r.notes && <p><span className="text-slate-500">Notes:</span> {r.notes}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
