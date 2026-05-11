import { useEffect, useState } from "react";
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
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { findOrCreateDirectConversation } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";
import { MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/utils";
import type { Conversation } from "@/types";

type SearchUser = {
  id: string;
  fullName: string;
  universityId?: string;
  avatarUrl?: string;
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

  // Filter by last message OR participant name
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const msg = (c.lastMessage || "").toLowerCase().includes(search.toLowerCase());
    const otherId = c.participantIds.find((id) => id !== user?.uid);
    const name = otherId
      ? (c.participantProfiles?.[otherId]?.fullName || "").toLowerCase().includes(search.toLowerCase())
      : false;
    return msg || name;
  });

  // Search university users for new conversations
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

  return (
    <div className="page-container space-y-4">
      <h2 className="text-2xl font-semibold">Chats</h2>
      <Input
        placeholder="Search conversations or people..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search.trim().length > 0 && search.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Type at least 2 letters to search people in your university.
        </p>
      ) : null}

      {/* People search results */}
      {searchUsers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">People from your university</p>
          {searchUsers.map((candidate) => (
            <Card key={candidate.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={candidate.avatarUrl} name={candidate.fullName} />
                  <p className="font-medium">{candidate.fullName || "Student"}</p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    const conversationId = await findOrCreateDirectConversation(candidate.id);
                    navigate(`/conversation/${conversationId}`);
                  }}
                >
                  Start chat
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Conversations list */}
      <div className="space-y-2">
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
            <Link key={conversation.id} to={`/conversation/${conversation.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar src={otherAvatar} name={otherName} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{otherName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {conversation.lastMessage || "Start a conversation..."}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(conversation.lastMessageAt)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        }))}
      </div>
    </div>
  );
}
