import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { markNotificationRead } from "@/lib/firestore";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: "announcement" | "message" | string;
  refId?: string;
  isRead: boolean;
  createdAt: { toDate(): Date } | string;
};

function notifLink(item: NotificationItem): string {
  if (item.type === "announcement" && item.refId) return `/announcement/${item.refId}`;
  if (item.type === "message" && item.refId) return `/conversation/${item.refId}`;
  return "/notifications";
}

/** Compact list for header drawer */
export function NotificationsPeek({ onItemClick }: { onItemClick?: () => void } = {}) {
  const user = useAuthStore((s) => s.user);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(12)
    );
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
    });
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-ink-soft">
        <Bell className="mb-2 h-8 w-8 opacity-40" />
        No notifications yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(60vh,420px)] pr-3">
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={notifLink(item)}
            onClick={() => {
              void markNotificationRead(item.id);
              onItemClick?.();
            }}
            className="block rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2/50"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{item.title}</p>
            <p className={cn("text-sm font-medium", !item.isRead && "text-ink")}>{item.body}</p>
            <p className="mt-1 text-xs text-ink-soft">{timeAgo(item.createdAt)}</p>
          </Link>
        ))}
      </div>
    </ScrollArea>
  );
}
