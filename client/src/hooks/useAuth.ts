import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

export function useAuth() {
  const { user, profile, loading, setUser, setProfile, setLoading } =
    useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      // Never block routing on Firestore profile reads.
      setLoading(false);

      if (!nextUser) {
        setProfile(null);
        return;
      }

      void (async () => {
        try {
          const snap = await getDoc(doc(db, "users", nextUser.uid));
          setProfile(
            snap.exists()
              ? ({ id: nextUser.uid, ...snap.data() } as UserProfile)
              : null
          );
        } catch (error) {
          console.error("Failed to load user profile from Firestore", error);
          setProfile(null);
        }
      })();
    });

    return unsub;
  }, [setLoading, setProfile, setUser]);

  return { user, profile, loading };
}
