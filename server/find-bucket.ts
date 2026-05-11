import { admin } from "./src/firebaseAdmin.js";

async function listBuckets() {
  const [buckets] = await admin.storage().bucket("dummy").storage.getBuckets();
  console.log("Found buckets:");
  buckets.forEach(b => console.log(b.name));
  
  if (buckets.length > 0) {
    const b = buckets[0];
    console.log(`Setting CORS for ${b.name}...`);
    await b.setCorsConfiguration([
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
    console.log("CORS set for", b.name);
  }
}

listBuckets().catch(console.error);
