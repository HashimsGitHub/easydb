import {
  getAzureConfig,
  syncDocumentToAzure,
  deleteDocumentFromAzure,
  getDocumentFromAzure,
  uploadMediaToAzure,
  deleteMediaFromAzure,
  getMediaBlobUrl,
} from "./azure";

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
    const tenantId = request.headers.get("x-tenant-id") || "default_tenant";
    const azureConfig = getAzureConfig(env);

    // Root Health & Info
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse({
        status: "healthy",
        message: "EasyDB Local CRUD Server Running 🚀",
        heroImageUrl: getMediaBlobUrl(azureConfig, "EasyDB_Hero-Image.jpeg"),
        storage: {
          d1: "Connected (SQLite Edge Index)",
          azureTable: `Connected (${azureConfig.tableName} @ ${azureConfig.account})`,
          azureBlob: `Connected (${azureConfig.containerName} @ ${azureConfig.account})`,
        },
      });
    }

    // Hero image redirect endpoint
    if (request.method === "GET" && url.pathname === "/api/v1/hero") {
      const heroUrl = getMediaBlobUrl(azureConfig, "EasyDB_Hero-Image.jpeg");
      return Response.redirect(heroUrl, 302);
    }

    // 1. CREATE (Insert)
    if (request.method === "POST" && url.pathname === "/api/v1/insert") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id || crypto.randomUUID();
      const docData = body.data || {};
      const documentData = JSON.stringify(docData);

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

    return jsonResponse({ error: "Not Found", path: url.pathname }, 404);
  },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
