import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { handleAppError } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/types";

export function FeedPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "official" | "students">("all");

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        setAnnouncements(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Announcement))
        );
      },
      (error) => {
        const message = (error.message || "").toLowerCase();
        if (message.includes("offline")) {
          toast.warning("You are offline. Campus feed will sync when connection is back.");
          return;
        }
        handleAppError(error, toast);
      }
    );
  }, []);

  const filtered = useMemo(() => {
    return announcements.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "official" && item.isOfficial) ||
        (filter === "students" && !item.isOfficial);
      return matchesSearch && matchesFilter;
    });
  }, [announcements, filter, search]);

  return (
    <div className="page-container space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Campus feed</h2>
        <a href="/create-announcement">
          <Button>Post announcement</Button>
        </a>
      </div>
      <Input placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          All
        </Button>
        <Button
          variant={filter === "official" ? "default" : "outline"}
          onClick={() => setFilter("official")}
        >
          Official
        </Button>
        <Button
          variant={filter === "students" ? "default" : "outline"}
          onClick={() => setFilter("students")}
        >
          Students
        </Button>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState 
            icon={MessageSquare} 
            title="No announcements found" 
            description="There are no announcements matching your filters. Be the first to share something with the campus!" 
            action={
              <a href="/create-announcement">
                <Button variant="outline" size="sm">Post announcement</Button>
              </a>
            }
          />
        ) : (
          filtered.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))
        )}
      </div>
    </div>
  );
}
