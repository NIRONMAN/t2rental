"use client";

import Link from "next/link";
import { useAuth } from "@/app/components/auth-provider";
import GoogleSignIn from "@/app/components/google-sign-in";

export default function LandingSessionCta() {
  const { state, user } = useAuth();

  return (
    <div className="grid gap-4">
      <GoogleSignIn />
      {state === "signed-in" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app"
            className="inline-flex rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Open community board
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
      ) : null}
    </div>
  );
}
