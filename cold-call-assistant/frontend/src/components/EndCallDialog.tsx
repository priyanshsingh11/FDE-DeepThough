"use client";
import { useEffect, useRef, useState } from "react";
import { OUTCOMES } from "@/lib/stages";
import { ErrorBox } from "./Shell";

type Props = { stageName: string; onCancel: () => void; onConfirm: (outcome: string, notes: string) => Promise<void> };

export default function EndCallDialog({ stageName, onCancel, onConfirm }: Props) {
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  async function go() {
    if (!outcome || busy) return;
    setBusy(true); setError("");
    try { await onConfirm(outcome, notes); } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="card w-full max-w-md space-y-4">
        <h2 id="end-title" className="text-xl font-bold">End call at “{stageName}”?</h2>
        <p className="text-sm text-slate-600">The call will be closed and can’t be edited afterwards. Stages you didn’t reach stay marked “Not reached”.</p>
        <label className="block text-sm font-medium">Final outcome
          <select ref={first} className="input mt-1" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">Select an outcome…</option>
            {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Closing note (optional)
          <textarea className="input mt-1" rows={3} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>Keep calling</button>
          <button className="btn-danger" onClick={go} disabled={!outcome || busy}>{busy ? "Closing…" : "End call"}</button>
        </div>
      </div>
    </div>
  );
}
