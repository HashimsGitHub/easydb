export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const tenantId = request.headers.get("x-tenant-id") || "default_tenant";

    // 1. CREATE (Insert)
    if (request.method === "POST" && url.pathname === "/api/v1/insert") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id || crypto.randomUUID();
      const documentData = JSON.stringify(body.data || {});

      await env.DB.prepare(
        `INSERT INTO mongo_documents (tenant_id, collection_name, doc_id, document_data) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT(tenant_id, collection_name, doc_id) 
         DO UPDATE SET document_data = excluded.document_data, updated_at = CURRENT_TIMESTAMP`
      ).bind(tenantId, collection, docId, documentData).run();

      return jsonResponse({ success: true, insertedId: docId });
    }

    // 2. READ (Find)
    if (request.method === "POST" && url.pathname === "/api/v1/find") {
      const body: any = await request.json().catch(() => ({}));
      const collection = body.collection || "items";

      const { results } = await env.DB.prepare(
        `SELECT doc_id, document_data FROM mongo_documents WHERE tenant_id = ? AND collection_name = ?`
      ).bind(tenantId, collection).all();

      const documents = results.map((r: any) => ({
        _id: r.doc_id,
        ...JSON.parse(r.document_data)
      }));

      return jsonResponse({ success: true, documents });
    }

    // 3. UPDATE
    if (request.method === "PUT" && url.pathname === "/api/v1/update") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id;
      const updateData = JSON.stringify(body.data || {});

      if (!docId) return jsonResponse({ error: "Missing document ID for update" }, 400);

      await env.DB.prepare(
        `UPDATE mongo_documents SET document_data = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(updateData, tenantId, collection, docId).run();

      return jsonResponse({ success: true, updatedId: docId });
    }

    // 4. DELETE
    if (request.method === "DELETE" && url.pathname === "/api/v1/delete") {
      const body: any = await request.json();
      const collection = body.collection || "items";
      const docId = body.id;

      if (!docId) return jsonResponse({ error: "Missing document ID for deletion" }, 400);

      await env.DB.prepare(
        `DELETE FROM mongo_documents WHERE tenant_id = ? AND collection_name = ? AND doc_id = ?`
      ).bind(tenantId, collection, docId).run();

      return jsonResponse({ success: true, deletedId: docId });
    }

    return new Response("EasyDB Local CRUD Server Running 🚀", { status: 200 });
  },
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
