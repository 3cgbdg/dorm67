import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Listing } from "@/types";

export function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setListings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Listing)));
    });
  }, []);

  const filtered = useMemo(() => {
    const matches = listings.filter((item) => {
      const searchMatch = item.title.toLowerCase().includes(search.toLowerCase());
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

  return (
    <div className="page-container space-y-4">
      <h2 className="text-2xl font-semibold">Marketplace</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search listings..." />
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
      {filtered.length === 0 ? (
        <EmptyState 
          icon={PackageSearch} 
          title="No items found" 
          description="We couldn't find any listings matching your search. Try adjusting your filters or be the first to sell something!" 
          action={
            <a href="/create-listing">
              <Button variant="outline" size="sm">Sell an item</Button>
            </a>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
