import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  type DocumentSnapshot,
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
  startAt,
  endAt,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { api } from "@/lib/api";

type NotificationType = "announcement" | "message";

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

async function createUserNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  refId?: string;
}) {
  if (!input.userId) return;
  await addDoc(collection(db, "notifications", input.userId, "items"), {
    title: input.title,
    body: input.body,
    type: input.type,
    refId: input.refId || "",
    isRead: false,
    createdAt: serverTimestamp(),
  });
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
  const didLike = await runTransaction(db, async (tx) => {
    const snap = await tx.get(announcementRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    const likedBy: string[] = data.likedBy || [];
    
    if (likedBy.includes(user.uid)) {
      tx.update(announcementRef, { 
        likedBy: arrayRemove(user.uid),
        likesCount: increment(-1) 
      });
      return false;
    } else {
      tx.update(announcementRef, { 
        likedBy: arrayUnion(user.uid),
        likesCount: increment(1) 
      });
      return true;
    }
  });

  if (!didLike) return;
  const [profile, announcementSnap] = await Promise.all([
    getUserProfileFast(user.uid),
    getDoc(announcementRef),
  ]);
  if (!announcementSnap.exists()) return;
  const announcement = announcementSnap.data() as Record<string, unknown>;
  const ownerId = typeof announcement.userId === "string" ? announcement.userId : "";
  if (!ownerId || ownerId === user.uid) return;

  const senderName = (profile?.fullName as string) || user.displayName || "Someone";
  await createUserNotification({
    userId: ownerId,
    title: "New like",
    body: `${senderName} liked your post`,
    type: "announcement",
    refId: announcementId,
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

  const announcementSnap = await getDoc(announcementRef);
  if (!announcementSnap.exists()) return;
  const announcement = announcementSnap.data() as Record<string, unknown>;
  const ownerId = typeof announcement.userId === "string" ? announcement.userId : "";
  if (!ownerId || ownerId === user.uid) return;

  const senderName = (profile?.fullName as string) || user.displayName || "Someone";
  await createUserNotification({
    userId: ownerId,
    title: "New comment",
    body: `${senderName} commented on your post`,
    type: "announcement",
    refId: announcementId,
  });
}

export async function updateAnnouncementComment(
  announcementId: string,
  commentId: string,
  content: string
) {
  const commentRef = doc(db, "announcements", announcementId, "comments", commentId);
  await updateDoc(commentRef, {
    content,
    editedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncementComment(
  announcementId: string,
  commentId: string
) {
  const announcementRef = doc(db, "announcements", announcementId);
  const commentRef = doc(db, "announcements", announcementId, "comments", commentId);
  const batch = writeBatch(db);
  batch.delete(commentRef);
  batch.update(announcementRef, { commentsCount: increment(-1) });
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
  // Images are now stored on the local server via /api/upload
  // Since this is a student project, we can just let them stay or delete via a local endpoint if desired.
  // For now, we just skip deleting from storage.
  await deleteDoc(listingRef);
}

type ParticipantProfile = { fullName: string; avatarUrl?: string };

function inferParticipantsFromKey(participantKey: unknown): string[] {
  if (typeof participantKey !== "string" || !participantKey.includes("_")) return [];
  const parts = participantKey.split("_").filter(Boolean);
  if (parts.length < 3) return [];
  const inferred = parts.slice(-2);
  return inferred.length === 2 ? inferred : [];
}

async function repairConversationParticipants(
  convRef: ReturnType<typeof doc>,
  convSnap: DocumentSnapshot,
  callerUid: string,
  otherUid: string
) {
  const authUser = requireUser();
  const data = convSnap.data() ?? {};
  const ids: string[] = Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [];
  const hasBoth = ids.includes(callerUid) && ids.includes(otherUid);
  if (hasBoth) return;

  const [callerProfile, otherProfile] = await Promise.all([
    getUserProfileFast(callerUid),
    getUserProfileFast(otherUid),
  ]);
  const prevProfiles = (data.participantProfiles as Record<string, ParticipantProfile> | undefined) ?? {};

  await updateDoc(convRef, {
    participantIds: arrayUnion(callerUid, otherUid),
    participantProfiles: {
      ...prevProfiles,
      [callerUid]: {
        fullName:
          (callerProfile?.fullName as string) || (callerUid === authUser.uid ? authUser.displayName : null) || "Student",
        avatarUrl: (callerProfile?.avatarUrl as string) || "",
      },
      [otherUid]: {
        fullName: (otherProfile?.fullName as string) || (otherUid === authUser.uid ? authUser.displayName : null) || "Student",
        avatarUrl: (otherProfile?.avatarUrl as string) || "",
      },
    },
  });
}

export async function findOrCreateConversation(listingId: string, sellerId: string) {
  const user = requireUser();
  const [uid1, uid2] = [user.uid, sellerId].sort();
  const participantKey = `${listingId}_${uid1}_${uid2}`;

  const existing = await getDocs(
    query(collection(db, "conversations"), where("participantKey", "==", participantKey), limit(1))
  );
  if (!existing.empty) {
    const found = existing.docs[0];
    await repairConversationParticipants(found.ref, found, user.uid, sellerId);
    return found.id;
  }

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
    unreadCounts: { [user.uid]: 0, [sellerId]: 0 },
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
  if (!existing.empty) {
    const found = existing.docs[0];
    await repairConversationParticipants(found.ref, found, user.uid, targetUserId);
    return found.id;
  }

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
    unreadCounts: { [user.uid]: 0, [targetUserId]: 0 },
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
  let recipientId = "";
  let senderName = "Someone";

  await runTransaction(db, async (tx) => {
    const convSnap = await tx.get(conversationRef);
    if (!convSnap.exists()) throw new Error("Conversation not found");

    const data = convSnap.data() as Record<string, unknown>;
    const raw = data.participantIds;
    const existing = Array.isArray(raw) ? (raw as string[]).filter(Boolean) : [];
    const inferred = inferParticipantsFromKey(data.participantKey);
    const mergedIds = [...new Set([...existing, ...inferred, user.uid])];
    const other = mergedIds.find((id) => id !== user.uid) || "";
    recipientId = other;

    const unreadCounts =
      (data.unreadCounts as Record<string, number> | undefined) ?? {};
    const nextUnread = { ...unreadCounts };
    nextUnread[user.uid] = 0;
    if (other) nextUnread[other] = Number(nextUnread[other] || 0) + 1;

    const participantProfiles =
      (data.participantProfiles as Record<string, { fullName?: string }> | undefined) ?? {};
    senderName =
      participantProfiles[user.uid]?.fullName || user.displayName || "Someone";

    tx.set(messageRef, { senderId: user.uid, content, createdAt: serverTimestamp() });
    tx.update(conversationRef, {
      lastMessage: content,
      lastMessageId: messageRef.id,
      lastMessageAt: serverTimestamp(),
      participantIds: arrayUnion(...mergedIds),
      unreadCounts: nextUnread,
    });
  });

  if (recipientId) {
    await createUserNotification({
      userId: recipientId,
      title: "New message",
      body: `${senderName}: ${content.length > 60 ? `${content.slice(0, 57)}...` : content}`,
      type: "message",
      refId: conversationId,
    });
  }
}

export async function updateMessage(conversationId: string, messageId: string, content: string) {
  const user = requireUser();
  const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
  const convRef = doc(db, "conversations", conversationId);
  
  await runTransaction(db, async (tx) => {
    const convSnap = await tx.get(convRef);
    const msgSnap = await tx.get(messageRef);
    if (!msgSnap.exists()) throw new Error("Message not found");
    if (msgSnap.data().senderId !== user.uid) {
      throw new Error("You can only edit your own messages");
    }
    
    tx.update(messageRef, {
      content,
      editedAt: serverTimestamp(),
    });
    
    // If this was the last message, update the preview
    if (convSnap.exists() && convSnap.data().lastMessageId === messageId) {
       tx.update(convRef, { lastMessage: content });
    }
  });
}

export async function deleteMessage(conversationId: string, messageId: string) {
  const user = requireUser();
  const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
  const convRef = doc(db, "conversations", conversationId);

  await runTransaction(db, async (tx) => {
    const convSnap = await tx.get(convRef);
    const msgSnap = await tx.get(messageRef);
    if (!msgSnap.exists()) throw new Error("Message not found");
    if (msgSnap.data().senderId !== user.uid) {
      throw new Error("You can only delete your own messages");
    }
    tx.delete(messageRef);

    // If this was the last message, try to find the previous one for the preview
    if (convSnap.exists() && convSnap.data().lastMessageId === messageId) {
      const q = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(2)
      );
      const prevMessages = await getDocs(q);
      const prevMsg = prevMessages.docs.find(d => d.id !== messageId);
      
      if (prevMsg) {
        tx.update(convRef, {
          lastMessage: prevMsg.data().content,
          lastMessageId: prevMsg.id,
          lastMessageAt: prevMsg.data().createdAt
        });
      } else {
        tx.update(convRef, {
          lastMessage: "",
          lastMessageId: "",
          lastMessageAt: serverTimestamp()
        });
      }
    }
  });
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

export async function markNotificationRead(notificationId: string) {
  const user = requireUser();
  await updateDoc(doc(db, "notifications", user.uid, "items", notificationId), {
    isRead: true,
  });
}

export async function markConversationRead(conversationId: string) {
  const user = requireUser();
  const convRef = doc(db, "conversations", conversationId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(convRef);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const unreadCounts =
      (data.unreadCounts as Record<string, number> | undefined) ?? {};
    if ((unreadCounts[user.uid] || 0) === 0) return;
    tx.update(convRef, {
      unreadCounts: {
        ...unreadCounts,
        [user.uid]: 0,
      },
    });
  });
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

export async function searchUsers(searchTerm: string) {
  if (!searchTerm.trim()) return [];
  const q = query(
    collection(db, "users"),
    orderBy("fullName"),
    startAt(searchTerm),
    endAt(searchTerm + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
