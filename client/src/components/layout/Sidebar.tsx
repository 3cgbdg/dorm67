import { Link, useLocation } from "react-router-dom";
import { Bot, Home, MessageSquare, PlusSquare, ShoppingBag, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/AppLogo";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const links = [
  { to: "/feed",         label: "Campus",    icon: Home },
  { to: "/marketplace", label: "Market",    icon: ShoppingBag },
  { to: "/discover",    label: "Discover",  icon: Users },
  { to: "/post",        label: "Create",    icon: PlusSquare },
  { to: "/chats",       label: "Chats",     icon: MessageSquare },
  { to: "/ai-assistant",label: "AI Help",   icon: Bot },
  { to: "/profile",     label: "Profile",   icon: User },
];

export function Sidebar() {
  const location = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <aside className="hidden w-64 border-r bg-card/70 p-4 lg:block">
      <AppLogo />
      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname.startsWith(link.to);
          const isNotifications = link.to === "/profile";

          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {/* Show unread badge on Profile since Notifications is under it */}
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
