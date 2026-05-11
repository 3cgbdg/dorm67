import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import {
  loadAiHistory,
  clearAiHistory,
  type AiChatMessage,
} from "@/lib/firestore";
import { handleAppError } from "@/lib/utils";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Як продати річ на Dorm67?",
  "Як написати повідомлення продавцю?",
  "Поради щодо навчання в гуртожитку",
  "Як знайти сусіда по кімнаті?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className="h-10 w-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Load and listen to conversation history
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    // Subscribe to messages in real-time
    const q = query(
      collection(db, "aiChats", user.uid, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((d) => ({
        role: d.data().role,
        content: d.data().content,
      })) as Message[];
      
      setMessages(history);
      
      // If we were waiting for a streaming reply and it just appeared, stop streaming state
      if (history.length > 0 && history[history.length - 1].role === "assistant") {
        setIsStreaming(false);
      }
      
      setIsLoading(false);
    }, (err) => {
      console.error("History listen error:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for active AI tasks for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "aiTasks"),
      where("userId", "==", user.uid),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If there's an active task, show typing dots
      setIsAiProcessing(!snapshot.empty);
      if (!snapshot.empty) {
        setIsStreaming(true);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function handleClearHistory() {
    if (!user) return;
    await clearAiHistory(user.uid);
    setMessages([]);
    toast.success("Conversation history cleared");
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || !user) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setIsStreaming(true);

    // Placeholder for the streaming reply
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let finalReply = "";

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Request failed");
      }
      
      // The message is now being handled by the server-side queue.
      // We don't need to read the stream here because we have an onSnapshot listener
      // that will catch the user's message and the assistant's reply automatically.
      
    } catch (err) {
      handleAppError(err, toast);
      // Remove the empty placeholder on error
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === "") updated.pop();
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className="page-container flex h-[calc(100vh-4rem)] max-w-3xl flex-col gap-0 p-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Dorm67 Assistant</h2>
          <p className="text-xs text-muted-foreground">
            {remaining !== null
              ? `${remaining} messages remaining today`
              : "AI-powered campus helper"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              title="Clear conversation history"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Sparkles className="h-4 w-4 text-primary/60" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : messages.length === 0 ? (
          <div className="space-y-4 pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Ask me anything about Dorm67 or campus life — your history is saved automatically!
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-lg border bg-card px-4 py-3 text-left text-sm transition hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                {msg.content === "" && msg.role === "assistant" ? (
                  <TypingDots />
                ) : msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose-ai">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ol: ({ children }) => <ol className="ml-4 list-decimal space-y-0.5 my-1">{children}</ol>,
                        ul: ({ children }) => <ul className="ml-4 list-disc space-y-0.5 my-1">{children}</ul>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        code: ({ children }) => (
                          <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">{children}</code>
                        ),
                        a: ({ href, children }) => (
                          <a href={href} className="underline underline-offset-2 opacity-80 hover:opacity-100" target="_blank" rel="noreferrer">{children}</a>
                        ),
                        h3: ({ children }) => <p className="font-semibold mt-2 mb-0.5">{children}</p>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isAiProcessing && messages.length > 0 && messages[messages.length - 1].role !== "assistant" && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            <button
              className="ml-2 underline"
              onClick={() => {
                setError(null);
                const lastUser = [...messages].reverse().find((m) => m.role === "user");
                if (lastUser) sendMessage(lastUser.content);
              }}
            >
              Try again
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isStreaming || isLoading}
            maxLength={2000}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isStreaming || isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
