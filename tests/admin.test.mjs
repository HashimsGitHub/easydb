import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const bundle = path.join(os.tmpdir(), `easydb-admin-test-${process.pid}.mjs`);
let renderAdminPage;

before(async () => {
  await build({
    entryPoints: [path.join(root, "src/frontend.ts")],
    outfile: bundle,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
  });
  ({ renderAdminPage } = await import(pathToFileURL(bundle)));
});

after(async () => {
  await rm(bundle, { force: true });
});

test("admin shows subscription dates, SQL quotas, and quota notification milestones", () => {
  const tenant = {
    tenantId: "tenant-1",
    email: "tenant@example.test",
    githubLogin: "tenant",
    tier: "developer",
    tierName: "Developer",
    priceUsd: 9,
    tierExpiresAt: "2026-12-01",
    createdAt: "2026-01-01",
    lastSeenAt: "2026-10-30",
    blocked: false,
    notes: "",
    tags: "",
    collectionsQuota: 10,
    collections: 5,
    sqlTables: 5,
    sqlTablesQuota: 10,
    sqlStorageBytes: 100,
    sqlStorageQuotaBytes: 100,
    sqlRowsRead: 70,
    sqlRowsReadQuota: 100,
    sqlRowsWritten: 50,
    sqlRowsWrittenQuota: 100,
    documents: 1,
    docBytes: 100,
    docQuotaBytes: 100,
    mediaFiles: 1,
    mediaBytes: 70,
    mediaQuotaBytes: 100,
    requestsThisMonth: 100,
    requestQuota: 100,
    paypal: {
      subscriptionId: "sub-1",
      synced: true,
      status: "ACTIVE",
      startTime: "2026-01-15T00:00:00Z",
      payerEmail: "payer@example.test",
      priceMonthly: 9,
      currency: "USD",
      lastPayment: 9,
      lastPaymentAt: "2026-10-01",
      nextBillingAt: "2026-11-01",
      failedPayments: 0,
      collected30d: 9,
      syncedAt: "2026-10-30",
      mismatch: "",
    },
  };
  const html = renderAdminPage({
    azure: { account: "account", table: "documents", container: "media" },
    audit: [],
    tenants: [tenant],
    tierCounts: { Developer: 1 },
    totals: {
      documents: 1,
      docBytes: 100,
      mediaFiles: 1,
      mediaBytes: 70,
      sqlTables: 5,
      sqlStorageBytes: 100,
      sqlRowsRead: 70,
      sqlRowsWritten: 50,
    },
    sqlTablesUnavailable: false,
    formatBytes: (value) => `${value} B`,
  });

  assert.match(html, /Notifications <span[^>]*>\(8 quota alerts at 50%, 70% or 100%\)/);
  assert.match(html, /SQL rows read this month/);
  assert.match(html, /100% used/);
  assert.match(html, /50%<\/span>/);
  assert.match(html, /70%<\/span>/);
  assert.match(html, /100%<\/span>/);
  assert.match(html, /Starts 2026-01-15T00:00:00Z/);
  assert.match(html, /Period ends 2026-12-01/);
  assert.match(html, /mailto:tenant%40example.test/);
  assert.match(html, /Temporarily pause tenant access/);
});
