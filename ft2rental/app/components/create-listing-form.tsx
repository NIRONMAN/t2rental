"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getBackendApiBaseUrl,
  type CreateRentalLocationPayload,
} from "@/lib/rental-locations";
import { useAuth } from "@/app/components/auth-provider";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success" };

export default function CreateListingForm() {
  const apiBaseUrl = useMemo(() => getBackendApiBaseUrl(), []);
  const { token } = useAuth();
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(formData: FormData) {
    if (!token) {
      setSubmitState({ status: "error", message: "Sign in with Google before creating a listing." });
      return;
    }

    setSubmitState({ status: "submitting" });

    const payload: CreateRentalLocationPayload = {
      title: String(formData.get("title") ?? ""),
      city: String(formData.get("city") ?? ""),
      locality: String(formData.get("locality") ?? ""),
      address: String(formData.get("address") ?? ""),
      latitude: Number(formData.get("latitude")),
      longitude: Number(formData.get("longitude")),
      rentInr: Number(formData.get("rentInr")),
      bhk: Number(formData.get("bhk")),
      areaSqft: Number(formData.get("areaSqft")),
      furnishingStatus: String(formData.get("furnishingStatus")) as CreateRentalLocationPayload["furnishingStatus"],
      availableFrom: String(formData.get("availableFrom") ?? ""),
      description: String(formData.get("description") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
    };

    if (!payload.areaSqft || Number.isNaN(payload.areaSqft)) {
      delete payload.areaSqft;
    }

    const description = payload.description ?? "";
    if (!description.trim()) {
      delete payload.description;
    }

    const contactName = payload.contactName ?? "";
    if (!contactName.trim()) {
      delete payload.contactName;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/rental-locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(errorPayload?.error ?? `Failed to create listing (${response.status}).`);
      }

      setSubmitState({ status: "success" });
      window.location.href = "/app";
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create listing.",
      });
    }
  }

  return (
    <form action={onSubmit} className="grid gap-4 rounded-2xl border border-stone-300 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Title
          <input name="title" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          City
          <input name="city" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Locality
          <input name="locality" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Address
          <input name="address" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Latitude
          <input name="latitude" type="number" step="0.000001" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Longitude
          <input name="longitude" type="number" step="0.000001" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Monthly Rent (INR)
          <input name="rentInr" type="number" min={1} required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          BHK
          <input name="bhk" type="number" min={1} required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Area (sqft)
          <input name="areaSqft" type="number" min={1} className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Furnishing
          <select name="furnishingStatus" defaultValue="unfurnished" className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="furnished">Furnished</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Available From
          <input name="availableFrom" type="date" required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
        <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
          Contact Name
          <input name="contactName" className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
        </label>
      </div>

      <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
        Description
        <textarea name="description" rows={4} className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
      </label>

      {submitState.status === "error" ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">{submitState.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitState.status === "submitting"}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400 dark:bg-stone-100 dark:text-stone-900 dark:disabled:bg-stone-600 dark:disabled:text-stone-200"
        >
          {submitState.status === "submitting" ? "Submitting..." : "Create Listing"}
        </button>
        <Link href="/app" className="text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100">
          Back to listings
        </Link>
      </div>
    </form>
  );
}
