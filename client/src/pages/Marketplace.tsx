import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/firebase";
import { haystackIncludesAllTokens, searchTokens } from "@/lib/searchText";
import { EmptyState } from "@/components/data/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { PullRefreshChrome } from "@/components/layout/PullRefreshChrome";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetOverlay, SheetPortal, SheetTitle } from "@/components/ui/sheet";
import type { Listing } from "@/types";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "other", label: "Other" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
];

export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState(urlQ);
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setListings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Listing)));
    });
  }, []);

  const filtered = useMemo(() => {
    const tokens = searchTokens(search);
    const matches = listings.filter((item) => {
      const hay = [item.title, item.description, item.category, item.userName].filter(Boolean).join(" ");
      const searchMatch = haystackIncludesAllTokens(hay, tokens);
      const categoryMatch =
        category === "all" ||
        (category === "free" ? item.price === 0 : item.category === category);
      const active = item.status === "active";
      return searchMatch && categoryMatch && active;
    });

    if (sort === "price-asc") {
      return [...matches].sort((a, b) => a.price - b.price);
    }
    if (sort === "price-desc") {
      return [...matches].sort((a, b) => b.price - a.price);
    }
    return matches;
  }, [category, listings, search, sort]);

  const onPull = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 450));
    toast.success("Marketplace refreshed");
  }, []);

  return (
    <>
      <PullRefreshChrome onRefresh={onPull} />
      <div className="page-container space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Marketplace</h2>
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." />

        <div className="hidden gap-3 md:grid md:grid-cols-3">
          <Select
            value={category}
            onValueChange={setCategory}
            options={[
              { value: "all", label: "All categories" },
              { value: "free", label: "Free" },
              { value: "electronics", label: "Electronics" },
              { value: "furniture", label: "Furniture" },
              { value: "other", label: "Other" },
            ]}
          />
          <Select
            value={sort}
            onValueChange={setSort}
            options={[
              { value: "newest", label: "Newest" },
              { value: "price-asc", label: "Price low to high" },
              { value: "price-desc", label: "Price high to low" },
            ]}
          />
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetPortal>
            <SheetOverlay />
            <SheetContent className="gap-4">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-soft">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip key={c.value} selected={category === c.value} onClick={() => setCategory(c.value)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-soft">Sort</p>
                <div className="flex flex-wrap gap-2">
                  {SORTS.map((s) => (
                    <Chip key={s.value} selected={sort === s.value} onClick={() => setSort(s.value)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <Button className="w-full" type="button" onClick={() => setFiltersOpen(false)}>
                Done
              </Button>
            </SheetContent>
          </SheetPortal>
        </Sheet>

        {filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No items found"
            description="We couldn't find any listings matching your search. Try adjusting your filters or be the first to sell something!"
            action={
              <a href="/create-listing">
                <Button variant="outline" size="sm">
                  Sell an item
                </Button>
              </a>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
