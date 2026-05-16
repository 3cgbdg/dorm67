import { useCallback, useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/lib/firestore";
import { EmptyState } from "@/components/data/EmptyState";
import { PullRefreshChrome } from "@/components/layout/PullRefreshChrome";
import { NotificationItem, type NotificationRow } from "@/components/feature/NotificationItem";
import { Button } from "@/components/ui/button";

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationRow)));
    });

    return () => {
      unsub();
    };
  }, [user]);

  const onPull = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 450));
    toast.success("Notifications refreshed");
  }, []);

  return (
    <>
      <PullRefreshChrome onRefresh={onPull} />
      <div className="page-container space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        {items.some((item) => !item.isRead) ? (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!user) return;
              await markNotificationsRead(user.uid);
              toast.success("All notifications marked as read");
            }}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You're all caught up! When you get new messages or activity on your posts, they'll show up here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
