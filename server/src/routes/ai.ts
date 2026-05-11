import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { consumeAiChatQuota } from "../services/aiUsage.js";
import { streamAssistantReply } from "../services/openai.js";
import { admin } from "../firebaseAdmin.js";

export const aiRouter = Router();

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
});

aiRouter.post("/chat", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  // Validate input
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  // Check daily quota (separate from listing enhance quota)
  const quota = await consumeAiChatQuota(userId);
  if (!quota.allowed) {
    return res.status(429).json({
      error: "Daily chat limit reached. Try again tomorrow.",
      remaining: 0,
      limit: quota.limit,
    });
  }

  // SSE streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Ai-Remaining", String(quota.remaining));
  res.flushHeaders();

  try {
    const userMsg = parsed.data.messages[parsed.data.messages.length - 1];
    
    // 1. Save user message to history immediately
    await admin.firestore()
      .collection("aiChats")
      .doc(userId)
      .collection("messages")
      .add({
        role: "user",
        content: userMsg.content,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // 2. Stream reply to client AND collect for saving
    let fullReply = "";
    await streamAssistantReply(parsed.data.messages, (chunk) => {
      fullReply += chunk;
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    });

    // 3. Save final assistant reply to history
    if (fullReply) {
      await admin.firestore()
        .collection("aiChats")
        .doc(userId)
        .collection("messages")
        .add({
          role: "assistant",
          content: fullReply,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true, remaining: quota.remaining })}\n\n`);
    }
  } catch (err) {
    console.error("AI streaming error:", err);
    if (!res.writableEnded) {
      const msg = err instanceof Error ? err.message : "AI error";
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    }
  } finally {
    res.end();
  }
});
