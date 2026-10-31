import {
  getAzureConfig,
  syncDocumentToAzure,
  deleteDocumentFromAzure,
  getDocumentFromAzure,
  uploadMediaToAzure,
  deleteMediaFromAzure,
  downloadMediaFromAzure,
  getMediaBlobUrl,
} from "./azure";
import { renderLandingPage, renderDashboardPage, renderPricingPage, renderAgentsPage, renderAdminPage, renderAdminLoginPage } from "./frontend";
import skillMd from "../agent-docs/SKILL.md";
import llmsTxt from "../agent-docs/llms.txt";
import {
  resolveTenantContext,
  requireAuthenticatedTenant,
  buildGithubAuthorizeUrl,
  signState,
  verifyState,
  exchangeCodeForToken,
  fetchGithubIdentity,
  provisionOrLoadTenant,
  rotateKeyForTenant,
  getPlaintextApiKeyForTenant,
  createSessionCookie,
  clearSessionCookie,
  readSession,
  recordRequestUsage,
  getMonthlyUsage,
  getUsageMonth,
  applyTierChange,
  scheduleDowngradeToFree,
  processExpiredDowngrades,
  isTenantBlocked,
  setTenantBlocked,
  deleteTenantKvData,
  readAdminSession,
  attemptAdminLogin,
  clearAdminCookie,
  isAdminConfigured,
} from "./auth";
import { handleSqlRoute } from "./sql";
import { TIERS, getTier, formatBytes, projectedStorageBytes } from "./tiers";
import {
  createSubscription,
  getSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  planIdToTier,
  tierToPlanId,
  getAccessToken,
} from "./paypal";
import { auditLog, reconcileTenant, handleSubscriptionEvent, reconcileStaleTenants } from "./paypal-sync";

export interface Env {
  DB: D1Database;
  API_KEYS: KVNamespace;
  AZURE_STORAGE_ACCOUNT?: string;
  AZURE_STORAGE_ACCESS_KEY?: string;
  AZURE_TABLE_NAME?: string;
  AZURE_CONTAINER_NAME?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_OAUTH_REDIRECT_URI?: string;
  OAUTH_STATE_SECRET?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_API_BASE?: string;
  PAYPAL_PLAN_DEVELOPER?: string;
  PAYPAL_PLAN_SCALE?: string;
  PAYPAL_WEBHOOK_ID?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  SQL_DATABASE_URL?: string;
  SQL_AUTH_TOKEN?: string;
}

