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
  sqlStorageBytes: number;
  sqlRowsReadPerMonth: number;
  sqlRowsWrittenPerMonth: number;
  maxSqlTables: number;
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
    // Sized so ~100 fully-active Free tenants fit inside Turso's Free plan
    // (5 GB, 500M rows read, 10M rows written per month).
    sqlStorageBytes: 50 * MB,
    sqlRowsReadPerMonth: 5_000_000,
    sqlRowsWrittenPerMonth: 100_000,
    maxSqlTables: 10,
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
    sqlStorageBytes: 1 * GB,
    sqlRowsReadPerMonth: 100_000_000,
    sqlRowsWrittenPerMonth: 2_000_000,
    maxSqlTables: 50,
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
    sqlStorageBytes: 5 * GB,
    sqlRowsReadPerMonth: 1_000_000_000,
    sqlRowsWrittenPerMonth: 10_000_000,
    maxSqlTables: 200,
  },
};

export function getTier(tierId: string | undefined | null): Tier {
  return TIERS[tierId || "free"] || TIERS.free;
}

export function projectedStorageBytes(currentBytes: number, replacedBytes: number, incomingBytes: number): number {
  return Math.max(0, currentBytes - replacedBytes) + incomingBytes;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  return `${bytes} B`;
}
