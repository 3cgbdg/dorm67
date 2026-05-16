import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
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
import { PageLoader } from "@/components/data/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  const cta = (
    <div className="flex flex-col gap-2">
      {!isOwner ? (
        <>
          <Button className="w-full" onClick={() => toggleSavedListing(id)}>
            Save / Unsave
          </Button>
          <Button
            variant="outline"
            className="w-full"
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
          <Button variant="outline" className="w-full" onClick={() => markListingSold(id)}>
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
            danger
          />
        </>
      )}
    </div>
  );

  return (
    <div className="page-container max-w-6xl space-y-6 pb-28 lg:pb-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ImageCarousel images={listing.images} alt={listing.title} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-2xl font-semibold leading-tight">{listing.title}</CardTitle>
                <p className="text-sm text-ink-soft">
                  Listed by {listing.userName}
                  {listing.condition ? ` · ${listing.condition}` : ""}
                </p>
              </div>
              {listing.status === "sold" ? <Badge variant="danger-soft">Sold</Badge> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-semibold tabular-nums">
                {listing.price === 0 ? "Free" : formatMoney(listing.price)}
              </p>
              <Separator />
              <p className="whitespace-pre-wrap text-ink-soft">{listing.description || "No description."}</p>
            </CardContent>
          </Card>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Buy this item</CardTitle>
            </CardHeader>
            <CardContent>{cta}</CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4">{cta}</div>
      </div>
    </div>
  );
}
