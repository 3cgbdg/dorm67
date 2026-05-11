import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limit,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { api } from "@/lib/api";

function requireUser() {
  if (!auth.currentUser) throw new Error("Not authenticated");
  return auth.currentUser;
}

async function getUserProfileFast(userId: string) {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1200)
    );
    const snap = await Promise.race([getDoc(doc(db, "users", userId)), timeout]);
    if (!snap || !("exists" in snap) || !snap.exists()) return null;
    return snap.data() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  isOfficial?: boolean;
}) {
  const user = requireUser();
  const profile = await getUserProfileFast(user.uid);

  await addDoc(collection(db, "announcements"), {
    userId: user.uid,
    userName: profile?.fullName || user.displayName || "Student",
    userAvatar: profile?.avatarUrl || user.photoURL || "",
    title: input.title,
    body: input.body,
    isOfficial: Boolean(input.isOfficial),
    likesCount: 0,
    likedBy: [],
    commentsCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function toggleAnnouncementLike(announcementId: string) {
  const user = requireUser();
  const announcementRef = doc(db, "announcements", announcementId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(announcementRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const likedBy: string[] = data.likedBy || [];
    
    if (likedBy.includes(user.uid)) {
      tx.update(announcementRef, { 
        likedBy: arrayRemove(user.uid),
        likesCount: increment(-1) 
      });
    } else {
      tx.update(announcementRef, { 
        likedBy: arrayUnion(user.uid),
        likesCount: increment(1) 
      });
    }
  });
}

export async function createAnnouncementComment(
  announcementId: string,
  content: string,
  parentId?: string
) {
  const user = requireUser();
  const profile = await getUserProfileFast(user.uid);
  const announcementRef = doc(db, "announcements", announcementId);
  const commentRef = doc(collection(db, "announcements", announcementId, "comments"));
  const batch = writeBatch(db);
  batch.set(commentRef, {
    userId: user.uid,
    userName: profile?.fullName || user.displayName || "Student",
    userAvatar: profile?.avatarUrl || user.photoURL || "",
    content,
    parentId: parentId || null,
    likesCount: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  });
  batch.update(announcementRef, { commentsCount: increment(1) });
  await batch.commit();
}

export async function toggleCommentLike(announcementId: string, commentId: string) {
  const user = requireUser();
  const commentRef = doc(db, "announcements", announcementId, "comments", commentId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(commentRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const likedBy: string[] = data.likedBy || [];
    
    if (likedBy.includes(user.uid)) {
      tx.update(commentRef, { 
        likedBy: arrayRemove(user.uid),
        likesCount: increment(-1) 
      });
    } else {
      tx.update(commentRef, { 
        likedBy: arrayUnion(user.uid),
        likesCount: increment(1) 
      });
    }
  });
}

export async function createListing(input: {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
}) {
  const user = requireUser();
  const profile = await getUserProfileFast(user.uid);

  const uploadedImageUrls: string[] = [];
  for (const base64 of input.images) {
    const res = await api<{ url: string }>("/api/upload", {
      method: "POST",
      payload: { image: base64 },
    });
    uploadedImageUrls.push(res.url);
  }

  await addDoc(collection(db, "listings"), {
    userId: user.uid,
    userName: profile?.fullName || user.displayName || "Student",
    userAvatar: profile?.avatarUrl || user.photoURL || "",
    title: input.title,
    description: input.description,
    price: Number(input.price),
    category: input.category,
    condition: input.condition,
    images: uploadedImageUrls,
    status: "active",
    createdAt: serverTimestamp(),
  });
}

export async function toggleSavedListing(listingId: string) {
  const user = requireUser();
  const savedRef = doc(db, "users", user.uid, "savedListings", listingId);
  const snap = await getDoc(savedRef);
  if (snap.exists()) {
    await deleteDoc(savedRef);
  } else {
    await setDoc(savedRef, { listingId, createdAt: serverTimestamp() });
  }
}

export async function markListingSold(listingId: string) {
  await updateDoc(doc(db, "listings", listingId), {
    status: "sold",
    soldAt: serverTimestamp(),
  });
}

export async function deleteListingAndImages(listingId: string) {
  const listingRef = doc(db, "listings", listingId);
  const listingSnap = await getDoc(listingRef);
  if (!listingSnap.exists()) return;
  const data = listingSnap.data();
  // Images are now stored on the local server via /api/upload
  // Since this is a student project, we can just let them stay or delete via a local endpoint if desired.
  // For now, we just skip deleting from storage.
  await deleteDoc(listingRef);
}

export async function findOrCreateConversation(listingId: string, sellerId: string) {
  const user = requireUser();
  const [uid1, uid2] = [user.uid, sellerId].sort();
  const participantKey = `${listingId}_${uid1}_${uid2}`;

  const existing = await getDocs(
    query(collection(db, "conversations"), where("participantKey", "==", participantKey), limit(1))
  );
  if (!existing.empty) return existing.docs[0].id;

  // Denormalize participant profiles at write time to avoid N+1 reads
  const [myProfile, otherProfile] = await Promise.all([
    getUserProfileFast(user.uid),
    getUserProfileFast(sellerId),
  ]);

  const docRef = await addDoc(collection(db, "conversations"), {
    listingId,
    participantIds: [user.uid, sellerId],
    participantKey,
    participantProfiles: {
      [user.uid]: { fullName: myProfile?.fullName || user.displayName || "Student", avatarUrl: myProfile?.avatarUrl || "" },
      [sellerId]: { fullName: otherProfile?.fullName || "Student", avatarUrl: otherProfile?.avatarUrl || "" },
    },
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function findOrCreateDirectConversation(targetUserId: string) {
  const user = requireUser();
  if (targetUserId === user.uid) {
    throw new Error("You cannot start a conversation with yourself");
  }

  const [uid1, uid2] = [user.uid, targetUserId].sort();
  const participantKey = `direct_${uid1}_${uid2}`;

  const existing = await getDocs(
    query(collection(db, "conversations"), where("participantKey", "==", participantKey), limit(1))
  );
  if (!existing.empty) return existing.docs[0].id;

  // Denormalize participant profiles at write time to avoid N+1 reads
  const [myProfile, otherProfile] = await Promise.all([
    getUserProfileFast(user.uid),
    getUserProfileFast(targetUserId),
  ]);

  const docRef = await addDoc(collection(db, "conversations"), {
    listingId: "",
    participantIds: [user.uid, targetUserId],
    participantKey,
    participantProfiles: {
      [user.uid]:    { fullName: myProfile?.fullName || user.displayName || "Student", avatarUrl: myProfile?.avatarUrl || "" },
      [targetUserId]: { fullName: otherProfile?.fullName || "Student", avatarUrl: otherProfile?.avatarUrl || "" },
    },
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function sendMessage(conversationId: string, content: string) {
  const user = requireUser();
  const conversationRef = doc(db, "conversations", conversationId);
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, { senderId: user.uid, content, createdAt: serverTimestamp() });
  batch.update(conversationRef, {
    lastMessage: content,
    lastMessageAt: serverTimestamp(),
    participantIds: arrayUnion(user.uid),
  });
  await batch.commit();
}



export async function updateProfile(input: { fullName: string; dormName: string; avatarUrl?: string }) {
  const user = requireUser();
  await setDoc(
    doc(db, "users", user.uid),
    {
      fullName: input.fullName,
      dormName: input.dormName,
      avatarUrl: input.avatarUrl || "",
    },
    { merge: true }
  );
}

export async function queryCollection(path: string, sortField = "createdAt") {
  const docs = await getDocs(query(collection(db, path), orderBy(sortField, "desc")));
  return docs.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function markNotificationsRead(userId: string) {
  const snap = await getDocs(
    query(
      collection(db, "notifications", userId, "items"),
      where("isRead", "==", false)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
  await batch.commit();
}

// ─── AI Chat Persistence ────────────────────────────────────────────────────

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: { toDate(): Date } | string;
};

/**
 * Save a single AI chat message (user or assistant) for the current user.
 * Collection: aiChats/{userId}/messages/{auto-id}
 */
export async function saveAiMessage(input: {
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await addDoc(collection(db, "aiChats", input.userId, "messages"), {
    role: input.role,
    content: input.content,
    createdAt: serverTimestamp(),
  });
}

/**
 * Load full AI conversation history for the current user.
 * Returns messages sorted oldest-first, limited to last 100.
 */
export async function loadAiHistory(userId: string): Promise<AiChatMessage[]> {
  const snap = await getDocs(
    query(
      collection(db, "aiChats", userId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AiChatMessage));
}

/**
 * Clear all AI chat history for the current user.
 */
export async function clearAiHistory(userId: string) {
  const snap = await getDocs(collection(db, "aiChats", userId, "messages"));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
