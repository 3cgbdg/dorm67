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

  try {
    const userMsg = parsed.data.messages[parsed.data.messages.length - 1];
    
    const batch = admin.firestore().batch();
    
    // 1. Save user message to chat history
    const historyRef = admin.firestore()
      .collection("aiChats")
      .doc(userId)
      .collection("messages")
      .doc();
    batch.set(historyRef, {
      role: "user",
      content: userMsg.content,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Create the background task for the AI
    const taskRef = admin.firestore().collection("aiTasks").doc();
    batch.set(taskRef, {
      userId,
      messages: parsed.data.messages,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return res.json({ 
      success: true, 
      remaining: quota.remaining,
      taskId: taskRef.id 
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return res.status(500).json({ error: "Failed to initiate AI chat" });
  }
});
