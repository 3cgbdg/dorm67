import { admin } from "../firebaseAdmin.js";
import { streamAssistantReply } from "./openai.js";

/**
 * Starts a background listener for AI tasks in Firestore.
 * This implements an asynchronous queue (Option 2).
 */
export function startAiTaskListener() {
  console.log("🤖 AI Task Listener started. Watching for 'aiTasks'...");

  // We listen for documents in the 'aiTasks' collection with status 'pending'
  admin.firestore()
    .collection("aiTasks")
    .where("status", "==", "pending")
    .onSnapshot(async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const taskDoc = change.doc;
          const { userId, messages } = taskDoc.data();

          try {
            // 1. Mark task as processing
            await taskDoc.ref.update({ 
              status: "processing", 
              startedAt: admin.firestore.FieldValue.serverTimestamp() 
            });

            console.log(`[AI Queue] Processing task for user ${userId}...`);

            // 2. Generate the reply
            let fullReply = "";
            await streamAssistantReply(messages, (chunk) => {
              fullReply += chunk;
            });

            // 3. Save the final reply to the user's chat history
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

            // 4. Mark task as completed (or delete it)
            await taskDoc.ref.delete();
            console.log(`[AI Queue] Task completed for user ${userId}.`);

          } catch (err) {
            console.error(`[AI Queue] Error processing task ${taskDoc.id}:`, err);
            await taskDoc.ref.update({ 
              status: "error", 
              error: err instanceof Error ? err.message : "Unknown error" 
            });
          }
        }
      }
    });
}
