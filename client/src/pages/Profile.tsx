import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where } from "firebase/firestore";

type Stats = {
  listings: number;
  sold: number;
  chats: number;
  saved: number;
};

export function ProfilePage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats>({ listings: 0, sold: 0, chats: 0, saved: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
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
    <div className="page-container space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar src={profile?.avatarUrl} name={profile?.fullName} />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">{profile?.fullName || "Student"}</h2>
            <p className="text-muted-foreground">
              {profile?.universityName || "University"} {profile?.dormName ? `• ${profile.dormName}` : ""}
            </p>
          </div>
          <Link to="/edit-profile">
            <Button variant="outline">Edit profile</Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Listings</p><p className="text-2xl font-semibold">{stats.listings}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sold</p><p className="text-2xl font-semibold">{stats.sold}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Chats</p><p className="text-2xl font-semibold">{stats.chats}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saved</p><p className="text-2xl font-semibold">{stats.saved}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/marketplace"><Button variant="outline">My marketplace</Button></Link>
        <Link to="/saved-listings"><Button variant="outline">Saved listings</Button></Link>
        <Link to="/chats"><Button variant="outline">Chats</Button></Link>
        <Link to="/notifications"><Button variant="outline">Notifications</Button></Link>
        <Button
          variant="destructive"
          onClick={async () => {
            await signOut(auth);
            navigate("/auth/onboarding");
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
