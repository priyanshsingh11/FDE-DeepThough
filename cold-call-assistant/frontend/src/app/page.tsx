import Link from "next/link";
import { STAGES } from "@/lib/stages";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-3xl font-bold">Stay oriented on the call.</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Keep this open while you talk. It shows where you are in the eight-stage call, what prospects tend to say,
          and saves what happened as you go.
        </p>
        <div className="mt-5 flex gap-3">
          <Link href="/calls/new" className="btn-primary">Start new call</Link>
          <Link href="/history" className="btn-secondary">Review past calls</Link>
        </div>
      </section>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((s) => (
          <li key={s.stage_number} className="card !p-4">
            <div className="text-xs font-semibold text-indigo-600">STAGE {s.stage_number}</div>
            <div className="font-semibold">{s.name}</div>
            <p className="mt-1 text-sm text-slate-600">{s.purpose}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
