"use client";

import { useEffect, useMemo, useState } from "react";
import { getBackendApiBaseUrl, type AdminObservability } from "@/lib/rental-locations";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { useAuth } from "@/app/components/auth-provider";

type PanelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: AdminObservability };

export default function AdminObservabilityPanel() {
  const cacheTtlMs = 30_000;
  const apiBaseUrl = useMemo(() => getBackendApiBaseUrl(), []);
  const { token } = useAuth();
  const [state, setState] = useState<PanelState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    const cacheKey = `t2rental:admin-observability:${token.slice(0, 16)}`;
    const cached = readClientCache<AdminObservability>(cacheKey, cacheTtlMs);

    async function load() {
      try {
        setState(cached ? { status: "success", data: cached } : { status: "loading" });
        const response = await fetch(`${apiBaseUrl}/api/admin/observability`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json()) as { data?: AdminObservability; error?: string };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? `Failed to load observability (${response.status}).`);
        }

        if (!active) {
          return;
        }
        writeClientCache(cacheKey, payload.data);
        setState({ status: "success", data: payload.data });
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
          message: error instanceof Error ? error.message : "Failed to load observability.",
        });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, cacheTtlMs, token]);

  if (!token) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        Missing session token.
      </p>
    );
  }

  if (state.status === "loading") {
    return <p className="text-sm text-stone-700 dark:text-stone-300">Loading observability data...</p>;
  }

  if (state.status === "error") {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        {state.message}
      </p>
    );
  }

  const { totals, last7Days, topCities, recentActivity } = state.data;

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-2xl border border-stone-300 bg-white p-5 shadow-sm md:grid-cols-5 dark:border-stone-700 dark:bg-stone-900">
        <MetricCard label="Users" value={totals.users} />
        <MetricCard label="Listings" value={totals.listings} />
        <MetricCard label="Reviews" value={totals.reviews} />
        <MetricCard label="Verifications" value={totals.verifications} />
        <MetricCard label="Active Sessions" value={totals.activeSessions} />
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Last 7 days</h2>
        <div className="mt-3 grid gap-3 text-sm text-stone-800 dark:text-stone-200 md:grid-cols-4">
          <MetricCard label="New users" value={last7Days.newUsers} />
          <MetricCard label="New listings" value={last7Days.newListings} />
          <MetricCard label="New reviews" value={last7Days.newReviews} />
          <MetricCard label="Sign-ins" value={last7Days.signIns} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Top cities by listings</h2>
        {topCities.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">No city data yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm text-stone-800 dark:text-stone-200">
            {topCities.map((entry) => (
              <li key={entry.city} className="flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2 dark:bg-stone-800">
                <span>{entry.city}</span>
                <span className="font-semibold">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">No activity captured yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                <tr>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Context</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((event) => (
                  <tr key={`${event.type}-${event.entityId}-${event.createdAt}`} className="border-t border-stone-200 dark:border-stone-700">
                    <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{event.type}</td>
                    <td className="px-3 py-2 text-stone-900 dark:text-stone-100">{event.label}</td>
                    <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{event.context}</td>
                    <td className="px-3 py-2 text-stone-700 dark:text-stone-300">{new Date(event.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-100 px-3 py-3 dark:bg-stone-800">
      <p className="text-xs uppercase tracking-wide text-stone-600 dark:text-stone-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-900 dark:text-stone-100">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}
