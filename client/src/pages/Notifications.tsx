import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Bell } from "lucide-react";
import { markNotificationsRead } from "@/lib/firestore";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
  return "#";
}

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications", user.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem)));
    });

    // Mark all as read after short delay (prevent instant mark on bounce)
    const timer = setTimeout(() => markNotificationsRead(user.uid), 1500);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [user]);

  return (
    <div className="page-container space-y-4">
      <h2 className="text-2xl font-semibold">Notifications</h2>

      {items.length === 0 ? (
        <EmptyState 
          icon={Bell} 
          title="No notifications yet" 
          description="You're all caught up! When you get new messages or activity on your posts, they'll show up here."
        />
      ) : (
        <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.id} to={notifLink(item)}>
            <Card
              className={cn(
                "transition-colors hover:bg-muted/50",
                !item.isRead && "border-primary/40 bg-primary/5"
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                {/* Unread dot */}
                {!item.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <div className={cn("flex-1", item.isRead && "pl-5")}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.title}
                  </p>
                  <p className="font-medium">{item.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
