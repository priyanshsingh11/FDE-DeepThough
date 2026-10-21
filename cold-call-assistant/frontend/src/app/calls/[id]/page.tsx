"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { STAGES } from "@/lib/stages";
import type { CallDetail } from "@/lib/types";
import CallDetailView from "@/components/CallDetailView";
import CallStagePanel, { Draft } from "@/components/CallStagePanel";
import EndCallDialog from "@/components/EndCallDialog";
import StageProgress from "@/components/StageProgress";
import { ErrorBox } from "@/components/Shell";

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(1);
  const [ending, setEnding] = useState(false);
  const dirty = useRef(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const c = await api.getCall(id);
      setCall(c);
      setViewing(c.current_stage);
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const setDirty = useCallback((d: boolean) => { dirty.current = d; }, []);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!call) return <p className="text-slate-500">Loading call…</p>;
  if (call.status === "completed") return <CallDetailView call={call} />;

  const stage = STAGES[viewing - 1];
  const saved = call.stage_results.find((r) => r.stage_number === viewing);

  async function save(d: Draft) {
    const r = await api.saveStage(id, { stage_number: viewing, selected_result: d.result, prospect_words: d.words, notes: d.notes });
    setCall((c) => c && { ...c, stage_results: [...c.stage_results.filter((x) => x.stage_number !== viewing), r] });
    dirty.current = false;
  }
  async function saveNext(d: Draft) {
    await save(d);
    const next = Math.min(viewing + 1, 8);
    const updated = await api.advance(id, next);
    setCall((c) => c && { ...c, current_stage: updated.current_stage });
    setViewing(next);
  }
  function select(n: number) {
    if (n === viewing) return;
    if (dirty.current && !confirm("You have unsaved changes on this stage. Leave without saving?")) return;
    dirty.current = false;
    setViewing(n);
  }
  async function end(outcome: string, notes: string) {
    await api.closeCall(id, { outcome, notes });
    dirty.current = false;
    router.push(`/calls/${id}?done=1`);
    await load();
    setEnding(false);
  }

  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <StageProgress viewing={viewing} reached={call.current_stage} onSelect={select}
          saved={new Set(call.stage_results.map((r) => r.stage_number))} />
        {(call.prospect_name || call.company_name) && (
          <p className="px-1 text-sm text-slate-600">{[call.prospect_name, call.company_name].filter(Boolean).join(" · ")}</p>
        )}
      </aside>
      <CallStagePanel key={viewing} stage={stage} saved={saved} isLast={viewing === 8}
        onSave={save} onSaveNext={saveNext} onEnd={() => setEnding(true)} onDirty={setDirty} />
      {ending && <EndCallDialog stageName={stage.name} onCancel={() => setEnding(false)} onConfirm={end} />}
    </div>
  );
}
