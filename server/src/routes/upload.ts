import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../../uploads");

export const uploadRouter = Router();

uploadRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { image } = req.body; // Base64 string "data:image/jpeg;base64,..."
    if (!image) {
      res.status(400).json({ error: "Missing image" });
      return;
    }

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: "Invalid base64 string" });
      return;
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);

    // Return the public URL
    const url = `${env.CLIENT_ORIGIN === "http://localhost:5173" ? "http://localhost:8080" : "http://localhost:8080"}/uploads/${filename}`;
    
    res.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});
