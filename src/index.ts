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
import { renderLandingPage, renderAuthResultPage, renderDashboardPage } from "./frontend";
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
  createSessionCookie,
  clearSessionCookie,
  readSession,
  recordRequestUsage,
  getMonthlyUsage,
} from "./auth";
import { TIERS, getTier, formatBytes } from "./tiers";

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
}

const OAUTH_STATE_COOKIE = "edb_oauth_state";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const tenantContext = await resolveTenantContext(request, env);
    if (tenantContext instanceof Response) return tenantContext;

    const { tenantId, tier, authenticated } = tenantContext;
    if (authenticated) {
      // Fire-and-forget (not awaited): best-effort usage counter for the
      // dashboard only, never allowed to add latency or fail the real request.
      recordRequestUsage(env, tenantId);
    }
    const azureConfig = getAzureConfig(env);

    const heroUrl = getMediaBlobUrl(azureConfig, "EasyDB_Hero-Image.webp");
    const iconUrl = getMediaBlobUrl(azureConfig, "EasyDB-icon.webp");

    // Root: Landing Page or JSON
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      const acceptHeader = request.headers.get("accept") || "";
      if (acceptHeader.includes("application/json")) {
        return jsonResponse({
          status: "healthy",
          name: "EasyDB",
          message: "EasyDB Edge Server Running 🚀",
          heroImageUrl: heroUrl,
          logoIconUrl: iconUrl,
          version: "1.0.0",
        });
      }

      return new Response(renderLandingPage(heroUrl, iconUrl), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Health Endpoint (Always JSON)
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/health") {
      return jsonResponse({
        status: "healthy",
        message: "EasyDB Server Running 🚀",
        heroImageUrl: heroUrl,
        logoIconUrl: iconUrl,
        storage: {
          d1: "Connected (SQLite Edge Index)",
          engine: "Connected (Infinite Document Storage)",
          media: "Connected (Edge Media Store)",
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
              `SELECT LENGTH(document_data) as len FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
            ).bind(tenantId, collection, docId).first<{ len: number }>()
          : null;
        const sizeResult = await env.DB.prepare(
          `SELECT COALESCE(SUM(LENGTH(document_data)), 0) as total FROM mongo_documents WHERE tenant_id = ?`
        ).bind(tenantId).first<{ total: number }>();
        const currentBytes = sizeResult?.total || 0;
        const projectedBytes = currentBytes - (existingSizeResult?.len || 0) + Buffer.byteLength(documentData);

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

      // A. Update Cloudflare D1
      await env.DB.prepare(
        `UPDATE mongo_documents SET document_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(JSON.stringify(updateData), tenantId, collection, docId).run();

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
        const projectedBytes = currentBytes - (existingFileRow?.size || 0) + fileBuffer.byteLength;

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
        blobUrl,
        size: fileBuffer.byteLength,
        contentType: mimeType,
      });
    }

    // 6. MEDIA: List Indexed Media
    if (request.method === "GET" && url.pathname === "/api/v1/media/list") {
      const { results } = await env.DB.prepare(
        `SELECT file_name, blob_url, content_type, size, created_at FROM media_files WHERE tenant_id = ?`
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

      const callbackHeaders = new Headers({ "Content-Type": "text/html; charset=utf-8" });
      callbackHeaders.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`);
      callbackHeaders.append("Set-Cookie", createSessionCookie(result.tenantId, env));

      return new Response(
        renderAuthResultPage({
          tenantId: result.tenantId,
          isNew: result.isNew,
          apiSecret: result.apiSecret,
          email: result.email,
          needsEmail: !result.email,
        }),
        { status: 200, headers: callbackHeaders }
      );
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
        },
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

    // 14. DASHBOARD: Session-authenticated rotate — the real "I lost my key" recovery path
    if (request.method === "POST" && url.pathname === "/api/v1/auth/dashboard/rotate-key") {
      const session = readSession(request, env);
      if (!session) return jsonResponse({ error: "Not logged in" }, 401);

      try {
        const newApiSecret = await rotateKeyForTenant(env, session.tenantId);
        return jsonResponse({ success: true, apiSecret: newApiSecret });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to rotate API key" }, 400);
      }
    }

    // 15. DASHBOARD: Account page — session-cookie authenticated
    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/dashboard") {
      const session = readSession(request, env);
      if (!session) {
        return Response.redirect(`${url.origin}/api/v1/auth/github/login`, 302);
      }

      const row = await env.DB.prepare(
        `SELECT email, github_login, tier, api_key_last4, key_rotated_at, created_at FROM tenants WHERE tenant_id = ?`
      ).bind(session.tenantId).first<any>();

      if (!row) {
        return Response.redirect(`${url.origin}/api/v1/auth/github/login`, 302);
      }

      const docUsageResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(LENGTH(document_data)), 0) as total FROM mongo_documents WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ total: number }>();
      const mediaUsageResult = await env.DB.prepare(
        `SELECT COALESCE(SUM(size), 0) as total FROM media_files WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ total: number }>();
      const collectionsResult = await env.DB.prepare(
        `SELECT COUNT(DISTINCT collection_name) as count FROM mongo_documents WHERE tenant_id = ?`
      ).bind(session.tenantId).first<{ count: number }>();
      const requestsThisMonth = await getMonthlyUsage(env, session.tenantId);

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
          usage: {
            docStorageBytes: docUsageResult?.total || 0,
            mediaStorageBytes: mediaUsageResult?.total || 0,
            collections: collectionsResult?.count || 0,
            requestsThisMonth,
          },
        }),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
  },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
