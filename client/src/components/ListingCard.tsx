import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { toggleSavedListing } from "@/lib/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { cn, formatMoney } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { Listing } from "@/types";

function listingImageUrl(url?: string) {
  if (!url) return "https://placehold.co/800x600?text=Listing";
  if (url.includes("localhost")) return "https://placehold.co/800x600?text=Image+Unavailable";
  return url;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const user = useAuthStore((s) => s.user);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setIsSaved(false);
      return;
    }
    const ref = doc(db, "users", user.uid, "savedListings", listing.id);
    return onSnapshot(ref, (snap) => setIsSaved(snap.exists()));
  }, [user?.uid, listing.id]);

  const img = listingImageUrl(listing.images[0]);

  return (
    <Link to={`/listing/${listing.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-pop">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
          <img src={img} alt={listing.title} className="h-full w-full object-cover" />
          {user ? (
            <div className="absolute right-2 top-2">
              <IconButton
                type="button"
                size="md"
                aria-label={isSaved ? "Remove from saved" : "Save listing"}
                className="rounded-full bg-surface/90 text-ink shadow-card backdrop-blur-sm hover:bg-surface"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSavedListing(listing.id).catch(() => toast.error("Could not update saved listings"));
                }}
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-danger text-danger")} />
              </IconButton>
            </div>
          ) : null}
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-h-[2.5rem] flex-1 text-sm font-semibold leading-snug">{listing.title}</h3>
            {listing.status === "sold" ? (
              <Badge variant="danger-soft" className="shrink-0">
                Sold
              </Badge>
            ) : null}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {listing.condition ? (
              <Badge variant="outline" className="font-normal capitalize">
                {listing.condition}
              </Badge>
            ) : null}
            <p className="ml-auto text-base font-semibold tabular-nums">
              {listing.price === 0 ? "Free" : formatMoney(listing.price)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
