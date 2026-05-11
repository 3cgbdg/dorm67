import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, MessageCircle, MapPin } from "lucide-react";
import { searchUsers, findOrCreateDirectConversation } from "@/lib/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { handleAppError } from "@/lib/utils";

export function DiscoverPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        try {
          setLoading(true);
          const results = await searchUsers(searchTerm);
          // Filter out current user
          setUsers(results.filter(u => u.id !== currentUser?.uid));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else if (searchTerm.length === 0) {
        setUsers([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser]);

  const handleStartChat = async (userId: string) => {
    try {
      const conversationId = await findOrCreateDirectConversation(userId);
      navigate(`/conversation/${conversationId}`);
    } catch (err) {
      handleAppError(err, toast);
    }
  };

  return (
    <div className="page-container space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Discover People</h1>
        <p className="text-muted-foreground">Find your friends and other students from your dorm.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-muted" />
          ))
        ) : users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id} className="overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.fullName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold leading-none">{user.fullName}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {user.dormName || "Dorm 67"}
                    </div>
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => handleStartChat(user.id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : searchTerm.length >= 2 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No students found matching "{searchTerm}"
          </div>
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Start typing to find people on Dorm67...
          </div>
        )}
      </div>
    </div>
  );
}