const OAUTH_STATE_COOKIE = "edb_oauth_state";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const tenantContext = await resolveTenantContext(request, env);
    if (tenantContext instanceof Response) return tenantContext;

    const { tenantId, authenticated } = tenantContext;
    let tier = tenantContext.tier;
    if (authenticated) {
      const usage = await recordRequestUsage(env, tenantId, tier);
      if (usage) tier = usage.tier;
      const planTier = getTier(tier);
      if (usage && !usage.allowed) {
        return jsonResponse(
          {
            error: `Quota Exceeded: The '${planTier.name}' plan allows ${planTier.requestsPerMonth.toLocaleString()} requests/month; this limit has been reached. Upgrade your plan or wait for next month's reset.`,
            quota: {
              maxRequestsPerMonth: planTier.requestsPerMonth,
              currentRequests: usage.currentRequests,
              status: "LIMIT_REACHED",
            },
          },
          429
        );
      }
    }
    const azureConfig = getAzureConfig(env);

    const heroUrl = getMediaBlobUrl(azureConfig, "EasyDB_Hero-Image.webp");
    const iconUrl = getMediaBlobUrl(azureConfig, "EasyDB-icon-512.png");

    // Root: Landing Page or JSON
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      const acceptHeader = request.headers.get("accept") || "";
      if (acceptHeader.includes("application/json")) {
        return jsonResponse({
          status: "healthy",
          name: "EasyDB",
          message: "EasyDB Edge Server Running 🚀",
          version: "2.0.0",
        });
      }

      const healthStatus = {
        status: "healthy",
        message: "EasyDB Server Running 🚀",
        storage: {
          nosql: "Connected (JSON Document Store)",
          sql: "Connected (Relational SQL Tables)",
          objectStorage: "Connected (Edge Object Storage)",
        },
      };

      return new Response(renderLandingPage(heroUrl, iconUrl, JSON.stringify(healthStatus, null, 2)), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Hero image redirect endpoint
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/api/v1/hero" || url.pathname === "/hero")) {
      return Response.redirect(heroUrl, 302);
    }

    // Logo / Icon / Favicon redirect endpoint
    if ((request.method === "GET" || request.method === "HEAD") && (url.pathname === "/api/v1/icon" || url.pathname === "/favicon.ico" || url.pathname === "/logo")) {
      return Response.redirect(iconUrl, 302);
    }

    // Pricing page — public, no auth required
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/pricing") {
      return new Response(renderPricingPage(), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // AI agent resources — public, no auth required
    if (request.method === "GET" || request.method === "HEAD") {
      const agentFiles: Record<string, { body: string; type: string; name: string }> = {
        "/SKILL.md": { body: skillMd, type: "text/markdown; charset=utf-8", name: "SKILL.md" },
        "/llms.txt": { body: llmsTxt, type: "text/plain; charset=utf-8", name: "llms.txt" },
      };
      const agentFile = agentFiles[url.pathname];
      if (agentFile) {
        const headers: Record<string, string> = {
          "Content-Type": agentFile.type,
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        };
        if (url.searchParams.has("download")) {
          headers["Content-Disposition"] = `attachment; filename="${agentFile.name}"`;
        }
        return new Response(request.method === "HEAD" ? null : agentFile.body, { status: 200, headers });
      }

      if (url.pathname === "/agents") {
        return new Response(renderAgentsPage(skillMd), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    // SQL: registered tenants use their plan; the public demo_store sandbox gets small shared limits.
    if (url.pathname.startsWith("/api/v1/sql/")) {
      return handleSqlRoute(
        request,
        env,
        tenantId,
        authenticated ? tier : "sandbox",
        url.pathname.slice("/api/v1/sql/".length).replace(/\/$/, "")
      );
    }

    // 1. CREATE (Insert)
    if (request.method === "POST" && url.pathname === "/api/v1/insert") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id || crypto.randomUUID();
      const docData = body.data || {};
      const documentData = JSON.stringify(docData);

      const existingDoc = await env.DB.prepare(
        `SELECT 1 FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(tenantId, collection, docId).first();

      if (!authenticated) {
        // demo_store sandbox: unchanged document-count guardrail.
        const docCountResult = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM mongo_documents WHERE tenant_id = ?`
        ).bind(tenantId).first<{ count: number }>();
        const currentDocCount = docCountResult?.count || 0;

        if (!existingDoc && currentDocCount >= 100) {
          return jsonResponse({
            error: "Sandbox Quota Exceeded: The 'demo_store' database has reached the 100 document limit. Please delete existing documents or register for your own tenant.",
            quota: { maxDocuments: 100, currentDocuments: currentDocCount, status: "LIMIT_REACHED" }
          }, 429);
        }
      } else {
        // Real tenants: enforce the plan's document storage quota (bytes), not a count.
        const planTier = getTier(tier);
        const existingSizeResult = existingDoc
          ? await env.DB.prepare(
              `SELECT LENGTH(CAST(document_data AS BLOB)) as len FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
            ).bind(tenantId, collection, docId).first<{ len: number }>()
          : null;
        const sizeResult = await env.DB.prepare(
          `SELECT COALESCE(SUM(LENGTH(CAST(document_data AS BLOB))), 0) as total FROM mongo_documents WHERE tenant_id = ?`
        ).bind(tenantId).first<{ total: number }>();
        const currentBytes = sizeResult?.total || 0;
        const projectedBytes = projectedStorageBytes(
          currentBytes,
          existingSizeResult?.len || 0,
          Buffer.byteLength(documentData)
        );

        if (projectedBytes > planTier.docStorageBytes) {
          return jsonResponse({
            error: `Quota Exceeded: The '${planTier.name}' plan allows ${formatBytes(planTier.docStorageBytes)} of document storage; this write would exceed it.`,
            quota: {
              maxDocStorage: formatBytes(planTier.docStorageBytes),
              currentDocStorage: formatBytes(currentBytes),
              status: "LIMIT_REACHED"
            }
          }, 429);
        }

        if (planTier.maxCollections !== null && !existingDoc) {
          const existingCollection = await env.DB.prepare(
            `SELECT 1 FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? LIMIT 1`
          ).bind(tenantId, collection).first();

          if (!existingCollection) {
            const collectionCountResult = await env.DB.prepare(
              `SELECT COUNT(DISTINCT collection_name) as count FROM mongo_documents WHERE tenant_id = ?`
            ).bind(tenantId).first<{ count: number }>();

            if ((collectionCountResult?.count || 0) >= planTier.maxCollections) {
              return jsonResponse({
                error: `Quota Exceeded: The '${planTier.name}' plan allows up to ${planTier.maxCollections} collections.`,
                quota: { maxCollections: planTier.maxCollections, status: "LIMIT_REACHED" }
              }, 429);
            }
          }
        }
      }

      // A. Edge Index in Cloudflare D1
      await env.DB.prepare(
        `INSERT INTO mongo_documents (tenant_id, collection_name, doc_id, document_data) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT(tenant_id, collection_name, doc_id) 
         DO UPDATE SET document_data = excluded.document_data, updated_at = CURRENT_TIMESTAMP`
      ).bind(tenantId, collection, docId, documentData).run();

      // B. Heavy Payload Persistence in Azure Table Storage
      let azureSynced = false;
      try {
        await syncDocumentToAzure(azureConfig, tenantId, collection, docId, docData);
        azureSynced = true;
      } catch (err: any) {
        console.error("Azure Table Storage sync error:", err);
      }

      return jsonResponse({
        success: true,
        insertedId: docId,
        azureSynced,
      });
    }

    // 2. READ (Find)
    if (request.method === "POST" && url.pathname === "/api/v1/find") {
      const body: any = await request.json().catch(() => ({}));
      const collection = body.collection || "items";
      const docId = body.id;

      // Single document lookup with Azure fallback if requested
      if (docId && body.source === "azure") {
        const doc = await getDocumentFromAzure(azureConfig, tenantId, collection, docId);
        return jsonResponse({ success: true, document: doc });
      }

      // Fast read from Cloudflare D1 index
      let query = `SELECT doc_id, document_data, updated_at FROM mongo_documents WHERE tenant_id = ? AND collection_name = ?`;
      const params: any[] = [tenantId, collection];

      if (docId) {
        query += ` AND doc_id = ?`;
        params.push(docId);
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();

      const documents = results.map((r: any) => ({
        _id: r.doc_id,
        ...JSON.parse(r.document_data),
        _updatedAt: r.updated_at,
      }));

      return jsonResponse({ success: true, count: documents.length, documents });
    }

    // 3. UPDATE
    if (request.method === "PUT" && url.pathname === "/api/v1/update") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id;
      const updateData = body.data || {};

      if (!docId) return jsonResponse({ error: "Missing document ID for update" }, 400);

      const documentData = JSON.stringify(updateData);
      if (authenticated) {
        const planTier = getTier(tier);
        const existingSizeResult = await env.DB.prepare(
          `SELECT LENGTH(CAST(document_data AS BLOB)) as len FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
        ).bind(tenantId, collection, docId).first<{ len: number }>();
        const sizeResult = await env.DB.prepare(
          `SELECT COALESCE(SUM(LENGTH(CAST(document_data AS BLOB))), 0) as total FROM mongo_documents WHERE tenant_id = ?`
        ).bind(tenantId).first<{ total: number }>();
        const currentBytes = sizeResult?.total || 0;
        const projectedBytes = projectedStorageBytes(
          currentBytes,
          existingSizeResult?.len || 0,
          Buffer.byteLength(documentData)
        );

        if (projectedBytes > planTier.docStorageBytes) {
          return jsonResponse({
            error: `Quota Exceeded: The '${planTier.name}' plan allows ${formatBytes(planTier.docStorageBytes)} of document storage; this update would exceed it.`,
            quota: {
              maxDocStorage: formatBytes(planTier.docStorageBytes),
              currentDocStorage: formatBytes(currentBytes),
              status: "LIMIT_REACHED"
            }
          }, 429);
        }
      }

      // A. Update Cloudflare D1
      await env.DB.prepare(
        `UPDATE mongo_documents SET document_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(documentData, tenantId, collection, docId).run();

      // B. Update Azure Table Storage
      let azureSynced = false;
      try {
        await syncDocumentToAzure(azureConfig, tenantId, collection, docId, updateData);
        azureSynced = true;
      } catch (err: any) {
        console.error("Azure Table update error:", err);
      }

      return jsonResponse({ success: true, updatedId: docId, azureSynced });
    }

    // 4. DELETE
    if (request.method === "DELETE" && url.pathname === "/api/v1/delete") {
      const body: any = await request.json().catch(() => ({}));
      const collection = body.collection || "items";
      const docId = body.id || url.searchParams.get("id");

      if (!docId) return jsonResponse({ error: "Missing document ID for deletion" }, 400);

      // A. Delete from D1
      await env.DB.prepare(
        `DELETE FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(tenantId, collection, docId).run();

      // B. Delete from Azure Table Storage
      try {
        await deleteDocumentFromAzure(azureConfig, tenantId, collection, docId);
      } catch (err: any) {
        console.error("Azure Table delete error:", err);
      }

      return jsonResponse({ success: true, deletedId: docId });
    }

    // 5. MEDIA / BINARY: Upload to Azure Blob Storage & Index in D1
    if (request.method === "POST" && url.pathname === "/api/v1/media/upload") {
      const contentType = request.headers.get("content-type") || "";
      let fileName = url.searchParams.get("filename") || `asset_${Date.now()}`;
      let fileBuffer: ArrayBuffer;
      let mimeType = "application/octet-stream";

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) {
          return jsonResponse({ error: "No file provided in form-data field 'file'" }, 400);
        }
        fileName = file.name || fileName;
        mimeType = file.type || mimeType;
        fileBuffer = await file.arrayBuffer();
      } else if (contentType.includes("application/json")) {
        const body: any = await request.json();
        if (!body.base64Content || !body.fileName) {
          return jsonResponse({ error: "JSON requires 'fileName' and 'base64Content'" }, 400);
        }
        fileName = body.fileName;
        mimeType = body.contentType || mimeType;
        const binaryString = atob(body.base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
      } else {
        // Raw binary body
        mimeType = contentType || mimeType;
        fileBuffer = await request.arrayBuffer();
        if (fileBuffer.byteLength === 0) {
          return jsonResponse({ error: "Uploaded binary body is empty" }, 400);
        }
      }

      const existingFile = await env.DB.prepare(
        `SELECT 1 FROM media_files WHERE tenant_id = ? AND file_name = ?`
      ).bind(tenantId, fileName).first();

      if (!authenticated) {
        // demo_store sandbox: unchanged file-count guardrail.
        const fileCountResult = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM media_files WHERE tenant_id = ?`
        ).bind(tenantId).first<{ count: number }>();
        const currentFileCount = fileCountResult?.count || 0;

        if (!existingFile && currentFileCount >= 5) {
          return jsonResponse({
            error: "Sandbox Quota Exceeded: The 'demo_store' media store has reached its 5 file limit. Please delete an existing file using DELETE /api/v1/media/delete before uploading new media.",
            quota: { maxFiles: 5, currentFiles: currentFileCount, status: "LIMIT_REACHED" }
          }, 429);
        }
      } else {
        // Real tenants: enforce the plan's max upload size and media storage quota (bytes).
        const planTier = getTier(tier);

        if (fileBuffer.byteLength > planTier.maxUploadBytes) {
          return jsonResponse({
            error: `File too large: the '${planTier.name}' plan allows up to ${formatBytes(planTier.maxUploadBytes)} per file.`,
            quota: { maxUploadSize: formatBytes(planTier.maxUploadBytes), status: "LIMIT_REACHED" }
          }, 413);
        }

        const existingFileRow = await env.DB.prepare(
          `SELECT size FROM media_files WHERE tenant_id = ? AND file_name = ?`
        ).bind(tenantId, fileName).first<{ size: number } | null>();
        const sizeResult = await env.DB.prepare(
          `SELECT COALESCE(SUM(size), 0) as total FROM media_files WHERE tenant_id = ?`
        ).bind(tenantId).first<{ total: number }>();
        const currentBytes = sizeResult?.total || 0;
        const projectedBytes = projectedStorageBytes(
          currentBytes,
          existingFileRow?.size || 0,
          fileBuffer.byteLength
        );

        if (projectedBytes > planTier.mediaStorageBytes) {
          return jsonResponse({
            error: `Quota Exceeded: The '${planTier.name}' plan allows ${formatBytes(planTier.mediaStorageBytes)} of media storage; this upload would exceed it.`,
            quota: {
              maxMediaStorage: formatBytes(planTier.mediaStorageBytes),
              currentMediaStorage: formatBytes(currentBytes),
              status: "LIMIT_REACHED"
            }
          }, 429);
        }
      }

      // Upload to Azure Blob (tenant-namespaced path prevents cross-tenant filename collisions)
      const blobUrl = await uploadMediaToAzure(azureConfig, `${tenantId}/${fileName}`, fileBuffer, mimeType);

      // Index in D1
      await env.DB.prepare(
        `INSERT INTO media_files (tenant_id, file_name, blob_url, content_type, size)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, file_name)
         DO UPDATE SET blob_url = excluded.blob_url, content_type = excluded.content_type, size = excluded.size`
      ).bind(tenantId, fileName, blobUrl, mimeType, fileBuffer.byteLength).run();

      return jsonResponse({
        success: true,
        fileName,
        size: fileBuffer.byteLength,
        contentType: mimeType,
      });
    }

    // 6. MEDIA: List Indexed Media
    if (request.method === "GET" && url.pathname === "/api/v1/media/list") {
      const { results } = await env.DB.prepare(
        `SELECT file_name, content_type, size, created_at FROM media_files WHERE tenant_id = ?`
      ).bind(tenantId).all();

      return jsonResponse({ success: true, count: results.length, files: results });
    }

    // 7. MEDIA: Delete from Azure Blob & D1 Index
    if (request.method === "DELETE" && url.pathname === "/api/v1/media/delete") {
      const fileName = url.searchParams.get("filename");
      if (!fileName) return jsonResponse({ error: "Missing 'filename' parameter" }, 400);

      await deleteMediaFromAzure(azureConfig, `${tenantId}/${fileName}`);

      await env.DB.prepare(
        `DELETE FROM media_files WHERE tenant_id = ? AND file_name = ?`
      ).bind(tenantId, fileName).run();

      return jsonResponse({ success: true, deletedFileName: fileName });
    }

    // 8. MEDIA: Download from Azure Blob Storage
    if (request.method === "GET" && url.pathname === "/api/v1/media/download") {
      const fileName = url.searchParams.get("filename");
      if (!fileName) return jsonResponse({ error: "Missing 'filename' parameter" }, 400);

      // Verify file exists for this tenant in D1 index
      const record = await env.DB.prepare(
        `SELECT file_name, blob_url, content_type, size FROM media_files WHERE tenant_id = ? AND file_name = ?`
      ).bind(tenantId, fileName).first<any>();

      if (!record) {
        return jsonResponse({ error: `File '${fileName}' not found for tenant '${tenantId}'` }, 404);
      }

      const blobRes = await downloadMediaFromAzure(azureConfig, `${tenantId}/${fileName}`);
      if (!blobRes.ok) {
        return jsonResponse(
          { error: `Failed to fetch blob from storage (${blobRes.status})` },
          blobRes.status
        );
      }

      const headers = new Headers();
      headers.set("Content-Type", (record.content_type as string) || "application/octet-stream");
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
      if (record.size) headers.set("Content-Length", String(record.size));

      return new Response(blobRes.body, {
        status: 200,
        headers,
      });
    }

    // 9. AUTH: Start GitHub OAuth login
    if (request.method === "GET" && url.pathname === "/api/v1/auth/github/login") {
      if (!env.GITHUB_CLIENT_ID || !env.OAUTH_STATE_SECRET) {
        return jsonResponse({ error: "GitHub OAuth is not configured on this deployment yet" }, 503);
      }

      const state = signState(env.OAUTH_STATE_SECRET);
      const authorizeUrl = buildGithubAuthorizeUrl(env, state);

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl,
          "Set-Cookie": `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
        },
      });
    }

    // 10. AUTH: GitHub OAuth callback — provisions or loads the tenant
    if (request.method === "GET" && url.pathname === "/api/v1/auth/github/callback") {
      if (!env.OAUTH_STATE_SECRET) {
        return jsonResponse({ error: "GitHub OAuth is not configured on this deployment yet" }, 503);
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookieState = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`))
        ?.split("=")[1];

      if (!code || !state || state !== cookieState || !verifyState(env.OAUTH_STATE_SECRET, state)) {
        return jsonResponse({ error: "Invalid or expired OAuth state. Please restart login at /api/v1/auth/github/login" }, 400);
      }

      const accessToken = await exchangeCodeForToken(code, env);
      if (!accessToken) {
        return jsonResponse({ error: "Failed to exchange GitHub authorization code" }, 400);
      }

      const identity = await fetchGithubIdentity(accessToken);
      if (!identity) {
        return jsonResponse({ error: "Failed to fetch GitHub profile" }, 400);
      }

      const result = await provisionOrLoadTenant(env, identity);

      const callbackHeaders = new Headers({ Location: `${url.origin}/dashboard` });
      callbackHeaders.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`);
      callbackHeaders.append("Set-Cookie", createSessionCookie(result.tenantId, env));

      return new Response(null, { status: 302, headers: callbackHeaders });
    }

    // AUTH: Logout — clears the dashboard session cookie
    if (request.method === "GET" && url.pathname === "/api/v1/auth/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": clearSessionCookie(),
        },
      });
    }

    // 11. AUTH: Save/update contact email for support & billing
    if (request.method === "POST" && url.pathname === "/api/v1/auth/email") {
      const authResult = await requireAuthenticatedTenant(request, env);
      if (authResult instanceof Response) return authResult;

      const body: any = await request.json().catch(() => ({}));
      const email = typeof body.email === "string" ? body.email.trim() : "";
      if (!email || !email.includes("@")) {
        return jsonResponse({ error: "A valid 'email' field is required" }, 400);
      }

      await env.DB.prepare(`UPDATE tenants SET email = ? WHERE tenant_id = ?`)
        .bind(email, authResult.tenant.tenantId)
        .run();

      await env.API_KEYS.put(authResult.apiKey, JSON.stringify({ ...authResult.tenant, email }));

      return jsonResponse({ success: true, email });
    }

    // 12. AUTH: Verify a key and inspect the current account
    if (request.method === "GET" && url.pathname === "/api/v1/auth/me") {
      const authResult = await requireAuthenticatedTenant(request, env);
      if (authResult instanceof Response) return authResult;

      const row = await env.DB.prepare(
        `SELECT email, tier, created_at FROM tenants WHERE tenant_id = ?`
      ).bind(authResult.tenant.tenantId).first<any>();
      const planTier = getTier(row?.tier ?? authResult.tenant.tier);
      const requestsThisMonth = await getMonthlyUsage(env, authResult.tenant.tenantId);

      return jsonResponse({
        tenantId: authResult.tenant.tenantId,
        email: row?.email ?? authResult.tenant.email,
        tier: planTier.id,
        planName: planTier.name,
        quotas: {
          requestsPerMonth: planTier.requestsPerMonth,
          docStorage: formatBytes(planTier.docStorageBytes),
          mediaStorage: formatBytes(planTier.mediaStorageBytes),
          maxUploadSize: formatBytes(planTier.maxUploadBytes),
          maxCollections: planTier.maxCollections,
          sqlStorage: formatBytes(planTier.sqlStorageBytes),
          sqlRowsReadPerMonth: planTier.sqlRowsReadPerMonth,
          sqlRowsWrittenPerMonth: planTier.sqlRowsWrittenPerMonth,
          maxSqlTables: planTier.maxSqlTables,
        },
        usage: { requestsThisMonth },
        createdAt: row?.created_at,
      });
    }

    // 13. AUTH: Rotate a lost/compromised API secret (you still have your current key)
    if (request.method === "POST" && url.pathname === "/api/v1/auth/rotate-key") {
      const authResult = await requireAuthenticatedTenant(request, env);
      if (authResult instanceof Response) return authResult;

      const newApiSecret = await rotateKeyForTenant(env, authResult.tenant.tenantId, {
        key: authResult.apiKey,
        record: authResult.tenant,
      });

      return jsonResponse({ success: true, tenantId: authResult.tenant.tenantId, apiSecret: newApiSecret });
    }

    // 13b. DASHBOARD: Session-authenticated reveal of the full plaintext API key
    if (request.method === "GET" && url.pathname === "/api/v1/auth/dashboard/reveal-key") {
      const session = readSession(request, env);
      if (!session) return jsonResponse({ error: "Not logged in" }, 401);
      if (await isTenantBlocked(env, session.tenantId)) return jsonResponse({ error: "Account blocked" }, 403);

      const apiKey = await getPlaintextApiKeyForTenant(env, session.tenantId);
      if (!apiKey) return jsonResponse({ error: "No active API key found for this tenant" }, 404);

      return jsonResponse({ apiKey });
    }

    // 14. DASHBOARD: Session-authenticated rotate — the real "I lost my key" recovery path
    if (request.method === "POST" && url.pathname === "/api/v1/auth/dashboard/rotate-key") {
      const session = readSession(request, env);
      if (!session) return jsonResponse({ error: "Not logged in" }, 401);
      if (await isTenantBlocked(env, session.tenantId)) return jsonResponse({ error: "Account blocked" }, 403);

      try {
        const newApiSecret = await rotateKeyForTenant(env, session.tenantId);
        return jsonResponse({ success: true, apiSecret: newApiSecret });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to rotate API key" }, 400);
      }
    }

    // 15a. ADMIN console — username/password protected (ADMIN_USERNAME / ADMIN_PASSWORD secrets)
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/v1/admin/")) {
      const noStore = { "Cache-Control": "no-store" };

      if (request.method === "POST" && url.pathname === "/api/v1/admin/login") {
        let body: any;
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const result = await attemptAdminLogin(request, env, String(body?.username ?? ""), String(body?.password ?? ""));
        if (!result.ok) return jsonResponse({ error: result.error }, result.status);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Set-Cookie": result.cookie, ...noStore },
        });
      }

      if (request.method === "POST" && url.pathname === "/api/v1/admin/logout") {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Set-Cookie": clearAdminCookie(), ...noStore },
        });
      }

      const isAdmin = readAdminSession(request, env);

      if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/admin") {
        if (!isAdmin) {
          return new Response(renderAdminLoginPage(isAdminConfigured(env)), {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8", ...noStore },
          });
        }
        const data = await loadAdminData(env);
        return new Response(renderAdminPage({ ...data, formatBytes }), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...noStore },
        });
      }

      if (!isAdmin) return jsonResponse({ error: "Unauthorized" }, 401);

      if (request.method === "GET" && url.pathname === "/admin/export.csv") {
        const { tenants } = await loadAdminData(env);
        const cell = (v: unknown) => {
          let t = String(v ?? "");
          if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // neutralise spreadsheet formulas
          return `"${t.replace(/"/g, '""')}"`;
        };
        const header = ["tenant_id", "email", "github", "plan", "status", "documents", "doc_bytes", "media_files", "media_bytes", "requests_this_month", "request_quota", "created", "last_seen", "paypal_status", "paypal_monthly", "paypal_last_payment", "paypal_next_billing", "paypal_collected_30d", "paypal_subscription", "mismatch", "tags", "notes"];
        const lines = tenants.map((t) =>
          [t.tenantId, t.email, t.githubLogin, t.tierName, t.blocked ? "blocked" : "active", t.documents, t.docBytes, t.mediaFiles, t.mediaBytes, t.requestsThisMonth, t.requestQuota, t.createdAt, t.lastSeenAt, t.paypal.status, t.paypal.priceMonthly, t.paypal.lastPayment, t.paypal.nextBillingAt, t.paypal.collected30d, t.paypal.subscriptionId, t.paypal.mismatch, t.tags, t.notes].map(cell).join(",")
        );
        return new Response([header.join(","), ...lines].join("\n"), {
          status: 200,
          headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="easydb-tenants.csv"', ...noStore },
        });
      }

      if (request.method === "POST" && url.pathname === "/api/v1/admin/paypal/sync") {
        if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_API_BASE) return jsonResponse({ error: "PayPal is not configured" }, 503);
        // Optional manual refresh; data is normally kept current by webhooks and the scheduled job.
        // Batched to stay within the Worker subrequest limit; the UI repeats until none remain.
        const batch = await env.DB.prepare(
          `SELECT tenant_id FROM tenants WHERE paypal_subscription_id IS NOT NULL AND (paypal_synced_at IS NULL OR paypal_synced_at < datetime('now', '-30 seconds')) ORDER BY COALESCE(paypal_synced_at, '') ASC LIMIT 10`
        ).all<{ tenant_id: string }>();
        const remainingRow = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM tenants WHERE paypal_subscription_id IS NOT NULL AND (paypal_synced_at IS NULL OR paypal_synced_at < datetime('now', '-30 seconds'))`
        ).first<{ n: number }>();
        const token = await getAccessToken(env);
        const cache = new Map();
        let failed = 0;
        for (const t of batch.results) {
          const r = await reconcileTenant(env, t.tenant_id, token, cache).catch(() => "failed");
          if (r === "failed") failed++;
        }
        return jsonResponse({ success: true, synced: batch.results.length - failed, failed, remaining: Math.max(0, (remainingRow?.n ?? 0) - batch.results.length) });
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/v1/admin/tenant/")) {
        let body: any;
        try { body = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
        const exists = tenantId
          ? await env.DB.prepare(`SELECT tenant_id FROM tenants WHERE tenant_id = ?`).bind(tenantId).first()
          : null;
        if (!exists) return jsonResponse({ error: "Tenant not found" }, 404);
        const action = url.pathname.slice("/api/v1/admin/tenant/".length);

        if (action === "block") {
          const blocked = body.blocked !== false;
          await setTenantBlocked(env, tenantId, blocked);
          await auditLog(env, blocked ? "block" : "unblock", tenantId);
          return jsonResponse({ success: true });
        }

        if (action === "notes") {
          const notes = String(body.notes ?? "").slice(0, 2000);
          const tags = String(body.tags ?? "").slice(0, 200);
          await env.DB.prepare(`UPDATE tenants SET admin_notes = ?, admin_tags = ? WHERE tenant_id = ?`)
            .bind(notes, tags, tenantId).run();
          await auditLog(env, "notes", tenantId, `tags=${tags}`);
          return jsonResponse({ success: true });
        }

        if (action === "delete") {
          if (body.confirm !== tenantId) return jsonResponse({ error: "Confirmation does not match tenant ID" }, 400);

          // Best-effort cleanup of external (Azure) copies before dropping the D1 rows.
          let externalFailures = 0;
          const docs = await env.DB.prepare(`SELECT collection_name, doc_id FROM mongo_documents WHERE tenant_id = ?`)
            .bind(tenantId).all<{ collection_name: string; doc_id: string }>();
          const media = await env.DB.prepare(`SELECT file_name FROM media_files WHERE tenant_id = ?`)
            .bind(tenantId).all<{ file_name: string }>();
          const jobs: Array<() => Promise<unknown>> = [
            ...docs.results.map((d) => () => deleteDocumentFromAzure(azureConfig, tenantId, d.collection_name, d.doc_id)),
            ...media.results.map((m) => () => deleteMediaFromAzure(azureConfig, `${tenantId}/${m.file_name}`)),
          ];
          for (let i = 0; i < jobs.length; i += 10) {
            const results = await Promise.allSettled(jobs.slice(i, i + 10).map((j) => j()));
            externalFailures += results.filter((r) => r.status === "rejected").length;
          }

          await deleteTenantKvData(env, tenantId);
          await env.DB.batch([
            env.DB.prepare(`DELETE FROM mongo_documents WHERE tenant_id = ?`).bind(tenantId),
            env.DB.prepare(`DELETE FROM media_files WHERE tenant_id = ?`).bind(tenantId),
            env.DB.prepare(`DELETE FROM tenant_request_usage WHERE tenant_id = ?`).bind(tenantId),
            env.DB.prepare(`DELETE FROM tenants WHERE tenant_id = ?`).bind(tenantId),
          ]);
          await auditLog(env, "delete", tenantId, `external failures: ${externalFailures}`);
          return jsonResponse({ success: true, externalFailures });
        }
      }

      return jsonResponse({ error: "Not Found" }, 404);
    }

    // 15. DASHBOARD: Account page — session-cookie authenticated
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/dashboard") {
      const session = readSession(request, env);
      if (!session) {
        return Response.redirect(`${url.origin}/api/v1/auth/github/login`, 302);
      }

      const row = await env.DB.prepare(
        `SELECT email, github_login, tier, api_key_last4, key_rotated_at, created_at, tier_expires_at FROM tenants WHERE tenant_id = ?`
      ).bind(session.tenantId).first<any>();

      if (!row) {
        return Response.redirect(`${url.origin}/api/v1/auth/github/login`, 302);
      }
      if (await isTenantBlocked(env, session.tenantId)) {
        return new Response("Your account has been blocked. Please contact support.", { status: 403 });
      }

      const docUsageResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(LENGTH(CAST(document_data AS BLOB))), 0) as total FROM mongo_documents WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ total: number }>();
      const mediaUsageResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(size), 0) as total FROM media_files WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ total: number }>();
      const collectionsResult = await env.DB.prepare(
        `SELECT COUNT(DISTINCT collection_name) as count FROM mongo_documents WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ count: number }>();
      const requestsThisMonth = await getMonthlyUsage(env, session.tenantId);
      const sqlStorageResult = await env.DB.prepare(
        `SELECT storage_bytes FROM tenant_sql_storage WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ storage_bytes: number }>().catch(() => null);
      const sqlMonthResult = await env.DB.prepare(
        `SELECT rows_read, rows_written FROM tenant_sql_usage WHERE tenant_id = ? AND usage_month = ?`
      ).bind(session.tenantId, getUsageMonth()).first<{ rows_read: number; rows_written: number }>().catch(() => null);

      return new Response(
        renderDashboardPage({
          tenantId: session.tenantId,
          email: row.email,
          githubLogin: row.github_login,
          currentTierId: row.tier || "free",
          tiers: TIERS,
          apiKeyLast4: row.api_key_last4,
          keyRotatedAt: row.key_rotated_at,
          createdAt: row.created_at,
          tierExpiresAt: row.tier_expires_at,
          usage: {
            docStorageBytes: docUsageResult?.total || 0,
            mediaStorageBytes: mediaUsageResult?.total || 0,
            collections: collectionsResult?.count || 0,
            requestsThisMonth,
            sqlStorageBytes: sqlStorageResult?.storage_bytes || 0,
            sqlRowsRead: sqlMonthResult?.rows_read || 0,
            sqlRowsWritten: sqlMonthResult?.rows_written || 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 15b. BILLING: Downgrade to Free — cancels PayPal billing immediately
    // (no further charges) but keeps the tenant on their current paid tier
    // until the already-paid-for period ends, then auto-downgrades.
    if (request.method === "POST" && url.pathname === "/api/v1/billing/paypal/downgrade-to-free") {
      const session = readSession(request, env);
      if (!session) return jsonResponse({ error: "Not logged in" }, 401);
      if (await isTenantBlocked(env, session.tenantId)) return jsonResponse({ error: "Account blocked" }, 403);

      const row = await env.DB.prepare(`SELECT tier, paypal_subscription_id FROM tenants WHERE tenant_id = ?`)
        .bind(session.tenantId)
        .first<{ tier: string; paypal_subscription_id: string | null }>();

      if (!row) return jsonResponse({ error: "Tenant not found" }, 404);
      if (row.tier === "free") {
        return jsonResponse({ error: "Already on the Free plan" }, 400);
      }

      if (!row.paypal_subscription_id) {
        // No subscription on file to honor a grace period against — downgrade now.
        await applyTierChange(env, session.tenantId, "free", null);
        return jsonResponse({ success: true, effectiveAt: "immediately" });
      }

      const subscription = await getSubscription(env, row.paypal_subscription_id);
      const graceUntil = subscription?.status === "ACTIVE" ? subscription.billing_info?.next_billing_time : undefined;

      if (subscription?.status === "ACTIVE") {
        await cancelSubscription(env, row.paypal_subscription_id, "Tenant requested downgrade to Free plan");
      }

      if (graceUntil) {
        await scheduleDowngradeToFree(env, session.tenantId, graceUntil);
        return jsonResponse({ success: true, effectiveAt: graceUntil });
      }

      await applyTierChange(env, session.tenantId, "free", null);
      return jsonResponse({ success: true, effectiveAt: "immediately" });
    }

    // 16. BILLING: Start a PayPal subscription checkout for a given plan
    if (request.method === "GET" && url.pathname === "/api/v1/billing/paypal/subscribe") {
      const session = readSession(request, env);
      if (!session) {
        return Response.redirect(`${url.origin}/api/v1/auth/github/login`, 302);
      }

      const planParam = url.searchParams.get("plan");
      const planId = planParam ? tierToPlanId(env, planParam) : null;
      if (!planId) {
        return jsonResponse({ error: "Unknown or unconfigured plan. Use ?plan=developer or ?plan=scale" }, 400);
      }

      try {
        const approveUrl = await createSubscription(
          env,
          planId,
          session.tenantId,
          `${url.origin}/api/v1/billing/paypal/return`,
          `${url.origin}/api/v1/billing/paypal/cancel`
        );
        return Response.redirect(approveUrl, 302);
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to start PayPal checkout" }, 500);
      }
    }

    // 17. BILLING: PayPal approval return — optimistic upgrade, webhook remains authoritative
    if (request.method === "GET" && url.pathname === "/api/v1/billing/paypal/return") {
      const subscriptionId = url.searchParams.get("subscription_id");

      if (subscriptionId) {
        try {
          const subscription = await getSubscription(env, subscriptionId);
          if (subscription?.status === "ACTIVE" && subscription.custom_id) {
            const tier = planIdToTier(env, subscription.plan_id);
            if (tier) {
              await applyTierChange(env, subscription.custom_id, tier, subscription.id);
              await reconcileTenant(env, subscription.custom_id);
            }
          }
        } catch (err: any) {
          console.error("PayPal return-path check failed:", err);
        }
      }

      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2;url=/dashboard"><title>Processing...</title></head>
         <body style="background:#090d16;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
           <p>Finishing up your subscription — redirecting to your dashboard…</p>
         </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // 18. BILLING: PayPal checkout cancelled by the user
    if (request.method === "GET" && url.pathname === "/api/v1/billing/paypal/cancel") {
      return Response.redirect(`${url.origin}/dashboard`, 302);
    }

    // 19. BILLING: PayPal webhook — the authoritative source of truth for tier changes
    if (request.method === "POST" && url.pathname === "/api/v1/billing/paypal/webhook") {
      const rawBody = await request.text();

      const verified = await verifyWebhookSignature(env, request, rawBody).catch(() => false);
      if (!verified) {
        return jsonResponse({ error: "Webhook signature verification failed" }, 401);
      }

      const event: any = JSON.parse(rawBody);
      const resource = event.resource || {};
      const type: string = event.event_type || "";

      // PayPal is the source of truth: on any subscription or payment event,
      // re-read the subscription from PayPal rather than trusting the payload.
      const subscriptionId: string | undefined = type.startsWith("BILLING.SUBSCRIPTION.")
        ? resource.id
        : type.startsWith("PAYMENT.SALE.")
          ? resource.billing_agreement_id
          : undefined;

      if (subscriptionId) {
        try {
          await handleSubscriptionEvent(env, subscriptionId);
        } catch (err: any) {
          console.error("PayPal webhook processing error:", err);
          return jsonResponse({ error: "Failed to process webhook" }, 500);
        }
      }

      return jsonResponse({ received: true });
    }

    return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
  },

  // Sweeps elapsed downgrade-to-Free grace periods and re-reads stale subscriptions from PayPal (webhook safety net).
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(processExpiredDowngrades(env));
    ctx.waitUntil(reconcileStaleTenants(env).catch((err) => console.error("PayPal reconcile failed:", err)));
  },
};

async function loadAdminData(env: Env) {
  const azureCfg = getAzureConfig(env);
  const [tenantRows, docRows, mediaRows, auditRows] = await Promise.all([
    env.DB.prepare(
      `SELECT tenant_id, email, github_login, tier, tier_expires_at, created_at, last_seen_at, blocked_at, admin_notes, admin_tags,
              paypal_subscription_id, paypal_status, paypal_plan_id, paypal_payer_email, paypal_price_monthly, paypal_currency,
              paypal_last_payment, paypal_last_payment_at, paypal_next_billing_at, paypal_failed_payments, paypal_collected_30d, paypal_synced_at
       FROM tenants ORDER BY created_at DESC`
    ).all<any>(),
    env.DB.prepare(
      `SELECT tenant_id, COUNT(*) AS docs, COUNT(DISTINCT collection_name) AS collections, COALESCE(SUM(LENGTH(CAST(document_data AS BLOB))), 0) AS bytes FROM mongo_documents GROUP BY tenant_id`
    ).all<any>(),
    env.DB.prepare(
      `SELECT tenant_id, COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes FROM media_files GROUP BY tenant_id`
    ).all<any>(),
    env.DB.prepare(`SELECT at, action, tenant_id, detail FROM admin_audit ORDER BY id DESC LIMIT 30`).all<any>(),
  ]);
  let requestRows: { results: Array<{ tenant_id: string; request_count: number }> };
  try {
    requestRows = await env.DB.prepare(
      `SELECT tenant_id, request_count FROM tenant_request_usage WHERE usage_month = ?`
    ).bind(getUsageMonth()).all<{ tenant_id: string; request_count: number }>();
  } catch (err) {
    console.error("Admin request usage lookup failed:", err);
    requestRows = { results: [] };
  }
  const docMap = new Map<string, any>(docRows.results.map((r) => [r.tenant_id, r]));
  const mediaMap = new Map<string, any>(mediaRows.results.map((r) => [r.tenant_id, r]));
  const requestMap = new Map<string, number>(requestRows.results.map((r) => [r.tenant_id, r.request_count]));

  const tierCounts: Record<string, number> = {};
  const totals = { documents: 0, docBytes: 0, mediaFiles: 0, mediaBytes: 0 };
  const tenants = tenantRows.results.map((r) => {
    const plan = getTier(r.tier);
    const d = docMap.get(r.tenant_id);
    const m = mediaMap.get(r.tenant_id);
    tierCounts[plan.name] = (tierCounts[plan.name] || 0) + 1;
    totals.documents += d?.docs || 0;
    totals.docBytes += d?.bytes || 0;
    totals.mediaFiles += m?.files || 0;
    totals.mediaBytes += m?.bytes || 0;

    const synced = !!r.paypal_synced_at;
    let mismatch = "";
    if (synced) {
      const paypalTier = r.paypal_status === "ACTIVE" ? planIdToTier(env, r.paypal_plan_id) : null;
      if (paypalTier && paypalTier !== plan.id) mismatch = `PayPal bills ${paypalTier}, EasyDB has ${plan.id}`;
      else if (!paypalTier && plan.id !== "free" && !r.tier_expires_at) mismatch = `PayPal status ${r.paypal_status}, EasyDB has ${plan.id}`;
    } else if (r.paypal_subscription_id) {
      mismatch = "";
    } else if (plan.id !== "free") {
      mismatch = `Paid plan ${plan.id} with no PayPal subscription`;
    }

    return {
      tenantId: r.tenant_id as string,
      email: r.email as string | null,
      githubLogin: r.github_login as string,
      tier: plan.id as string,
      tierName: plan.name,
      priceUsd: plan.priceUsd,
      tierExpiresAt: r.tier_expires_at as string | null,
      createdAt: r.created_at as string | null,
      lastSeenAt: r.last_seen_at as string | null,
      blocked: !!r.blocked_at,
      notes: (r.admin_notes || "") as string,
      tags: (r.admin_tags || "") as string,
      documents: d?.docs || 0,
      collections: d?.collections || 0,
      docBytes: d?.bytes || 0,
      mediaFiles: m?.files || 0,
      mediaBytes: m?.bytes || 0,
      docQuotaBytes: plan.docStorageBytes,
      mediaQuotaBytes: plan.mediaStorageBytes,
      requestsThisMonth: requestMap.get(r.tenant_id) || 0,
      requestQuota: plan.requestsPerMonth,
      paypal: {
        subscriptionId: (r.paypal_subscription_id || null) as string | null,
        synced,
        status: (r.paypal_status || null) as string | null,
        payerEmail: (r.paypal_payer_email || null) as string | null,
        priceMonthly: (r.paypal_price_monthly ?? null) as number | null,
        currency: (r.paypal_currency || null) as string | null,
        lastPayment: (r.paypal_last_payment ?? null) as number | null,
        lastPaymentAt: (r.paypal_last_payment_at || null) as string | null,
        nextBillingAt: (r.paypal_next_billing_at || null) as string | null,
        failedPayments: (r.paypal_failed_payments ?? 0) as number,
        collected30d: (r.paypal_collected_30d ?? 0) as number,
        syncedAt: (r.paypal_synced_at || null) as string | null,
        mismatch,
      },
    };
  });
  const audit = auditRows.results.map((r) => ({
    at: r.at as string, action: r.action as string, tenantId: (r.tenant_id || "") as string, detail: (r.detail || "") as string,
  }));
  const azure = { account: azureCfg.account, table: azureCfg.tableName, container: azureCfg.containerName };
  return { tenants, tierCounts, totals, audit, azure };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
