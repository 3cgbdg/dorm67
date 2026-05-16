import express from "express";
import cors from "cors";
import { env } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { listingsRouter } from "./routes/listings.js";
import { aiRouter } from "./routes/ai.js";
import { aiTarasRouter } from "./routes/aiTaras.js";
import { uploadRouter } from "./routes/upload.js";
import { authMiddleware } from "./middleware/auth.js";
import { startAiTaskListener } from "./services/aiQueue.js";
import { startTarasQueueListener } from "./services/tarasQueue.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

app.use("/health", healthRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/ai", authMiddleware, aiRouter);
app.use("/api/ai/taras", authMiddleware, aiTarasRouter);
app.use("/api/upload", uploadRouter);

// Start AI background workers
startAiTaskListener();
startTarasQueueListener();

app.listen(Number(env.PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Dorm67 server listening on :${env.PORT}`);
});
