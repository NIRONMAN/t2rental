"use client";

import Link from "next/link";
import GoogleSignIn from "@/app/components/google-sign-in";
import { useAuth } from "@/app/components/auth-provider";

export default function ProtectedShell({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { state, user } = useAuth();

  if (state === "loading") {
    return (
      <section className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm text-stone-700 dark:text-stone-300">Checking your session...</p>
      </section>
    );
  }

  if (state !== "signed-in") {
    return (
      <section className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800/60 dark:bg-stone-900">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Sign in required</h2>
        <p className="text-sm text-stone-700 dark:text-stone-300">
          This section is available only to signed-in community members.
        </p>
        <GoogleSignIn />
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Or go back to{" "}
          <Link href="/" className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
            landing page
          </Link>
          .
        </p>
      </section>
    );
  }

  if (adminOnly && !user?.isAdmin) {
    return (
      <section className="grid gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-900 dark:bg-rose-950/60">
        <h2 className="text-xl font-semibold text-rose-800 dark:text-rose-200">Admin access required</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300">
          Your account is signed in, but it does not have admin privileges.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
