import { useEffect, useState, useRef } from "react";
import { collection, doc, onSnapshot, orderBy, query, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage, updateMessage, deleteMessage, markConversationRead } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { ConversationMessageBubble } from "@/components/feature/ConversationMessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Send, User, Smile, Edit2, Check, X, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { handleAppError, cn } from "@/lib/utils";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
  editedAt?: any;
};

const COMMON_EMOJIS = ["😊", "😂", "👍", "❤️", "🙌", "🔥", "🤔", "👋"];

export function ConversationDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    const q = query(collection(db, "conversations", id, "messages"), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Message)));
    });
    const getOtherUser = async () => {
      const convDoc = await getDoc(doc(db, "conversations", id));
      if (convDoc.exists()) {
        const data = convDoc.data();
        const otherId = data.participantIds.find((pId: string) => pId !== user.uid);
        if (otherId) {
          const profiles = data.participantProfiles || {};
          setOtherUser({ id: otherId, ...profiles[otherId] });
        }
      }
    };
    getOtherUser();
    return () => unsubMessages();
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    void markConversationRead(id);
  }, [id, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage("");
    setShowEmoji(false);
    try {
      await sendMessage(id, text);
    } catch (err) {
      handleAppError(err, toast);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editValue.trim()) return;
    try {
      await updateMessage(id, editingId, editValue.trim());
      setEditingId(null);
      setEditValue("");
      toast.success("Message updated");
    } catch (err) {
      handleAppError(err, toast);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await deleteMessage(id, deleteTargetId);
      setDeleteTargetId(null);
      toast.success("Message deleted");
    } catch (err) {
      handleAppError(err, toast);
    } finally {
      setDeleting(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-bg lg:h-[calc(100vh-4.1rem)]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-surface/80 px-4 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="lg:hidden">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 border">
          <AvatarImage src={otherUser?.avatarUrl} />
          <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-sm font-semibold leading-none">{otherUser?.fullName || "Chat"}</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
            <div className="rounded-full bg-surface-2 p-4 mb-2"><Send className="h-6 w-6" /></div>
            <p className="text-sm">No messages yet.</p>
          </div>
        ) : (
          messages.map((item) => {
            const isMe = item.senderId === user?.uid;
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                <ConversationMessageBubble isMe={isMe}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Input 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 bg-bg text-ink text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleUpdate();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400" onClick={handleUpdate}><Check className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed">{item.content}</p>
                      <div className={`mt-1 flex items-center ${isMe ? "justify-between gap-2" : "justify-end gap-1"}`}>
                        <div className="flex items-center gap-1">
                          {item.editedAt && (
                            <span className={`text-[8px] font-medium uppercase tracking-tight ${isMe ? "text-brand-fg/80" : "text-ink-soft"}`}>
                              Edited
                            </span>
                          )}
                          <p className={`text-[9px] ${isMe ? "text-brand-fg/80" : "text-ink-soft"}`}>
                            {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "..."}
                          </p>
                        </div>
                        {isMe ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingId(item.id); setEditValue(item.content); }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-fg/12 text-brand-fg transition-colors hover:bg-brand-fg/22"
                              title="Edit"
                              aria-label="Edit message"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(item.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-fg/12 text-brand-fg transition-colors hover:bg-danger/20 hover:text-danger"
                              title="Delete"
                              aria-label="Delete message"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </ConversationMessageBubble>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 border-t bg-surface/80 p-4 pb-safe backdrop-blur-md">
        <div className="relative mx-auto max-w-4xl">
          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full border bg-surface p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              {COMMON_EMOJIS.map((e) => (
                <button key={e} onClick={() => addEmoji(e)} className="h-8 w-8 rounded-full hover:bg-surface-2 text-lg transition-transform hover:scale-125">
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile className={cn("h-5 w-5 transition-colors", showEmoji && "text-brand")} />
          </Button>
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1 rounded-full border-border bg-bg px-4"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" className="rounded-full shrink-0" onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => (!open ? setDeleteTargetId(null) : null)}>
        <AlertDialogContent className="max-w-sm p-4">
          <AlertDialogHeader className="gap-1">
            <AlertDialogTitle className="text-base">Delete message?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              This message will be removed for everyone in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="h-9 px-3" disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-9 px-3 bg-danger text-white hover:bg-danger/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
