import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { toggleAnnouncementLike } from "@/lib/firestore";
import type { Announcement } from "@/types";

export function AnnouncementCard({
  announcement,
  disableLink = false,
  detail = false,
}: {
  announcement: Announcement;
  /** When true, render as a static card (e.g. on detail page). */
  disableLink?: boolean;
  /** Full body text, no link — for announcement detail. */
  detail?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const isLiked = user && announcement.likedBy?.includes(user.uid);

  const cardShell = (body: ReactNode) => (
    <Card
      className={cn(
        "h-full overflow-hidden transition-all duration-200 motion-reduce:transition-none",
        !disableLink && "hover:-translate-y-0.5 hover:shadow-pop"
      )}
    >
      {body}
      <CardFooter className="justify-between border-t border-border/60 bg-surface-2/30 px-4 py-3 text-sm text-ink-soft">
        <button
          type="button"
          className={cn(
            "inline-flex min-h-9 min-w-9 items-center gap-1.5 rounded-md px-2 transition-colors motion-reduce:transition-none",
            isLiked ? "text-brand" : "hover:text-ink"
          )}
          onClick={() => {
            void toggleAnnouncementLike(announcement.id);
          }}
        >
          <ThumbsUp className={cn("h-4 w-4 shrink-0", isLiked && "fill-current")} />
          <span>{announcement.likesCount}</span>
        </button>
        <span className="inline-flex min-h-9 items-center gap-1.5">
          <MessageCircle className="h-4 w-4 shrink-0" />
          {announcement.commentsCount}
        </span>
      </CardFooter>
    </Card>
  );

  const linkedBody = (
    <>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar src={announcement.userAvatar} name={announcement.userName} className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{announcement.userName}</p>
            <p className="text-xs text-ink-soft">{formatDate(announcement.createdAt)}</p>
          </div>
        </div>
        {announcement.isOfficial ? (
          <Badge variant="brand-soft" className="shrink-0">
            Official
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pb-3 pt-0">
        <h3 className={cn("text-base font-semibold leading-snug", detail ? "" : "line-clamp-2")}>
          {announcement.title}
        </h3>
        <p className={cn("text-sm text-ink-soft", detail ? "whitespace-pre-wrap" : "line-clamp-3")}>
          {announcement.body}
        </p>
      </CardContent>
    </>
  );

  if (disableLink) {
    return <div className="block">{cardShell(linkedBody)}</div>;
  }

  return (
    <div className="block">
      {cardShell(
        <Link to={`/announcement/${announcement.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
          {linkedBody}
        </Link>
      )}
    </div>
  );
}
