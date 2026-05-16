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

const DAILY_TARAS_COST_LIMIT = 5;
const MONTHLY_TARAS_COST_LIMIT = 50;
const TARAS_RATE_PER_MINUTE = 3;

function getUtcMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMinuteKey() {
  const d = new Date();
  return `${d.toISOString().slice(0, 16)}`; // YYYY-MM-DDTHH:MM
}

/** Returns false if rate limit exceeded (does not increment). */
export async function checkTarasRateLimit(userId: string): Promise<boolean> {
  const minute = getMinuteKey();
  const ref = admin.firestore().collection("aiTarasRate").doc(`${userId}_${minute}`);
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = snap.exists ? Number(snap.data()?.count || 0) : 0;
    if (used >= TARAS_RATE_PER_MINUTE) return false;
    tx.set(
      ref,
      {
        userId,
        minute,
        count: used + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}

export async function consumeAiTarasQuota(
  userId: string,
  cost: number
): Promise<{ allowed: boolean; remainingDaily: number; remainingMonthly: number }> {
  const day = getUtcDateKey();
  const month = getUtcMonthKey();
  const dailyRef = admin.firestore().collection("aiTarasUsage").doc(`daily_${userId}_${day}`);
  const monthlyRef = admin.firestore().collection("aiTarasUsage").doc(`monthly_${userId}_${month}`);

  return admin.firestore().runTransaction(async (tx) => {
    const [dailySnap, monthlySnap] = await Promise.all([tx.get(dailyRef), tx.get(monthlyRef)]);
    const dailyUsed = dailySnap.exists ? Number(dailySnap.data()?.count || 0) : 0;
    const monthlyUsed = monthlySnap.exists ? Number(monthlySnap.data()?.count || 0) : 0;

    if (dailyUsed + cost > DAILY_TARAS_COST_LIMIT || monthlyUsed + cost > MONTHLY_TARAS_COST_LIMIT) {
      return {
        allowed: false,
        remainingDaily: Math.max(DAILY_TARAS_COST_LIMIT - dailyUsed, 0),
        remainingMonthly: Math.max(MONTHLY_TARAS_COST_LIMIT - monthlyUsed, 0),
      };
    }

    const nextDaily = dailyUsed + cost;
    const nextMonthly = monthlyUsed + cost;
    const ts = admin.firestore.FieldValue.serverTimestamp();

    tx.set(
      dailyRef,
      {
        userId,
        kind: "daily",
        day,
        count: nextDaily,
        updatedAt: ts,
        createdAt: dailySnap.exists
          ? dailySnap.data()?.createdAt || ts
          : ts,
      },
      { merge: true }
    );
    tx.set(
      monthlyRef,
      {
        userId,
        kind: "monthly",
        month,
        count: nextMonthly,
        updatedAt: ts,
        createdAt: monthlySnap.exists
          ? monthlySnap.data()?.createdAt || ts
          : ts,
      },
      { merge: true }
    );

    return {
      allowed: true,
      remainingDaily: Math.max(DAILY_TARAS_COST_LIMIT - nextDaily, 0),
      remainingMonthly: Math.max(MONTHLY_TARAS_COST_LIMIT - nextMonthly, 0),
    };
  });
}
