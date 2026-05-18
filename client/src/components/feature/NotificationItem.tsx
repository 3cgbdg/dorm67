import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { markNotificationRead } from "@/lib/firestore";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: "announcement" | "message" | string;
  refId?: string;
  isRead: boolean;
  createdAt: { toDate(): Date } | string;
};

function notifLink(item: NotificationRow): string {
  if (item.type === "announcement" && item.refId) return `/announcement/${item.refId}`;
  if (item.type === "message" && item.refId) return `/conversation/${item.refId}`;
  return "/notifications";
}

export function NotificationItem({ item }: { item: NotificationRow }) {
  return (
    <Link to={notifLink(item)} className="block" onClick={() => { void markNotificationRead(item.id); }}>
      <Card
        className={cn(
          "transition-colors hover:bg-surface-2/50",
          !item.isRead && "border-brand/40 bg-brand/5"
        )}
      >
        <CardContent className="flex items-start gap-3 p-4">
          {!item.isRead ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" /> : null}
          <div className={cn("flex-1", item.isRead && "pl-5")}>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{item.title}</p>
            <p className="font-medium">{item.body}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{timeAgo(item.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
