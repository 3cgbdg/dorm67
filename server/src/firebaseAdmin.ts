import admin from "firebase-admin";
import { env } from "./config.js";

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n").replace(/\r/g, "");
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
      }),
    });
  } catch (error) {
    throw new Error(
      [
        "Firebase Admin initialization failed.",
        "Check server/.env FIREBASE_PRIVATE_KEY format.",
        "Expected: quoted key with escaped newlines (\\n) from service-account private_key.",
        `Original error: ${(error as Error).message}`,
      ].join(" ")
    );
  }
}

export { admin };
