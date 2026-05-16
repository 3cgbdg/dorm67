import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { handleAppError } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { EmptyState } from "@/components/data/EmptyState";
import { PullRefreshChrome } from "@/components/layout/PullRefreshChrome";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fadeUpVariants, staggerContainerVariants } from "@/lib/motion";
import { haystackIncludesAllTokens, searchTokens } from "@/lib/searchText";
import type { Announcement } from "@/types";

export function FeedPage() {
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState(urlQ);
  const [filter, setFilter] = useState<"all" | "official" | "students">("all");

  const onPull = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 450));
    toast.success("Feed refreshed");
  }, []);

  useEffect(() => {
    setSearch(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = search.trim();
          if (trimmed) next.set("q", trimmed);
          else next.delete("q");
          if (next.toString() === prev.toString()) return prev;
          return next;
        },
        { replace: true }
      );
    }, 400);
    return () => window.clearTimeout(t);
  }, [search, setSearchParams]);

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
    const tokens = searchTokens(search);
    return announcements.filter((item) => {
      const hay = [item.title, item.body, item.userName].filter(Boolean).join(" ");
      const matchesSearch = haystackIncludesAllTokens(hay, tokens);
      const matchesFilter =
        filter === "all" ||
        (filter === "official" && item.isOfficial) ||
        (filter === "students" && !item.isOfficial);
      return matchesSearch && matchesFilter;
    });
  }, [announcements, filter, search]);

  return (
    <>
      <PullRefreshChrome onRefresh={onPull} />
      <div className="page-container space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Campus feed</h2>
        <a href="/create-announcement">
          <Button>Post announcement</Button>
        </a>
      </div>
      <Input placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        <Chip selected={filter === "official"} onClick={() => setFilter("official")}>
          Official
        </Chip>
        <Chip selected={filter === "students"} onClick={() => setFilter("students")}>
          Students
        </Chip>
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
          <motion.div
            className="space-y-3"
            variants={reduceMotion ? undefined : staggerContainerVariants}
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? false : "visible"}
          >
            {filtered.map((announcement) => (
              <motion.div key={announcement.id} variants={reduceMotion ? undefined : fadeUpVariants}>
                <AnnouncementCard announcement={announcement} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}