"use client";
import { useEffect, useState } from "react";
import { stageData } from "@/lib/stages";
import type { Stage, StageResult } from "@/lib/types";
import ResultSelector from "./ResultSelector";
import { ErrorBox } from "./Shell";

export type Draft = { result: string; words: string; notes: string };
type Props = {
  stage: Stage;
  saved?: StageResult;
  isLast: boolean;
  onSave: (d: Draft) => Promise<void>;
  onSaveNext: (d: Draft) => Promise<void>;
  onEnd: () => void;
  onDirty: (dirty: boolean) => void;
};

export default function CallStagePanel({ stage, saved, isLast, onSave, onSaveNext, onEnd, onDirty }: Props) {
  const base: Draft = { result: saved?.selected_result ?? "", words: saved?.prospect_words ?? "", notes: saved?.notes ?? "" };
  const [draft, setDraft] = useState<Draft>(base);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">(saved ? "saved" : "idle");
  const [error, setError] = useState("");

  const dirty = draft.result !== base.result || draft.words !== base.words || draft.notes !== base.notes;
  useEffect(() => onDirty(dirty), [dirty, onDirty]);

  async function run(fn: (d: Draft) => Promise<void>) {
    if (state === "saving" || !draft.result) return;
    setState("saving"); setError("");
    try { await fn(draft); setState("saved"); }
    catch (e) { setState("failed"); setError((e as Error).message); } // draft is kept so nothing typed is lost
  }

  const wordsEmphasis = stage.stage_number === 5;
  const saving = state === "saving";

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="text-xs font-semibold tracking-wide text-indigo-600">STAGE {stage.stage_number} OF 8</div>
        <h1 className="text-2xl font-bold">{stage.name}</h1>
        <p className="mt-1 text-slate-700">{stage.purpose}</p>
        {stage.guidance.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {stage.guidance.map((g) => <li key={g}>{g}</li>)}
          </ul>
        )}
        {!stageData.verified && (
          <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">Placeholder guidance — not yet verified against the transcripts.</p>
        )}
      </section>

      {stage.common_responses.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">WHAT PROSPECTS MAY SAY</h2>
          <ul className="space-y-1 text-sm">
            {stage.common_responses.map((r) => <li key={r.text}>“{r.text}”</li>)}
          </ul>
        </section>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">WHAT HAPPENED?</h2>
          <ResultSelector options={stage.result_options} value={draft.result} disabled={saving}
            onChange={(result) => setDraft((d) => ({ ...d, result }))} />
        </div>
        <label className={`block text-sm font-semibold ${wordsEmphasis ? "text-indigo-700" : "text-slate-500"}`}>
          PROSPECT’S WORDS{wordsEmphasis && " — capture verbatim"}
          <textarea className={`input mt-1 font-normal ${wordsEmphasis ? "border-indigo-400 ring-2 ring-indigo-100" : ""}`}
            rows={wordsEmphasis ? 5 : 3} maxLength={5000} value={draft.words}
            onChange={(e) => setDraft((d) => ({ ...d, words: e.target.value }))} />
        </label>
        <label className="block text-sm font-semibold text-slate-500">NOTES (optional)
          <textarea className="input mt-1 font-normal" rows={2} maxLength={5000} value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
        </label>

        {state === "failed" && <ErrorBox message={error} onRetry={() => run(onSave)} />}

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" disabled={saving || !draft.result || !dirty} onClick={() => run(onSave)}>
            {saving ? "Saving…" : "Save result"}
          </button>
          {!isLast && (
            <button className="btn-primary" disabled={saving || !draft.result} onClick={() => run(onSaveNext)}>
              Save &amp; next stage →
            </button>
          )}
          <button className="btn-danger ml-auto" disabled={saving} onClick={onEnd}>{isLast ? "Finish call" : "End call"}</button>
        </div>
        <p aria-live="polite" className="text-xs text-slate-500">
          {saving ? "Saving…" : state === "saved" && !dirty ? "✓ Saved" : dirty ? "Unsaved changes" : "Pick a result to save."}
        </p>
      </section>
    </div>
  );
}
