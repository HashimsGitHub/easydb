const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface Tier {
  id: "free" | "developer" | "scale";
  name: string;
  priceUsd: number;
  requestsPerMonth: number;
  docStorageBytes: number;
  mediaStorageBytes: number;
  maxUploadBytes: number;
  maxCollections: number | null; // null = unlimited
}

export const TIERS: Record<string, Tier> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    requestsPerMonth: 100_000,
    docStorageBytes: 500 * MB,
    mediaStorageBytes: 1 * GB,
    maxUploadBytes: 10 * MB,
    maxCollections: 10,
  },
  developer: {
    id: "developer",
    name: "Developer",
    priceUsd: 9,
    requestsPerMonth: 2_000_000,
    docStorageBytes: 10 * GB,
    mediaStorageBytes: 25 * GB,
    maxUploadBytes: 50 * MB,
    maxCollections: 50,
  },
  scale: {
    id: "scale",
    name: "Scale",
    priceUsd: 29,
    requestsPerMonth: 10_000_000,
    docStorageBytes: 50 * GB,
    mediaStorageBytes: 250 * GB,
    maxUploadBytes: 250 * MB,
    maxCollections: null,
  },
};

export function getTier(tierId: string | undefined | null): Tier {
  return TIERS[tierId || "free"] || TIERS.free;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  return `${bytes} B`;
}
