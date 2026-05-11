import { Router } from "express";
import { z } from "zod";
import { type AuthRequest, authMiddleware } from "../middleware/auth.js";
import { enhanceListingDescription } from "../services/openai.js";
import { consumeAiEnhanceQuota } from "../services/aiUsage.js";

export const listingsRouter = Router();

const enhanceSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
});

listingsRouter.post("/enhance", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = enhanceSchema.parse(req.body);
    const quota = await consumeAiEnhanceQuota(req.userId);
    if (!quota.allowed) {
      return res.status(429).json({
        error: "Daily AI enhance limit reached (10 per day)",
        usage: quota,
      });
    }

    const enhanced = await enhanceListingDescription(payload);
    res.json({ enhanced_description: enhanced, usage: quota });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
