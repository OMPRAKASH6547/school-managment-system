import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function envFlag(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (!v) return fallback;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/g, "");
}

function trimBothSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  const region = process.env.S3_REGION?.trim() || "ap-south-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const forcePathStyle = envFlag("S3_FORCE_PATH_STYLE", false);
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  const prefix = trimBothSlashes(process.env.S3_PREFIX?.trim() || "school-saas");
  const enabled = envFlag("S3_ENABLED", false);
  const acl = process.env.S3_ACL?.trim() || "public-read";

  return {
    enabled,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle,
    publicBaseUrl,
    prefix,
    acl,
  };
}

export function isS3UploadEnabled(): boolean {
  const cfg = getS3Config();
  return Boolean(cfg.enabled && cfg.bucket && cfg.region && cfg.accessKeyId && cfg.secretAccessKey);
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  const cfg = getS3Config();
  if (!cfg.bucket || !cfg.region || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("S3 is not fully configured");
  }
  s3Client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint || undefined,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return s3Client;
}

function s3PublicUrlForKey(key: string): string {
  const cfg = getS3Config();
  const cleanKey = trimBothSlashes(key);
  if (cfg.publicBaseUrl) return `${trimSlash(cfg.publicBaseUrl)}/${cleanKey}`;
  if (!cfg.bucket) throw new Error("S3 bucket missing");
  if (cfg.endpoint) return `${trimSlash(cfg.endpoint)}/${cfg.bucket}/${cleanKey}`;
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${cleanKey}`;
}

export function buildS3ObjectKey(pathSegments: string[]): string {
  const cfg = getS3Config();
  const body = pathSegments.map((s) => trimBothSlashes(s)).filter(Boolean).join("/");
  return cfg.prefix ? `${cfg.prefix}/${body}` : body;
}

export async function uploadBufferToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; url: string }> {
  const cfg = getS3Config();
  if (!cfg.bucket) throw new Error("S3 bucket missing");

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: trimBothSlashes(params.key),
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl || "public, max-age=31536000, immutable",
      ACL: cfg.acl as "private" | "public-read" | "public-read-write" | "authenticated-read",
    })
  );

  return { key: trimBothSlashes(params.key), url: s3PublicUrlForKey(params.key) };
}
