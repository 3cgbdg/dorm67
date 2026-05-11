import { useEffect, useState, useRef } from "react";
import { collection, doc, onSnapshot, orderBy, query, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { sendMessage } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";

type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
};

export function ConversationDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages and other user profile
  useEffect(() => {
    if (!id || !user) return;

    // Listen to messages
    const q = query(collection(db, "conversations", id, "messages"), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Message)));
    });

    // Get other user info from conversation doc
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

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage(""); // Clear input early for better UX
    try {
      await sendMessage(id, text);
    } catch (err) {
      handleAppError(err, toast);
    }
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
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Online</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
            <div className="rounded-full bg-muted p-4 mb-2">
              <Send className="h-6 w-6" />
            </div>
            <p className="text-sm">No messages yet.<br/>Say hi to start the conversation!</p>
          </div>
        ) : (
          messages.map((item) => {
            const isMe = item.senderId === user?.uid;
            return (
              <div
                key={item.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                    isMe 
                      ? "rounded-tr-none bg-primary text-primary-foreground" 
                      : "rounded-tl-none bg-card border"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{item.content}</p>
                  <p className={`text-[9px] mt-1 opacity-70 ${isMe ? "text-right" : ""}`}>
                    {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-card/50 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl gap-2">
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type a message..." 
            className="flex-1 rounded-full border-muted bg-background px-4"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="icon"
            className="rounded-full shrink-0"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
