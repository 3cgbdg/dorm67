import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Bell,
  Home,
  Sparkles,
  LogOut,
  MessageSquare,
  PlusSquare,
  Settings,
  ShoppingBag,
  User,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/AppLogo";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { auth } from "@/lib/firebase";
import { UnreadDot } from "@/components/feature/UnreadDot";
import { Separator } from "@/components/ui/separator";
import { useUiStore } from "@/store/uiStore";

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean };

const browse: NavItem[] = [
  { to: "/feed", label: "Campus", icon: Home },
  { to: "/marketplace", label: "Market", icon: ShoppingBag },
  { to: "/discover", label: "Discover", icon: Users },
  { to: "/post", label: "Create", icon: PlusSquare },
];

const you: NavItem[] = [
  { to: "/chats", label: "Chats", icon: MessageSquare },
  { to: "/ai-tools", label: "AI Tools", icon: Sparkles },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const sidebarPinned = useUiStore((s) => s.sidebarPinned);
  const setSidebarPinned = useUiStore((s) => s.setSidebarPinned);
  const [hovered, setHovered] = useState(false);

  const expanded = sidebarPinned || hovered;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        const p = useUiStore.getState().sidebarPinned;
        setSidebarPinned(!p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSidebarPinned]);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors",
      active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
    );

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to);
    const showBadge = item.to === "/notifications" && unreadCount > 0;

    return (
      <Link key={item.to} to={item.to} className={linkClass(active)} title={item.label}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <Icon className="h-5 w-5 shrink-0" />
          {showBadge ? <UnreadDot count={unreadCount} className="-right-0.5 -top-0.5" /> : null}
        </div>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap font-medium"
            >
              {item.label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 hidden h-screen min-h-0 shrink-0 flex-col border-r border-border bg-surface/90 py-3 transition-[width] duration-200 ease-out lg:flex lg:flex-col",
        expanded ? "w-60 px-2.5" : "w-[72px] px-2"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn("shrink-0", expanded ? "flex items-center justify-start gap-2 px-1" : "flex items-center justify-center")}>
        <AppLogo compact={!expanded} />
      </div>

      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="space-y-1">{browse.map(renderLink)}</div>
        <Separator className="my-1.5" />
        <div className="space-y-1">{you.map(renderLink)}</div>
        <div className="flex-1" />
        <Separator className="my-1.5" />
        <div className="space-y-1">
          <Link to="/profile" className={linkClass(location.pathname.startsWith("/profile"))} title="Profile">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.span
                  key="p"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap font-medium"
                >
                  Profile
                </motion.span>
              ) : null}
            </AnimatePresence>
          </Link>
          <button
            type="button"
            disabled
            className={cn(linkClass(false), "cursor-not-allowed opacity-50")}
            title="Settings (soon)"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.span
                  key="s"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap font-medium"
                >
                  Settings
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
          <button
            type="button"
            className={cn(linkClass(false), "w-full text-left")}
            title="Log out"
            onClick={async () => {
              await signOut(auth);
              navigate("/auth/onboarding");
            }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.span
                  key="l"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap font-medium"
                >
                  Log out
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        </div>
      </nav>
    </aside>
  );
}
