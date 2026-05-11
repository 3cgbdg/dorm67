import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  deleteListingAndImages,
  findOrCreateConversation,
  markListingSold,
  toggleSavedListing,
} from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImageCarousel } from "@/components/ImageCarousel";
import { PageLoader } from "@/components/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { Listing } from "@/types";

export function ListingDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, "listings", id), (snap) => {
      if (snap.exists()) {
        setListing({ id: snap.id, ...snap.data() } as Listing);
      }
    });
  }, [id]);

  if (!listing) return <PageLoader text="Loading listing..." />;

  const isOwner = currentUser?.uid === listing.userId;

  return (
    <div className="page-container max-w-3xl space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <ImageCarousel images={listing.images} alt={listing.title} />
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{listing.title}</h2>
            {listing.status === "sold" ? <Badge className="bg-red-100 text-red-700">Sold</Badge> : null}
          </div>
          <p className="text-muted-foreground">{listing.description}</p>
          <p className="text-lg font-semibold">{listing.price === 0 ? "Free" : formatMoney(listing.price)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!isOwner ? (
          <>
            <Button onClick={() => toggleSavedListing(id)}>Save / Unsave</Button>
            <Button
              variant="outline"
              onClick={async () => {
                const conversationId = await findOrCreateConversation(id, listing.userId);
                navigate(`/conversation/${conversationId}`);
              }}
            >
              Message seller
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => markListingSold(id)}>
              Mark sold
            </Button>
            <ConfirmDialog
              title="Delete listing?"
              description="This will remove the listing and attached images."
              onConfirm={async () => {
                await deleteListingAndImages(id);
                navigate("/marketplace");
              }}
              triggerLabel="Delete"
              destructive
            />
          </>
        )}
      </div>
    </div>
  );
}
