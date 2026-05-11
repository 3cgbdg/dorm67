import { useEffect, useState, useRef } from "react";
import { collection, doc, onSnapshot, orderBy, query, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage, updateMessage } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, User, Smile, Edit2, Check, X } from "lucide-react";
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

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background lg:h-[calc(100vh-4.1rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card/50 px-4 py-3 backdrop-blur-md">
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
            <div className="rounded-full bg-muted p-4 mb-2"><Send className="h-6 w-6" /></div>
            <p className="text-sm">No messages yet.</p>
          </div>
        ) : (
          messages.map((item) => {
            const isMe = item.senderId === user?.uid;
            const isEditing = editingId === item.id;

            return (
              <div key={item.id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  isMe ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none bg-card border"
                }`}>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Input 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 bg-background text-foreground text-sm"
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
                      <div className={`flex items-center gap-1 mt-1 opacity-70 ${isMe ? "justify-end" : ""}`}>
                        {item.editedAt && <span className="text-[8px] font-medium uppercase tracking-tight">Edited</span>}
                        <p className="text-[9px]">
                          {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                        </p>
                      </div>
                      {isMe && (
                        <button 
                          onClick={() => { setEditingId(item.id); setEditValue(item.content); }}
                          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 p-1 hover:text-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-card/50 p-4 backdrop-blur-md relative">
        {showEmoji && (
          <div className="absolute bottom-full left-4 mb-2 flex gap-1 rounded-full border bg-card p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
            {COMMON_EMOJIS.map(e => (
              <button key={e} onClick={() => addEmoji(e)} className="h-8 w-8 rounded-full hover:bg-muted text-lg transition-transform hover:scale-125">
                {e}
              </button>
            ))}
          </div>
        )}
        
        <div className="mx-auto flex max-w-4xl gap-2">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile className={cn("h-5 w-5 transition-colors", showEmoji && "text-primary")} />
          </Button>
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1 rounded-full border-muted bg-background px-4"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" className="rounded-full shrink-0" onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
