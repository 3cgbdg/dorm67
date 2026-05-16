import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../../config.js";

function createS3Client() {
  const endpoint = env.S3_ENDPOINT?.trim();
  return new S3Client({
    region: env.S3_REGION,
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

const s3 = createS3Client();

function requireBucket(): string {
  return env.S3_BUCKET;
}

export async function uploadBytes(
  storagePath: string,
  buf: Buffer,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: storagePath,
      Body: buf,
      ContentType: contentType,
      CacheControl: "private, max-age=0",
    })
  );
}

export async function downloadBytes(storagePath: string): Promise<Buffer> {
  const out = await s3.send(
    new GetObjectCommand({
      Bucket: requireBucket(),
      Key: storagePath,
    })
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Storage object not found: ${storagePath}`);
  return Buffer.from(bytes);
}

export async function listPathsWithPrefix(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({
        Bucket: requireBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of out.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

export async function deleteFilesWithPrefix(prefix: string): Promise<void> {
  const keys = await listPathsWithPrefix(prefix);
  await Promise.all(
    keys.map((key) =>
      s3
        .send(
          new DeleteObjectCommand({
            Bucket: requireBucket(),
            Key: key,
          })
        )
        .catch(() => undefined)
    )
  );
}

export function publicUrlFor(storagePath: string): string {
  const base = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  const key = storagePath.replace(/^\/+/, "");
  return `${base}/${key}`;
}
