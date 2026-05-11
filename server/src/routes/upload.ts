import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadRouter = Router();

uploadRouter.post("/", authMiddleware, async (req, res) => {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      res.status(500).json({ error: "Cloudinary is not configured on the server" });
      return;
    }

    const { image } = req.body; // Base64 string "data:image/jpeg;base64,..."
    if (!image) {
      res.status(400).json({ error: "Missing image" });
      return;
    }

    // Upload directly to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "dorm67", // Organize images in a folder
      resource_type: "auto",
    });

    // Return the Cloudinary public URL
    res.json({ url: uploadResponse.secure_url });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: "Failed to upload image to cloud" });
  }
});
