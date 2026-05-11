import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, serverTimestamp } from "@/lib/firebase";
import type { UserProfile } from "@/types";

export async function registerWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  universityId: string;
  universityName: string;
  dormName: string;
}) {
  const cred = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password
  );
  await updateProfile(cred.user, { displayName: input.fullName });
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      email: input.email,
      fullName: input.fullName,
      universityId: input.universityId,
      universityName: input.universityName,
      dormName: input.dormName,
      avatarUrl: "",
      isVerified: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Auth account is already created; profile sync failure should not block entry.
    console.error("Failed to create Firestore user profile after signup", error);
  }
}

export async function loginWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  
  // Check if user already has a profile with university info
  const userDocRef = doc(db, "users", cred.user.uid);
  const userSnap = await getDoc(userDocRef);
  const exists = userSnap.exists() && userSnap.data()?.universityId;

  if (!userSnap.exists()) {
    // Initial profile creation with basic info
    const userDoc: Partial<UserProfile> = {
      id: cred.user.uid,
      email: cred.user.email || "",
      fullName: cred.user.displayName || "Student",
      avatarUrl: cred.user.photoURL || "",
    };
    try {
      await setDoc(userDocRef, {
        ...userDoc,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to create user profile", error);
    }
  }

  return { exists };
}

export async function logout() {
  await signOut(auth);
}
