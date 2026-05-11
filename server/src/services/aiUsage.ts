import { admin } from "../firebaseAdmin.js";

const DAILY_AI_ENHANCE_LIMIT = 10;
const DAILY_AI_CHAT_LIMIT = 50;

function getUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function consumeQuota(
  userId: string,
  collection: string,
  limit: number
): Promise<{ allowed: boolean; usedToday: number; remaining: number; limit: number }> {
  const day = getUtcDateKey();
  const usageRef = admin.firestore().collection(collection).doc(`${userId}_${day}`);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const usedToday = snap.exists ? Number(snap.data()?.count || 0) : 0;

    if (usedToday >= limit) {
      return { allowed: false, usedToday, remaining: 0, limit };
    }

    const nextCount = usedToday + 1;
    tx.set(
      usageRef,
      {
        userId,
        day,
        count: nextCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: snap.exists
          ? snap.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { allowed: true, usedToday: nextCount, remaining: Math.max(limit - nextCount, 0), limit };
  });
}

export function consumeAiEnhanceQuota(userId: string) {
  return consumeQuota(userId, "aiEnhanceUsage", DAILY_AI_ENHANCE_LIMIT);
}

export function consumeAiChatQuota(userId: string) {
  return consumeQuota(userId, "aiChatUsage", DAILY_AI_CHAT_LIMIT);
}
