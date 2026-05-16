import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, collection, orderBy, query } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  createAnnouncementComment,
  toggleCommentLike,
  updateAnnouncementComment,
  deleteAnnouncementComment,
} from "@/lib/firestore";
import { ThumbsUp, Edit2, Trash2, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { PageLoader } from "@/components/data/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentValue, setEditCommentValue] = useState("");

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
    <div className="page-container max-w-6xl space-y-6 pb-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <AnnouncementCard announcement={announcement} disableLink detail />

          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="sm:flex-1"
                />
                <Button
                  className="shrink-0 sm:w-auto"
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

              <div className="space-y-3">
                {rootComments.map((comment) => {
                  const isLiked = user && comment.likedBy?.includes(user.uid);
                  const isMe = user && comment.userId === user.uid;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="group relative space-y-3 rounded-md border bg-surface p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserAvatar src={comment.userAvatar} name={comment.userName} />
                          <div>
                            <div className="text-sm font-medium">{comment.userName}</div>
                            <div className="text-xs text-ink-soft">{formatDate(comment.createdAt)}</div>
                          </div>
                        </div>

                        {isMe && !isEditing && (
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentValue(comment.content);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-danger hover:text-danger/80"
                              onClick={async () => {
                                if (window.confirm("Delete this comment?")) {
                                  await deleteAnnouncementComment(id, comment.id);
                                  toast.success("Comment deleted");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editCommentValue}
                            onChange={(e) => setEditCommentValue(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>
                              <X className="mr-1 h-4 w-4" /> Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!editCommentValue.trim()) return;
                                await updateAnnouncementComment(id, comment.id, editCommentValue.trim());
                                setEditingCommentId(null);
                                toast.success("Comment updated");
                              }}
                            >
                              <Check className="mr-1 h-4 w-4" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{comment.content}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1 text-sm transition-colors",
                                isLiked ? "text-brand" : "text-ink-soft hover:text-ink"
                              )}
                              onClick={() => toggleCommentLike(id, comment.id)}
                            >
                              <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />{" "}
                              {comment.likesCount || 0}
                            </button>
                          </div>
                        </>
                      )}
                      <div className="ml-4 space-y-3 border-l pl-3">
                        {(repliesByParent[comment.id] || []).map((reply) => (
                          <div key={reply.id} className="space-y-1 rounded-md bg-surface-2 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{reply.userName}</span>
                              <span className="text-[10px] text-ink-soft">{formatDate(reply.createdAt)}</span>
                            </div>
                            <div className="text-sm">{reply.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="hidden space-y-4 lg:block lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About this post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-soft">
              <div className="flex items-center gap-3">
                <UserAvatar src={announcement.userAvatar} name={announcement.userName} />
                <div>
                  <p className="font-medium text-ink">{announcement.userName}</p>
                  <p>{formatDate(announcement.createdAt)}</p>
                </div>
              </div>
              {announcement.isOfficial ? <Badge variant="brand-soft">Official</Badge> : <span>Student post</span>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
