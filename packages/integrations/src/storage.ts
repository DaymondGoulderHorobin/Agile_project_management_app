import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

export type StoredObject = Readonly<{
  key: string;
  contentType: string;
  bytes: Uint8Array;
  sha256: string;
  metadata: Readonly<Record<string, string>>;
}>;

export interface ObjectStorage {
  put(value: StoredObject): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.,=+@-]{0,1023}$/u.test(key) || key.includes("..")) {
    throw new Error("Object key is invalid");
  }
  return key;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function tenantObjectKey(organisationId: string, objectId: string, filename: string): string {
  const safeFilename = filename.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return safeKey(`organisations/${organisationId}/objects/${objectId}/${safeFilename || "upload"}`);
}

export function quarantineObjectKey(incidentId: string): string {
  return safeKey(`quarantine/${incidentId}/restricted-object`);
}

export class S3ObjectStorage implements ObjectStorage {
  readonly #client: S3Client;

  public constructor(private readonly bucket: string, config: S3ClientConfig) {
    this.#client = new S3Client(config);
  }

  public async put(value: StoredObject): Promise<void> {
    if (sha256(value.bytes) !== value.sha256) throw new Error("Object checksum does not match");
    await this.#client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: safeKey(value.key),
      Body: value.bytes,
      ContentType: value.contentType,
      ChecksumSHA256: Buffer.from(value.sha256, "hex").toString("base64"),
      Metadata: { ...value.metadata, sha256: value.sha256 },
      ServerSideEncryption: "AES256",
    }));
  }

  public async get(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.#client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) return null;
      return {
        key,
        bytes,
        contentType: result.ContentType ?? "application/octet-stream",
        sha256: result.Metadata?.sha256 ?? sha256(bytes),
        metadata: result.Metadata ?? {},
      };
    } catch (error) {
      if (typeof error === "object" && error !== null && "$metadata" in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null;
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      await this.#client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      return true;
    } catch (error) {
      if (typeof error === "object" && error !== null && "$metadata" in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
}

export class MemoryObjectStorage implements ObjectStorage {
  readonly #objects = new Map<string, StoredObject>();

  public async put(value: StoredObject): Promise<void> {
    safeKey(value.key);
    if (sha256(value.bytes) !== value.sha256) throw new Error("Object checksum does not match");
    this.#objects.set(value.key, structuredClone(value));
  }

  public async get(key: string): Promise<StoredObject | null> {
    const value = this.#objects.get(safeKey(key));
    return value ? structuredClone(value) : null;
  }

  public async exists(key: string): Promise<boolean> {
    return this.#objects.has(safeKey(key));
  }

  public async delete(key: string): Promise<void> {
    this.#objects.delete(safeKey(key));
  }
}
