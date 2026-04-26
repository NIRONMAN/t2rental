"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getBackendApiBaseUrl,
  type CreateLocationReviewPayload,
  type LocationReview,
  type LocationReviewSummary,
  type RentalLocation,
} from "@/lib/rental-locations";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { useAuth } from "@/app/components/auth-provider";
import GoogleSignIn from "@/app/components/google-sign-in";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      location: RentalLocation;
      reviews: LocationReview[];
      summary: LocationReviewSummary;
    };

export default function LocationDetail({ locationId }: { locationId: number }) {
  const cacheTtlMs = 45_000;
  const apiBaseUrl = useMemo(() => getBackendApiBaseUrl(), []);
  const { state: authState, token, user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });
  const [verifyState, setVerifyState] = useState<{ status: "idle" | "submitting" | "error"; message?: string }>({
    status: "idle",
  });
  const [reviewState, setReviewState] = useState<{ status: "idle" | "submitting" | "error"; message?: string }>({
    status: "idle",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    const cacheKey = `t2rental:location-detail:${locationId}:${token.slice(0, 16)}`;
    const cached = readClientCache<Extract<DetailState, { status: "success" }>>(cacheKey, cacheTtlMs);

    async function loadData() {
      try {
        setDetailState(cached ?? { status: "loading" });
        const [locationResponse, reviewResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/rental-locations/${locationId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${apiBaseUrl}/api/rental-locations/${locationId}/reviews`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!locationResponse.ok) {
          throw new Error(`Failed to load location (${locationResponse.status}).`);
        }

        if (!reviewResponse.ok) {
          throw new Error(`Failed to load reviews (${reviewResponse.status}).`);
        }

        const locationPayload = (await locationResponse.json()) as { data?: RentalLocation };
        const reviewPayload = (await reviewResponse.json()) as {
          data?: { reviews?: LocationReview[]; summary?: LocationReviewSummary };
        };

        if (!locationPayload.data) {
          throw new Error("Location data missing.");
        }

        if (!active) {
          return;
        }

        const nextState: Extract<DetailState, { status: "success" }> = {
          status: "success",
          location: locationPayload.data,
          reviews: reviewPayload.data?.reviews ?? [],
          summary: reviewPayload.data?.summary ?? {
            reviewCount: 0,
            averageRating: null,
            avoidCount: 0,
          },
        };
        writeClientCache(cacheKey, nextState);
        setDetailState(nextState);
      } catch (error) {
        if (!active) {
          return;
        }

        if (cached) {
          setDetailState(cached);
          return;
        }

        setDetailState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load location.",
        });
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, cacheTtlMs, locationId, reloadKey, token]);

  if (!token) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        Sign in with Google to open listing details.
      </div>
    );
  }

  async function submitVerification() {
    if (!token) {
      setVerifyState({ status: "error", message: "Sign in with Google before verifying." });
      return;
    }

    setVerifyState({ status: "submitting" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/rental-locations/${locationId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: "Verified by renter" }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to verify location.");
      }

      setVerifyState({ status: "idle" });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setVerifyState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to verify location.",
      });
    }
  }

  async function onReviewSubmit(formData: FormData) {
    if (!token) {
      setReviewState({ status: "error", message: "Sign in with Google before posting a review." });
      return;
    }

    setReviewState({ status: "submitting" });

    const payload: CreateLocationReviewPayload = {
      rating: Number(formData.get("rating")),
      recommendation: String(formData.get("recommendation")) as CreateLocationReviewPayload["recommendation"],
      comment: String(formData.get("comment") ?? ""),
      tenantExperience: String(formData.get("tenantExperience") ?? ""),
      isAnonymous: formData.get("isAnonymous") === "on",
      proofOfWorkConfirmed: true,
    };

    if (!payload.tenantExperience?.trim()) {
      delete payload.tenantExperience;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/rental-locations/${locationId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(responsePayload.error ?? "Failed to submit review.");
      }

      setReviewState({ status: "idle" });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setReviewState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to submit review.",
      });
    }
  }

  if (detailState.status === "loading") {
    return <p className="text-sm text-stone-700 dark:text-stone-300">Loading location details...</p>;
  }

  if (detailState.status === "error") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
        {detailState.message}
      </div>
    );
  }

  const { location, reviews, summary } = detailState;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <GoogleSignIn />
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{location.title}</h1>
            <p className="text-sm text-stone-700 dark:text-stone-300">{location.locality}, {location.city}</p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{location.address}</p>
          </div>
          {location.isVerified ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Community verified
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Needs 2 confirmations
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-2 text-sm text-stone-800 dark:text-stone-200 md:grid-cols-2">
          <p><strong>Rent:</strong> INR {location.rentInr.toLocaleString("en-IN")} / month</p>
          <p><strong>BHK:</strong> {location.bhk}</p>
          <p><strong>Furnishing:</strong> {location.furnishingStatus}</p>
          <p><strong>Area:</strong> {location.areaSqft ? `${location.areaSqft} sqft` : "Not specified"}</p>
          <p><strong>Available from:</strong> {location.availableFrom}</p>
          <p><strong>Verifications:</strong> {location.verificationCount}</p>
          <p><strong>Rating:</strong> {summary.averageRating ? `${summary.averageRating}/5` : "No ratings yet"}</p>
          <p><strong>Avoid reports:</strong> {summary.avoidCount}</p>
        </div>

        {location.description ? (
          <p className="mt-4 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">{location.description}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={verifyState.status === "submitting" || authState !== "signed-in"}
            onClick={submitVerification}
            className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400 dark:bg-stone-100 dark:text-stone-900 dark:disabled:bg-stone-600 dark:disabled:text-stone-200"
          >
            {verifyState.status === "submitting" ? "Verifying..." : "Verify this location"}
          </button>
          {authState !== "signed-in" ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Google sign-in required for verification.</p>
          ) : null}
          {verifyState.status === "error" ? (
            <p className="text-xs text-rose-700 dark:text-rose-300">{verifyState.message}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Reviews and tenant experiences</h2>
        <p className="mt-1 text-xs text-stone-700 dark:text-stone-300">
          Every review is routed through ad-farming proof-of-work acknowledgement to reduce spam and support platform funding.
        </p>

        <form action={onReviewSubmit} className="mt-4 grid gap-3 border-t border-stone-200 pt-4 dark:border-stone-700">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
              Rating (1-5)
              <input name="rating" type="number" min={1} max={5} required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
            </label>
            <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
              Recommendation
              <select name="recommendation" defaultValue="recommend" className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">
                <option value="recommend">Good place to rent</option>
                <option value="avoid">Do not rent (warning)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
              Post as
              <select name="isAnonymous" defaultValue="on" className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">
                <option value="on">Anonymous alias ({user?.anonymousAlias ?? "sign in first"})</option>
                <option value="off">Public profile name</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
            Comment
            <textarea name="comment" rows={3} required className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
          </label>

          <label className="grid gap-1 text-sm text-stone-800 dark:text-stone-200">
            Tenant experience details
            <textarea name="tenantExperience" rows={3} className="rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
          </label>

          {authState !== "signed-in" ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Google sign-in required to submit reviews.</p>
          ) : null}
          {reviewState.status === "error" ? (
            <p className="text-xs text-rose-700 dark:text-rose-300">{reviewState.message}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={reviewState.status === "submitting" || authState !== "signed-in"}
              className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400 dark:bg-stone-100 dark:text-stone-900 dark:disabled:bg-stone-600 dark:disabled:text-stone-200"
            >
              {reviewState.status === "submitting" ? "Submitting..." : "Submit review"}
            </button>
            <span className="text-xs text-stone-600 dark:text-stone-400">Proof of work: ad-farming acknowledged in submission pipeline.</span>
          </div>
        </form>

        <div className="mt-6 grid gap-3 border-t border-stone-200 pt-4 dark:border-stone-700">
          {reviews.length === 0 ? (
            <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">No reviews yet for this location.</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {review.rating}/5 · {review.recommendation === "avoid" ? "Do not rent" : "Recommended"}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {review.authorName} · {new Date(review.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <p className="mt-2 text-sm text-stone-800 dark:text-stone-200">{review.comment}</p>
                {review.tenantExperience ? (
                  <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">Tenant experience: {review.tenantExperience}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <div>
        <Link href="/app" className="text-sm font-medium text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-100">
          Back to all listings
        </Link>
      </div>
    </div>
  );
}
