import { admin } from "./src/firebaseAdmin.js";

async function setCors() {
  const buckets = ["dorm67.appspot.com", "dorm67.firebasestorage.app"];
  
  for (const bucketName of buckets) {
    console.log(`Trying to set CORS for ${bucketName}...`);
    try {
      const bucket = admin.storage().bucket(bucketName);
      await bucket.setCorsConfiguration([
        {
          origin: ["*"],
          method: ["GET", "PUT", "POST", "DELETE", "OPTIONS", "PATCH"],
          maxAgeSeconds: 3600,
          responseHeader: [
            "Content-Type",
            "Authorization",
            "Content-Length",
            "User-Agent",
            "x-goog-resumable",
            "x-goog-upload-protocol",
          ],
        },
      ]);
      console.log(`Success! CORS set for ${bucketName}`);
    } catch (e: any) {
      if (e.code === 404) {
        console.log(`Bucket ${bucketName} not found, skipping.`);
      } else {
        console.error(`Error for ${bucketName}:`, e.message);
      }
    }
  }
}

setCors().catch(console.error);
