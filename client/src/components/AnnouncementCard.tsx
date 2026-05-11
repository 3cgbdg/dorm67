import { Link } from "react-router-dom";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { toggleAnnouncementLike } from "@/lib/firestore";
import type { Announcement } from "@/types";

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const user = useAuthStore((s) => s.user);
  const isLiked = user && announcement.likedBy?.includes(user.uid);

  return (
    <Link to={`/announcement/${announcement.id}`}>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar src={announcement.userAvatar} name={announcement.userName} />
              <div>
                <div className="text-sm font-medium">{announcement.userName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(announcement.createdAt)}
                </div>
              </div>
            </div>
            {announcement.isOfficial ? <Badge>Official</Badge> : null}
          </div>
          <div>
            <h3 className="font-semibold">{announcement.title}</h3>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {announcement.body}
            </p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <button 
              className={cn(
                "inline-flex items-center gap-1 transition-colors",
                isLiked ? "text-primary" : "hover:text-foreground"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleAnnouncementLike(announcement.id);
              }}
            >
              <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} /> {announcement.likesCount}
            </button>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {announcement.commentsCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
