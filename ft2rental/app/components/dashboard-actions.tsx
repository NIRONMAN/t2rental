"use client";

import Link from "next/link";
import { useAuth } from "@/app/components/auth-provider";

export default function DashboardActions() {
  const { user } = useAuth();

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Link
        href="/listings/new"
        className="inline-flex rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        Add a rental location
      </Link>
      {user?.isAdmin ? (
        <Link
          href="/admin/observability"
          className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Admin observability
        </Link>
      ) : null}
    </div>
  );
}
