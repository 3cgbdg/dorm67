import { MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";

type UserRow = {
  id: string;
  fullName?: string;
  avatarUrl?: string;
  dormName?: string;
};

type Props = {
  user: UserRow;
  onMessage: (userId: string) => void;
};

export function UserCard({ user, onMessage }: Props) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <UserAvatar className="h-12 w-12 border" src={user.avatarUrl} name={user.fullName || "User"} />
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold leading-none">{user.fullName}</h3>
            <div className="flex items-center gap-1 text-xs text-ink-soft">
              <MapPin className="h-3 w-3" />
              {user.dormName || "Dorm 67"}
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full gap-2" type="button" onClick={() => onMessage(user.id)}>
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
