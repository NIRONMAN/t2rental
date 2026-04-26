import CreateListingForm from "@/app/components/create-listing-form";
import ProtectedShell from "@/app/components/protected-shell";

export default function NewListingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffbeb_0%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)] dark:text-stone-100">
      <main className="mx-auto grid w-full max-w-4xl gap-6">
        <ProtectedShell>
          <header className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Add Listing</p>
            <h1 className="text-3xl font-bold">Submit a new rental location</h1>
            <p className="text-sm text-stone-700 dark:text-stone-300">
              Fill in the property and location details. Listing goes live immediately.
            </p>
          </header>
          <CreateListingForm />
        </ProtectedShell>
      </main>
    </div>
  );
}
