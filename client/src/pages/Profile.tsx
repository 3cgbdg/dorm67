import { Link } from "react-router-dom";
import { Bell, Bot, Bookmark, MessageCircle, ShoppingBag, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { StatGrid } from "@/components/data/StatGrid";

type Stats = {
  listings: number;
  sold: number;
  chats: number;
  saved: number;
};

const tiles = [
  { to: "/discover", label: "Discover", desc: "Find people", icon: Users },
  { to: "/ai-assistant", label: "AI assistant", desc: "Campus helper", icon: Bot },
  { to: "/notifications", label: "Notifications", desc: "Alerts", icon: Bell },
  { to: "/saved-listings", label: "Saved", desc: "Wishlist", icon: Bookmark },
  { to: "/marketplace", label: "Marketplace", desc: "Browse listings", icon: ShoppingBag },
  { to: "/chats", label: "Chats", desc: "Messages", icon: MessageCircle },
] as const;

export function ProfilePage() {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats>({ listings: 0, sold: 0, chats: 0, saved: 0 });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const listingsCount = await getCountFromServer(
        query(collection(db, "listings"), where("userId", "==", user.uid))
      );
      const soldCount = await getCountFromServer(
        query(collection(db, "listings"), where("userId", "==", user.uid), where("status", "==", "sold"))
      );
      const chatsCount = await getCountFromServer(
        query(collection(db, "conversations"), where("participantIds", "array-contains", user.uid))
      );
      const savedCount = await getCountFromServer(collection(db, "users", user.uid, "savedListings"));
      setStats({
        listings: listingsCount.data().count,
        sold: soldCount.data().count,
        chats: chatsCount.data().count,
        saved: savedCount.data().count,
      });
    })();
  }, [user]);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Profile"
        description="Your campus hub"
        actions={
          <Link to="/edit-profile">
            <Button variant="outline">Edit profile</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <UserAvatar className="h-20 w-20 text-lg" src={profile?.avatarUrl} name={profile?.fullName} />
          <div className="flex-1 space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{profile?.fullName || "Student"}</h2>
            <p className="text-ink-soft">
              {profile?.universityName || "University"}
              {profile?.dormName ? ` • ${profile.dormName}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <StatGrid>
        <KpiCard label="Listings" value={stats.listings} />
        <KpiCard label="Sold" value={stats.sold} />
        <KpiCard label="Chats" value={stats.chats} />
        <KpiCard label="Saved" value={stats.saved} />
      </StatGrid>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink-soft">Shortcuts</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}>
                <Card className="h-full transition-all hover:shadow-pop">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-xs text-ink-soft">{t.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
