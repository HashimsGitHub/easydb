import crypto from "node:crypto";

export interface AzureConfig {
  account: string;
  accountKey: string;
  tableName: string;
  containerName: string;
}

export function getAzureConfig(env: Record<string, any>): AzureConfig {
  const account = env.AZURE_STORAGE_ACCOUNT || "smartlms";
  const accountKey = env.AZURE_STORAGE_ACCESS_KEY || "";
  const tableName = env.AZURE_TABLE_NAME || "easydb";
  const containerName = env.AZURE_CONTAINER_NAME || "easydb-media-content";

  if (!accountKey) {
    console.warn("WARNING: AZURE_STORAGE_ACCESS_KEY is not set.");
  }

  return {
    account,
    accountKey,
    tableName,
    containerName,
  };
}

/**
 * Signs Azure Table Storage requests using SharedKeyLite
 */
function signTableSharedKeyLite(accountKey: string, date: string, canonicalizedResource: string): string {
  const strToSign = `${date}\n${canonicalizedResource}`;
  const keyBuffer = Buffer.from(accountKey, "base64");
  return crypto.createHmac("sha256", keyBuffer).update(strToSign, "utf8").digest("base64");
}

/**
 * Signs Azure Blob Storage requests using SharedKey
 */
function signBlobSharedKey(
  accountKey: string,
  verb: string,
  canonicalizedHeaders: string,
  canonicalizedResource: string,
  contentLength: number | string = "",
  contentType = ""
): string {
  const strToSign = [
    verb.toUpperCase(),
    "", // Content-Encoding
    "", // Content-Language
    contentLength === 0 || contentLength === "0" ? "" : contentLength.toString(),
    "", // Content-MD5
    contentType,
    "", // Date (empty because x-ms-date is provided)
    "", // If-Modified-Since
    "", // If-Match
    "", // If-None-Match
    "", // If-Unmodified-Since
    "", // Range
    canonicalizedHeaders + canonicalizedResource,
  ].join("\n");

  const keyBuffer = Buffer.from(accountKey, "base64");
  return crypto.createHmac("sha256", keyBuffer).update(strToSign, "utf8").digest("base64");
}

/**
 * Azure Table Storage Operations (JSON Document Persistence)
 */
export async function syncDocumentToAzure(
  config: AzureConfig,
  tenantId: string,
  collection: string,
  docId: string,
  data: Record<string, any>
) {
  const partitionKey = `${tenantId}__${collection}`;
  const date = new Date().toUTCString();
  const resource = `/${config.account}/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;
  const signature = signTableSharedKeyLite(config.accountKey, date, resource);

  const payload = {
    PartitionKey: partitionKey,
    RowKey: docId,
    data: JSON.stringify(data),
    updatedAt: new Date().toISOString(),
  };

  const url = `https://${config.account}.table.core.windows.net/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "x-ms-date": date,
      "x-ms-version": "2019-02-02",
      "Content-Type": "application/json",
      Accept: "application/json;odata=nometadata",
      Authorization: `SharedKeyLite ${config.account}:${signature}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Table PUT failed (${response.status}): ${errorText}`);
  }

  return payload;
}

export async function getDocumentFromAzure(
  config: AzureConfig,
  tenantId: string,
  collection: string,
  docId: string
) {
  const partitionKey = `${tenantId}__${collection}`;
  const date = new Date().toUTCString();
  const resource = `/${config.account}/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;
  const signature = signTableSharedKeyLite(config.accountKey, date, resource);

  const url = `https://${config.account}.table.core.windows.net/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-ms-date": date,
      "x-ms-version": "2019-02-02",
      Accept: "application/json;odata=nometadata",
      Authorization: `SharedKeyLite ${config.account}:${signature}`,
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Table GET failed (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();
  return {
    _id: result.RowKey,
    ...JSON.parse(result.data || "{}"),
    _azureUpdatedAt: result.updatedAt || result.Timestamp,
  };
}

export async function deleteDocumentFromAzure(
  config: AzureConfig,
  tenantId: string,
  collection: string,
  docId: string
) {
  const partitionKey = `${tenantId}__${collection}`;
  const date = new Date().toUTCString();
  const resource = `/${config.account}/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;
  const signature = signTableSharedKeyLite(config.accountKey, date, resource);

  const url = `https://${config.account}.table.core.windows.net/${config.tableName}(PartitionKey='${encodeURIComponent(partitionKey)}',RowKey='${encodeURIComponent(docId)}')`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "x-ms-date": date,
      "x-ms-version": "2019-02-02",
      "If-Match": "*",
      Accept: "application/json;odata=nometadata",
      Authorization: `SharedKeyLite ${config.account}:${signature}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Azure Table DELETE failed (${response.status}): ${errorText}`);
  }
}

/**
 * Azure Blob Storage Operations (Media & Static Files)
 */
export async function uploadMediaToAzure(
  config: AzureConfig,
  fileName: string,
  content: ArrayBuffer | Uint8Array,
  contentType = "application/octet-stream"
) {
  const date = new Date().toUTCString();
  const msVersion = "2023-11-03";
  const blobType = "BlockBlob";
  const buffer = content instanceof Uint8Array ? content : new Uint8Array(content);
  const contentLength = buffer.byteLength;

  const canonicalizedHeaders = `x-ms-blob-type:${blobType}\nx-ms-date:${date}\nx-ms-version:${msVersion}\n`;
  const canonicalizedResource = `/${config.account}/${config.containerName}/${fileName}`;

  const signature = signBlobSharedKey(
    config.accountKey,
    "PUT",
    canonicalizedHeaders,
    canonicalizedResource,
    contentLength,
    contentType
  );

  const url = `https://${config.account}.blob.core.windows.net/${config.containerName}/${fileName}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "x-ms-date": date,
      "x-ms-version": msVersion,
      "x-ms-blob-type": blobType,
      "Content-Type": contentType,
      "Content-Length": contentLength.toString(),
      Authorization: `SharedKey ${config.account}:${signature}`,
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Blob PUT failed (${response.status}): ${errorText}`);
  }

  return url;
}

export async function deleteMediaFromAzure(config: AzureConfig, fileName: string) {
  const date = new Date().toUTCString();
  const msVersion = "2023-11-03";
  const canonicalizedHeaders = `x-ms-date:${date}\nx-ms-version:${msVersion}\n`;
  const canonicalizedResource = `/${config.account}/${config.containerName}/${fileName}`;

  const signature = signBlobSharedKey(
    config.accountKey,
    "DELETE",
    canonicalizedHeaders,
    canonicalizedResource
  );

  const url = `https://${config.account}.blob.core.windows.net/${config.containerName}/${fileName}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "x-ms-date": date,
      "x-ms-version": msVersion,
      Authorization: `SharedKey ${config.account}:${signature}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Azure Blob DELETE failed (${response.status}): ${errorText}`);
  }
}

export function getMediaBlobUrl(config: AzureConfig, fileName: string) {
  return `https://${config.account}.blob.core.windows.net/${config.containerName}/${fileName}`;
}
