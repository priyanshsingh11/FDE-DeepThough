import Link from "next/link";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-indigo-700">Cold Call Assistant</Link>
          <nav className="flex gap-2">
            <Link href="/history" className="btn-secondary">Call History</Link>
            <Link href="/calls/new" className="btn-primary">New Call</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="btn-secondary !py-1.5">Retry</button>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "in_progress" | "completed" }) {
  return status === "in_progress"
    ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">In progress</span>
    : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Completed</span>;
}
