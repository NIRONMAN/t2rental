export type RentalLocation = {
  id: number;
  title: string;
  city: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  rentInr: number;
  bhk: number;
  areaSqft: number | null;
  furnishingStatus: "unfurnished" | "semi-furnished" | "furnished";
  availableFrom: string;
  description: string | null;
  contactName: string | null;
  isVerified: boolean;
  reviewCount: number;
  averageRating: number | null;
  verificationCount: number;
  avoidCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateRentalLocationPayload = {
  title: string;
  city: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  rentInr: number;
  bhk: number;
  areaSqft?: number;
  furnishingStatus: "unfurnished" | "semi-furnished" | "furnished";
  availableFrom: string;
  description?: string;
  contactName?: string;
};

export type SessionUser = {
  id: number;
  email: string | null;
  displayName: string | null;
  anonymousAlias: string;
  pictureUrl: string | null;
  isAdmin: boolean;
};

export type AdminObservability = {
  totals: {
    users: number;
    listings: number;
    reviews: number;
    verifications: number;
    activeSessions: number;
  };
  last7Days: {
    newUsers: number;
    newListings: number;
    newReviews: number;
    signIns: number;
  };
  topCities: Array<{ city: string; count: number }>;
  recentActivity: Array<{
    type: "listing_created" | "review_submitted";
    entityId: number;
    label: string;
    context: string;
    createdAt: string;
  }>;
};

export type LocationReview = {
  id: number;
  locationId: number;
  rating: number;
  recommendation: "recommend" | "avoid";
  comment: string;
  tenantExperience: string | null;
  proofOfWorkMethod: "ad-farming";
  proofOfWorkStatus: "verified";
  authorName: string;
  isAnonymous: boolean;
  createdAt: string;
};

export type LocationReviewSummary = {
  reviewCount: number;
  averageRating: number | null;
  avoidCount: number;
};

export type CreateLocationReviewPayload = {
  rating: number;
  recommendation: "recommend" | "avoid";
  comment: string;
  tenantExperience?: string;
  isAnonymous: boolean;
  proofOfWorkConfirmed: true;
};

export function getBackendApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
}

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}
