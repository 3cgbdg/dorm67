import { admin } from "./src/firebaseAdmin.js";

async function listBuckets() {
  const [buckets] = await admin.storage().storage.getBuckets();
  console.log("Available buckets:");
  buckets.forEach(b => console.log(b.name));
}

listBuckets().catch(console.error);
