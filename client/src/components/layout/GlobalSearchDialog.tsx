import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Megaphone, Package, Search, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { searchUsers } from "@/lib/firestore";
import {
  haystackIncludesAllTokens,
  scoreTokenMatch,
  searchTokens,
} from "@/lib/searchText";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Announcement, Listing } from "@/types";

const FETCH_LIMIT = 80;
const SHOW_EACH = 6;
const DEBOUNCE_MS = 320;

type UserHit = { id: string; fullName?: string; avatarUrl?: string; dormName?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
  onConsumedInitialQuery: () => void;
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
  initialQuery,
  onConsumedInitialQuery,
}: Props) {
  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [people, setPeople] = useState<UserHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      if (!wasOpen.current) {
        setQueryText(initialQuery);
        onConsumedInitialQuery();
      }
      wasOpen.current = true;
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    wasOpen.current = false;
  }, [open, initialQuery, onConsumedInitialQuery]);

  const runSearch = useCallback(async (raw: string) => {
    const tokens = searchTokens(raw);
    const id = ++requestId.current;
    if (tokens.length === 0) {
      setListings([]);
      setAnnouncements([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [listSnap, annSnap, peopleRes] = await Promise.all([
        getDocs(query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(FETCH_LIMIT))),
        getDocs(
          query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(FETCH_LIMIT))
        ),
        raw.trim().length >= 2 ? searchUsers(raw.trim()) : Promise.resolve([]),
      ]);

      if (id !== requestId.current) return;

      const listDocs = listSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
      const annDocs = annSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));

      const listFiltered = listDocs
        .filter((l) => l.status === "active")
        .map((l) => {
          const hay = [l.title, l.description, l.category, l.userName].filter(Boolean).join(" ");
          return { item: l, hay, score: scoreTokenMatch(hay, tokens) };
        })
        .filter((x) => haystackIncludesAllTokens(x.hay, tokens))
        .sort((a, b) => b.score - a.score)
        .slice(0, SHOW_EACH)
        .map((x) => x.item);

      const annFiltered = annDocs
        .map((a) => {
          const hay = [a.title, a.body, a.userName].filter(Boolean).join(" ");
          return { item: a, hay, score: scoreTokenMatch(hay, tokens) };
        })
        .filter((x) => haystackIncludesAllTokens(x.hay, tokens))
        .sort((a, b) => b.score - a.score)
        .slice(0, SHOW_EACH)
        .map((x) => x.item);

      const peopleFiltered = (peopleRes as UserHit[])
        .map((u) => {
          const hay = [u.fullName, u.dormName].filter(Boolean).join(" ");
          return { item: u, hay, score: scoreTokenMatch(hay, tokens) };
        })
        .filter((x) => haystackIncludesAllTokens(x.hay, tokens))
        .sort((a, b) => b.score - a.score)
        .slice(0, SHOW_EACH)
        .map((x) => x.item);

      setListings(listFiltered);
      setAnnouncements(annFiltered);
      setPeople(peopleFiltered);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void runSearch(queryText);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [open, queryText, runSearch]);

  const qEnc = useMemo(() => encodeURIComponent(queryText.trim()), [queryText]);
  const hasQuery = searchTokens(queryText).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">Search campus</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              ref={inputRef}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search listings, announcements, people…"
              className="border-0 bg-transparent pl-9 pr-24 shadow-none focus-visible:ring-0"
              aria-label="Global search"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[10px] text-ink-soft sm:block">
              Esc to close
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {!hasQuery ? (
            <p className="py-8 text-center text-sm text-ink-soft">
              Type to search across marketplace, feed, and discover.
            </p>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-ink-soft">Searching…</p>
          ) : (
            <div className="space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <Package className="h-3.5 w-3.5" />
                    Listings
                  </h3>
                  <Link
                    to={`/marketplace?q=${qEnc}`}
                    className="text-xs font-medium text-brand hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    View all
                  </Link>
                </div>
                {listings.length === 0 ? (
                  <p className="text-sm text-ink-soft">No matching listings in recent results.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface-2/40">
                    {listings.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/listing/${l.id}`}
                          className="block px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          onClick={() => onOpenChange(false)}
                        >
                          <p className="font-medium text-ink">{l.title}</p>
                          <p className="text-xs text-ink-soft">
                            {l.userName}
                            {l.category ? ` · ${l.category}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <Megaphone className="h-3.5 w-3.5" />
                    Announcements
                  </h3>
                  <Link
                    to={`/feed?q=${qEnc}`}
                    className="text-xs font-medium text-brand hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    View all
                  </Link>
                </div>
                {announcements.length === 0 ? (
                  <p className="text-sm text-ink-soft">No matching announcements in recent results.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface-2/40">
                    {announcements.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={`/announcement/${a.id}`}
                          className="block px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          onClick={() => onOpenChange(false)}
                        >
                          <p className="font-medium text-ink">{a.title}</p>
                          <p className="line-clamp-1 text-xs text-ink-soft">{a.body}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <Users className="h-3.5 w-3.5" />
                    People
                  </h3>
                  <Link
                    to={`/discover?q=${qEnc}`}
                    className="text-xs font-medium text-brand hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    View all
                  </Link>
                </div>
                {queryText.trim().length < 2 ? (
                  <p className="text-sm text-ink-soft">Enter at least 2 characters to search people by name.</p>
                ) : people.length === 0 ? (
                  <p className="text-sm text-ink-soft">No people matched that prefix.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border bg-surface-2/40">
                    {people.map((u) => (
                      <li key={u.id}>
                        <Link
                          to={`/discover?q=${encodeURIComponent(u.fullName ?? "")}`}
                          className="block px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                          onClick={() => onOpenChange(false)}
                        >
                          <p className="font-medium text-ink">{u.fullName || "Student"}</p>
                          {u.dormName ? <p className="text-xs text-ink-soft">{u.dormName}</p> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-[11px] text-ink-soft">
          <span className="hidden sm:inline">⌘K / Ctrl+K · </span>
          <span className="hidden sm:inline">/ to open · </span>
          Results are scoped to recent items; use “View all” for the full page search.
        </div>
      </DialogContent>
    </Dialog>
  );
}
