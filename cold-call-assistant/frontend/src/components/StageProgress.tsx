import { STAGES } from "@/lib/stages";

type Props = { viewing: number; reached: number; saved: Set<number>; onSelect: (n: number) => void };

export default function StageProgress({ viewing, reached, saved, onSelect }: Props) {
  return (
    <nav aria-label="Call progress" className="card !p-3">
      <ol className="space-y-1">
        {STAGES.map((s) => {
          const n = s.stage_number;
          const locked = n > reached;
          const active = n === viewing;
          return (
            <li key={n}>
              <button
                disabled={locked}
                onClick={() => onSelect(n)}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition
                  ${active ? "bg-indigo-600 font-semibold text-white" : locked ? "text-slate-400" : "hover:bg-slate-100"}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${active ? "bg-white text-indigo-700" : saved.has(n) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {saved.has(n) && !active ? "✓" : n}
                </span>
                {s.name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
