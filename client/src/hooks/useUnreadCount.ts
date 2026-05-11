import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";

export function useUnreadCount(): number {
  const user = useAuthStore((state) => state.user);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      where("isRead", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setCount(snap.size), () => setCount(0));
    return unsub;
  }, [user]);

  return count;
}
