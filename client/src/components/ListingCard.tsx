import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { Listing } from "@/types";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="h-full">
        <CardContent className="space-y-3">
          <img
            src={
              listing.images[0]?.includes("localhost") 
                ? "https://placehold.co/600x400?text=Image+Unavailable" 
                : listing.images[0] || "https://placehold.co/600x400?text=Listing"
            }
            alt={listing.title}
            className="h-44 w-full rounded-md object-cover"
          />
          <div className="flex items-center justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold">{listing.title}</h3>
            {listing.status === "sold" ? (
              <Badge className="bg-red-100 text-red-700">Sold</Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">{listing.condition}</div>
          <div className="font-semibold">
            {listing.price === 0 ? "Free" : formatMoney(listing.price)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
