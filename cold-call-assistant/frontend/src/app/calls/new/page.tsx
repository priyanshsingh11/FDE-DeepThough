"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ErrorBox } from "@/components/Shell";

export default function NewCall() {
  const router = useRouter();
  const [prospect, setProspect] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const call = await api.startCall({ prospect_name: prospect, company_name: company });
      router.push(`/calls/${call.id}`);
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Start a new call</h1>
      <p className="text-sm text-slate-600">Both fields are optional — you can start right away.</p>
      <label className="block text-sm font-medium">Prospect name
        <input className="input mt-1" value={prospect} maxLength={200} onChange={(e) => setProspect(e.target.value)} />
      </label>
      <label className="block text-sm font-medium">Company
        <input className="input mt-1" value={company} maxLength={200} onChange={(e) => setCompany(e.target.value)} />
      </label>
      {error && <ErrorBox message={error} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Starting…" : "Start call"}</button>
    </form>
  );
}
