import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAt,
  where,
  endAt,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { findOrCreateDirectConversation } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";
import { MessageCircle, Search } from "lucide-react";
import { EmptyState } from "@/components/data/EmptyState";
import { PullRefreshChrome } from "@/components/layout/PullRefreshChrome";
import { Input } from "@/components/ui/input";
import { ConversationItem } from "@/components/feature/ConversationItem";
import { UserCard } from "@/components/feature/UserCard";
import type { Conversation } from "@/types";

type SearchUser = {
  id: string;
  fullName: string;
  universityId?: string;
  avatarUrl?: string;
  dormName?: string;
};

export function ChatsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Conversation)));
    });
  }, [user]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const msg = (c.lastMessage || "").toLowerCase().includes(search.toLowerCase());
    const otherId = c.participantIds.find((id) => id !== user?.uid);
    const name = otherId
      ? (c.participantProfiles?.[otherId]?.fullName || "").toLowerCase().includes(search.toLowerCase())
      : false;
    return msg || name;
  });

  useEffect(() => {
    if (!user || !profile?.universityId) {
      setSearchUsers([]);
      return;
    }
    const term = search.trim();
    if (term.length < 2) {
      setSearchUsers([]);
      return;
    }

    void (async () => {
      const usersQuery = query(
        collection(db, "users"),
        where("universityId", "==", profile.universityId),
        orderBy("fullName"),
        startAt(term),
        endAt(`${term}\uf8ff`),
        limit(8)
      );
      const snap = await getDocs(usersQuery);
      setSearchUsers(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() } as SearchUser))
          .filter((candidate) => candidate.id !== user.uid)
      );
    })();
  }, [profile?.universityId, search, user]);

  const onPull = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 450));
    toast.success("Chats refreshed");
  }, []);

  return (
    <>
      <PullRefreshChrome onRefresh={onPull} />
      <div className="page-container space-y-5 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Chats</h2>
          <p className="text-sm text-ink-soft">Message classmates and sellers in one place.</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input
            className="h-11 rounded-xl border-border/70 bg-surface pl-10"
            placeholder="Search conversations or people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search.trim().length > 0 && search.trim().length < 2 ? (
          <p className="text-sm text-ink-soft">
            Type at least 2 letters to search people in your university.
          </p>
        ) : null}

        {searchUsers.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-surface/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              People from your university
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {searchUsers.map((candidate) => (
                <UserCard
                  key={candidate.id}
                  user={candidate}
                  onMessage={async (userId) => {
                    const conversationId = await findOrCreateDirectConversation(userId);
                    navigate(`/conversation/${conversationId}`);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {filtered.length > 0 ? (
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Conversations
            </p>
          ) : null}

          {filtered.length === 0 && !search ? (
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="You don't have any active chats. Search for a student above to start a conversation, or message a seller from the marketplace."
            />
          ) : filtered.length === 0 && search && searchUsers.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No results found"
              description="No conversations or students match your search."
            />
          ) : (
            filtered.map((conversation) => {
              const otherId = conversation.participantIds.find((id) => id !== user?.uid);
              const other = otherId ? conversation.participantProfiles?.[otherId] : undefined;
              const otherName = other?.fullName ?? "Student";
              const otherAvatar = other?.avatarUrl;

              return (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  otherName={otherName}
                  otherAvatar={otherAvatar}
                  unreadCount={Number(conversation.unreadCounts?.[user?.uid || ""] || 0)}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
