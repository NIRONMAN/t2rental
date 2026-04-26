"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBackendApiBaseUrl, type RentalLocation } from "@/lib/rental-locations";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { useAuth } from "@/app/components/auth-provider";

type ApiState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: RentalLocation[] };

export default function LocationsFeed() {
  const cacheTtlMs = 60_000;
  const [state, setState] = useState<ApiState>({ status: "loading" });
  const apiBaseUrl = useMemo(() => getBackendApiBaseUrl(), []);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    const cacheKey = `t2rental:locations:${token.slice(0, 16)}`;
    const cached = readClientCache<RentalLocation[]>(cacheKey, cacheTtlMs);

    async function loadLocations() {
      try {
        setState(cached ? { status: "success", data: cached } : { status: "loading" });
        const response = await fetch(`${apiBaseUrl}/api/rental-locations`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load listings (${response.status}).`);
        }

        const payload = (await response.json()) as { data?: RentalLocation[] };
        if (!active) {
          return;
        }

        const records = payload.data ?? [];
        writeClientCache(cacheKey, records);
        setState({ status: "success", data: records });
      } catch (error) {
        if (!active) {
          return;
        }

        if (cached) {
          setState({ status: "success", data: cached });
          return;
        }

        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    loadLocations();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, cacheTtlMs, token]);

  if (!token) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        Sign in with Google to view listings.
      </div>
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-stone-700 dark:text-stone-300">Loading rental listings...</p>;
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        {state.message}
      </div>
    );
  }

  if (state.data.length === 0) {
    return (
      <p className="rounded-xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        No listings yet. Add the first rental location.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-300 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100">
          <tr>
            <th className="px-4 py-3 font-semibold">Listing</th>
            <th className="px-4 py-3 font-semibold">Rent</th>
            <th className="px-4 py-3 font-semibold">Specs</th>
            <th className="px-4 py-3 font-semibold">Verification</th>
            <th className="px-4 py-3 font-semibold">Rating</th>
            <th className="px-4 py-3 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody>
          {state.data.map((location) => (
            <tr key={location.id} className="border-t border-stone-200 align-top hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/70">
              <td className="px-4 py-3">
                <p className="font-medium text-stone-900 dark:text-stone-100">{location.title}</p>
                <p className="text-xs text-stone-700 dark:text-stone-300">{location.locality}, {location.city}</p>
              </td>
              <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">INR {location.rentInr.toLocaleString("en-IN")}</td>
              <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                {location.bhk} BHK, {location.furnishingStatus}
                {location.areaSqft ? `, ${location.areaSqft} sqft` : ""}
              </td>
              <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                <p>{location.verificationCount} confirmations</p>
                <p className="text-xs">
                  {location.isVerified ? "Community verified" : "Needs 2 confirmations"}
                </p>
              </td>
              <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                <p>{location.averageRating ? `${location.averageRating}/5` : "No ratings"}</p>
                <p className="text-xs">{location.reviewCount} reviews, {location.avoidCount} avoid reports</p>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/listings/${location.id}`}
                  className="inline-flex rounded-full border border-stone-300 px-3 py-1 text-xs font-medium hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                  Open entry
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
