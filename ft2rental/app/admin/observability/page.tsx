import Link from "next/link";
import ProtectedShell from "@/app/components/protected-shell";
import AdminObservabilityPanel from "@/app/components/admin-observability-panel";

export default function AdminObservabilityPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffbeb_0%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)] dark:text-stone-100">
      <main className="mx-auto grid w-full max-w-6xl gap-6">
        <ProtectedShell adminOnly>
          <header className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Admin</p>
            <h1 className="text-3xl font-bold">Basic observability</h1>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Snapshot of platform usage and recent listing/review activity.
            </p>
            <Link href="/app" className="text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100">
              Back to board
            </Link>
          </header>
          <AdminObservabilityPanel />
        </ProtectedShell>
      </main>
    </div>
  );
}
