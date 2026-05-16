import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchUsers, findOrCreateDirectConversation } from "@/lib/firestore";
import { Input } from "@/components/ui/input";
import { UserCard } from "@/components/feature/UserCard";
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
        <p className="text-ink-soft">Find your friends and other students from your dorm.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
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
            <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-surface-2" />
          ))
        ) : users.length > 0 ? (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onMessage={(userId) => {
                void handleStartChat(userId);
              }}
            />
          ))
        ) : searchTerm.length >= 2 ? (
          <div className="col-span-full py-12 text-center text-ink-soft">
            No students found matching "{searchTerm}"
          </div>
        ) : (
          <div className="col-span-full py-12 text-center text-ink-soft">
            Start typing to find people on Dorm67...
          </div>
        )}
      </div>
    </div>
  );
}
