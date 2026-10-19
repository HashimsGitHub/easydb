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
import { renderLandingPage } from "./frontend";

export interface Env {
  DB: D1Database;
  AZURE_STORAGE_ACCOUNT?: string;
  AZURE_STORAGE_ACCESS_KEY?: string;
  AZURE_TABLE_NAME?: string;
  AZURE_CONTAINER_NAME?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Public Sandbox Safeguard: Enforce demo_store tenant
    const requestedTenant = request.headers.get("x-tenant-id");
    if (requestedTenant && requestedTenant !== "demo_store") {
      return jsonResponse({
        error: "Access Denied: Public preview sandbox is strictly restricted to 'demo_store'. Custom tenant creation is disabled until user onboarding is released.",
        quotaNotice: "Public sandbox quota: 100 documents and 5 media files for 'demo_store'."
      }, 403);
    }
    const tenantId = "demo_store";
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

      // Quota check: Limit demo_store to 100 documents
      const docCountResult = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM mongo_documents WHERE tenant_id = ?`
      ).bind(tenantId).first<{ count: number }>();
      const currentDocCount = docCountResult?.count || 0;

      const existingDoc = await env.DB.prepare(
        `SELECT 1 FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(tenantId, collection, docId).first();

      if (!existingDoc && currentDocCount >= 100) {
        return jsonResponse({
          error: "Sandbox Quota Exceeded: The 'demo_store' database has reached the 100 document limit. Please delete existing documents or wait for user onboarding to create custom databases.",
          quota: {
            maxDocuments: 100,
            currentDocuments: currentDocCount,
            status: "LIMIT_REACHED"
          }
        }, 429);
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

      // Quota check: Limit demo_store to 5 media files
      const fileCountResult = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM media_files WHERE tenant_id = ?`
      ).bind(tenantId).first<{ count: number }>();
      const currentFileCount = fileCountResult?.count || 0;

      const existingFile = await env.DB.prepare(
        `SELECT 1 FROM media_files WHERE tenant_id = ? AND file_name = ?`
      ).bind(tenantId, fileName).first();

      if (!existingFile && currentFileCount >= 5) {
        return jsonResponse({
          error: "Sandbox Quota Exceeded: The 'demo_store' media store has reached its 5 file limit. Please delete an existing file using DELETE /api/v1/media/delete before uploading new media.",
          quota: {
            maxFiles: 5,
            currentFiles: currentFileCount,
            status: "LIMIT_REACHED"
          }
        }, 429);
      }

      // Upload to Azure Blob
      const blobUrl = await uploadMediaToAzure(azureConfig, fileName, fileBuffer, mimeType);

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

      await deleteMediaFromAzure(azureConfig, fileName);

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

      const blobRes = await downloadMediaFromAzure(azureConfig, fileName);
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

    return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
  },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
