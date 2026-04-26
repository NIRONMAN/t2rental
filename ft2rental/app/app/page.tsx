import GoogleSignIn from "@/app/components/google-sign-in";
import LocationsFeed from "@/app/components/locations-feed";
import ProtectedShell from "@/app/components/protected-shell";
import DashboardActions from "@/app/components/dashboard-actions";

export default function AppHomePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fffbeb_45%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[linear-gradient(180deg,#0c0a09_0%,#1c1917_45%,#0c0a09_100%)] dark:text-stone-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <ProtectedShell>
          <header className="rounded-3xl border border-amber-200 bg-amber-50 p-7 shadow-sm dark:border-amber-800/60 dark:bg-stone-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">t2rental board</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">Rental listings for tier-2 cities</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-700 dark:text-stone-300 md:text-base">
              Browse community-submitted rental locations and contribute new ones.
            </p>
            <div className="mt-4">
              <GoogleSignIn />
            </div>
            <DashboardActions />
          </header>

          <section className="grid gap-3">
            <h2 className="text-xl font-semibold">Latest listings</h2>
            <LocationsFeed />
          </section>
        </ProtectedShell>
      </main>
    </div>
  );
}
