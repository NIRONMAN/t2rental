import LandingSessionCta from "@/app/components/landing-session-cta";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#fde68a_0%,transparent_28%),radial-gradient(circle_at_85%_15%,#fdba74_0%,transparent_30%),linear-gradient(180deg,#fff7ed_0%,#fffbeb_40%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[radial-gradient(circle_at_15%_10%,#292524_0%,transparent_28%),radial-gradient(circle_at_85%_15%,#1c1917_0%,transparent_30%),linear-gradient(180deg,#0c0a09_0%,#1c1917_45%,#0c0a09_100%)] dark:text-stone-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-amber-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-amber-800/60 dark:bg-stone-900/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">t2rental manifesto</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">
            Housing truth should belong to renters, not brokers.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-700 dark:text-stone-300 md:text-base">
            t2rental is a community-built rental platform for tier-2 cities in India. No ads, no paid boosts, no
            selling user data. Just public knowledge from people who actually live there.
          </p>
          <div className="mt-6">
            <LandingSessionCta />
          </div>
        </header>

        <section className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Our philosophy</h2>
          <p className="text-sm leading-6 text-stone-700 dark:text-stone-300">
            Renting in tier-2 cities is still fragmented across WhatsApp groups, offline notices, and unreliable
            hearsay. We are building shared civic infrastructure where listings, locality insights, and landlord
            behavior stay open and verifiable for everyone.
          </p>
          <p className="text-sm leading-6 text-stone-700 dark:text-stone-300">
            Trust comes from community verification and tenant reviews. Cost stays low through open tools and public
            data principles. Access stays fair by keeping browsing and contribution free.
          </p>
        </section>
      </main>
    </div>
  );
}
