import LocationDetail from "@/app/components/location-detail";
import ProtectedShell from "@/app/components/protected-shell";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locationId = Number.parseInt(id, 10);

  if (!Number.isInteger(locationId) || locationId <= 0) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffbeb_0%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)] dark:text-stone-100">
        <main className="mx-auto w-full max-w-5xl">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
            Invalid listing ID.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffbeb_0%,#fafaf9_100%)] px-5 py-10 text-stone-900 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_100%)] dark:text-stone-100">
      <main className="mx-auto w-full max-w-5xl">
        <ProtectedShell>
          <LocationDetail key={locationId} locationId={locationId} />
        </ProtectedShell>
      </main>
    </div>
  );
}
