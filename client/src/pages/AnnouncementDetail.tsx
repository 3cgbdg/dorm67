import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, collection, orderBy, query } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  createAnnouncementComment,
  toggleCommentLike,
} from "@/lib/firestore";
import { ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { Announcement } from "@/types";

type CommentItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string | null;
  likesCount: number;
  likedBy?: string[];
  createdAt: string;
};

export function AnnouncementDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((s) => s.user);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!id) return;
    const unsubAnnouncement = onSnapshot(doc(db, "announcements", id), (snap) => {
      if (snap.exists()) {
        setAnnouncement({ id: snap.id, ...snap.data() } as Announcement);
      }
    });
    const q = query(collection(db, "announcements", id, "comments"), orderBy("createdAt", "asc"));
    const unsubComments = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((item) => ({ id: item.id, ...item.data() } as CommentItem)));
    });

    return () => {
      unsubAnnouncement();
      unsubComments();
    };
  }, [id]);

  const rootComments = useMemo(
    () => comments.filter((comment) => !comment.parentId),
    [comments]
  );
  const repliesByParent = useMemo(() => {
    const map: Record<string, CommentItem[]> = {};
    comments
      .filter((comment) => comment.parentId)
      .forEach((comment) => {
        map[comment.parentId as string] = map[comment.parentId as string] || [];
        map[comment.parentId as string].push(comment);
      });
    return map;
  }, [comments]);

  if (!announcement) return <PageLoader text="Loading announcement..." />;

  return (
    <div className="page-container max-w-3xl space-y-4">
      <AnnouncementCard announcement={announcement} />

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Comments</h3>
        <div className="flex gap-2">
          <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." />
          <Button
            onClick={async () => {
              if (!newComment.trim()) {
                toast.error("Comment cannot be empty");
                return;
              }
              await createAnnouncementComment(id, newComment.trim());
              setNewComment("");
            }}
          >
            Post
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rootComments.map((comment) => {
          const isLiked = user && comment.likedBy?.includes(user.uid);
          return (
            <div key={comment.id} className="rounded-md border bg-card p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Avatar src={comment.userAvatar} name={comment.userName} />
                <div>
                  <div className="text-sm font-medium">{comment.userName}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</div>
                </div>
              </div>
              <p className="text-sm">{comment.content}</p>
              <div className="flex gap-2">
                <button 
                  className={cn(
                    "inline-flex items-center gap-1 text-sm transition-colors",
                    isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => toggleCommentLike(id, comment.id)}
                >
                  <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} /> {comment.likesCount || 0}
                </button>
              </div>
              <div className="ml-4 space-y-3 border-l pl-3">
                {(repliesByParent[comment.id] || []).map((reply) => (
                  <div key={reply.id} className="rounded-md bg-muted p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{reply.userName}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(reply.createdAt)}</span>
                    </div>
                    <div className="text-sm">{reply.content}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
