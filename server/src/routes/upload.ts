import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import { authMiddleware } from "../middleware/auth.js";
import { publicUrlFor, uploadBytes } from "../services/taras/storage.js";

export const uploadRouter = Router();

uploadRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { image } = req.body; // Base64 string "data:image/jpeg;base64,..."
    if (!image) {
      res.status(400).json({ error: "Missing image" });
      return;
    }

    const m = String(image).match(/^data:(.+);base64,(.+)$/);
    if (!m) {
      res.status(400).json({ error: "Invalid image payload" });
      return;
    }
    const base64 = m[2];
    const buf = Buffer.from(base64, "base64");
    const ft = await fileTypeFromBuffer(buf);
    if (!ft?.mime.startsWith("image/")) {
      res.status(400).json({ error: "Only image uploads are allowed" });
      return;
    }
    const ext = ft.ext === "png" ? "png" : ft.ext === "webp" ? "webp" : "jpg";
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    await uploadBytes(key, buf, ft.mime);

    // Return a public CDN URL (or bucket public base URL)
    res.json({ url: publicUrlFor(key) });
  } catch (error) {
    console.error("S3 upload error:", error);
    res.status(500).json({ error: "Failed to upload image to storage" });
  }
});
