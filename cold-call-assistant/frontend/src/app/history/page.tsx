"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Call } from "@/lib/types";
import CallHistoryTable from "@/components/CallHistoryTable";
import { ErrorBox } from "@/components/Shell";

export default function History() {
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { setCalls((await api.listCalls()).items); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Call history</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!error && !calls && <p className="text-slate-500">Loading…</p>}
      {calls && calls.length === 0 && (
        <div className="card text-center">
          <p className="text-slate-600">No calls yet.</p>
          <Link href="/calls/new" className="btn-primary mt-3">Start your first call</Link>
        </div>
      )}
      {calls && calls.length > 0 && <CallHistoryTable calls={calls} />}
    </div>
  );
}
