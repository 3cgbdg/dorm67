import { admin } from "../../firebaseAdmin.js";
import { env } from "../../config.js";

export function tarasBucket() {
  if (env.FIREBASE_STORAGE_BUCKET) {
    return admin.storage().bucket(env.FIREBASE_STORAGE_BUCKET);
  }
  return admin.storage().bucket();
}

export async function uploadBytes(
  storagePath: string,
  buf: Buffer,
  contentType: string
): Promise<void> {
  await tarasBucket().file(storagePath).save(buf, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
}

export async function downloadBytes(storagePath: string): Promise<Buffer> {
  const [buf] = await tarasBucket().file(storagePath).download();
  return buf;
}

export async function deleteFilesWithPrefix(prefix: string): Promise<void> {
  const [files] = await tarasBucket().getFiles({ prefix });
  await Promise.all(files.map((f: { delete: () => Promise<unknown> }) => f.delete().catch(() => undefined)));
}
