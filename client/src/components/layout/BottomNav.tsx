import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, MessageSquare, User, Users, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const mobileLinks = [
  { to: "/feed",         label: "Feed",    icon: Home },
  { to: "/marketplace", label: "Market",  icon: ShoppingBag },
  { to: "/discover",    label: "People",  icon: Users },
  { to: "/chats",       label: "Chats",   icon: MessageSquare },
  { to: "/ai-assistant",label: "AI",      icon: Bot },
  { to: "/profile",     label: "Me",      icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-card/80 px-2 pb-safe backdrop-blur-lg lg:hidden">
      {mobileLinks.map((link) => {
        const Icon = link.icon;
        const active = location.pathname.startsWith(link.to);
        const isChats = link.to === "/chats";

        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {isChats && unreadCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
