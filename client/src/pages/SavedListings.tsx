import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/types";

export function SavedListingsPage() {
  const user = useAuthStore((state) => state.user);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "savedListings"), orderBy("createdAt", "desc"));
    return onSnapshot(q, async (snap) => {
      const listingIds = snap.docs.map((item) => item.id);
      const listingDocs = await Promise.all(
        listingIds.map((id) => getDoc(doc(db, "listings", id)))
      );
      setListings(
        listingDocs
          .filter((item) => item.exists())
          .map((item) => ({ id: item.id, ...item.data() } as Listing))
      );
    });
  }, [user]);

  return (
    <div className="page-container space-y-4">
      <h2 className="text-2xl font-semibold">Saved listings</h2>
      {listings.length === 0 ? (
        <EmptyState 
          icon={Bookmark} 
          title="No saved listings" 
          description="You haven't saved any listings yet. Items you save in the marketplace will appear here."
          action={
            <a href="/marketplace">
              <Button variant="outline" size="sm">Browse marketplace</Button>
            </a>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
