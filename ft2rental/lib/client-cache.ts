"use client";

type CacheEnvelope<T> = {
  createdAt: number;
  value: T;
};

export function readClientCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.createdAt !== "number") {
      window.localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.createdAt > ttlMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeClientCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  const envelope: CacheEnvelope<T> = {
    createdAt: Date.now(),
    value,
  };

  window.localStorage.setItem(key, JSON.stringify(envelope));
}
