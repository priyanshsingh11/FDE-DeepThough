import type { Option } from "@/lib/types";

type Props = { options: Option[]; value: string; onChange: (v: string) => void; disabled?: boolean };

export default function ResultSelector({ options, value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="What happened?" className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-12 rounded-lg border-2 px-4 py-3 text-left text-base font-medium transition
              ${on ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white hover:border-slate-400"}
              disabled:opacity-60`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
