import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { sendMessage } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  senderId: string;
  content: string;
};

export function ConversationDetailPage() {
  const { id = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "conversations", id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Message)));
    });
  }, [id]);

  return (
    <div className="page-container max-w-3xl space-y-4">
      <h2 className="text-2xl font-semibold">Conversation</h2>
      <div className="space-y-2 rounded-lg border bg-card p-3">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${
              item.senderId === user?.uid ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {item.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
        <Button
          onClick={async () => {
            if (!message.trim()) return;
            await sendMessage(id, message.trim());
            setMessage("");
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
