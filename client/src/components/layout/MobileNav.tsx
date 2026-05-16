import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, MessageCircle, Plus, ShoppingBag, User } from "lucide-react";
import { UnreadDot } from "@/components/feature/UnreadDot";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetPortal, SheetOverlay } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabClass =
  "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors";

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [sheetOpen, setSheetOpen] = useState(false);
  const path = location.pathname;

  const showFab = useMemo(() => {
    if (path.startsWith("/conversation/")) return false;
    if (path.startsWith("/create-")) return false;
    if (path === "/edit-profile") return false;
    if (path === "/ai-assistant") return false;
    if (path.startsWith("/ai-tools")) return false;
    return true;
  }, [path]);

  const fabActions = useMemo(() => {
    const go = (to: string) => {
      setSheetOpen(false);
      navigate(to);
    };
    if (path.startsWith("/feed") || path === "/")
      return [
        { label: "Post announcement", onClick: () => go("/create-announcement") },
        { label: "Sell item", onClick: () => go("/create-listing") },
        { label: "Find people", onClick: () => go("/discover") },
        { label: "AI tools", onClick: () => go("/ai-tools") },
      ];
    if (path.startsWith("/marketplace"))
      return [
        { label: "Sell item", onClick: () => go("/create-listing") },
        { label: "AI tools", onClick: () => go("/ai-tools") },
      ];
    if (path.startsWith("/chats"))
      return [
        { label: "New message", onClick: () => go("/discover") },
        { label: "AI tools", onClick: () => go("/ai-tools") },
      ];
    if (path.startsWith("/profile"))
      return [
        { label: "Edit profile", onClick: () => go("/edit-profile") },
        { label: "AI tools", onClick: () => go("/ai-tools") },
      ];
    return [
      { label: "Post announcement", onClick: () => go("/create-announcement") },
      { label: "Sell item", onClick: () => go("/create-listing") },
      { label: "Find people", onClick: () => go("/discover") },
      { label: "Ask AI", onClick: () => go("/ai-assistant") },
    ];
  }, [path, navigate]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 grid h-16 grid-cols-5 items-stretch border-t border-border bg-surface/95 pb-safe pt-1 backdrop-blur-lg lg:hidden">
        <NavLink
          to="/feed"
          className={({ isActive }) =>
            cn(tabClass, isActive ? "text-brand" : "text-ink-soft hover:text-ink")
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="mobileDockPill"
                  className="absolute inset-x-1 top-1 h-8 rounded-xl bg-brand-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <Home className="relative z-10 h-5 w-5" />
              <span className="relative z-10">Feed</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/marketplace"
          className={({ isActive }) =>
            cn(tabClass, isActive ? "text-brand" : "text-ink-soft hover:text-ink")
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="mobileDockPill"
                  className="absolute inset-x-1 top-1 h-8 rounded-xl bg-brand-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <ShoppingBag className="relative z-10 h-5 w-5" />
              <span className="relative z-10">Market</span>
            </>
          )}
        </NavLink>

        <div className="relative flex items-center justify-center">
          {showFab ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="absolute -top-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-fg shadow-pop ring-4 ring-bg transition-transform active:scale-95"
              aria-label="Quick actions"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : (
            <span className="h-10 w-10" aria-hidden />
          )}
        </div>

        <NavLink
          to="/chats"
          className={({ isActive }) =>
            cn(tabClass, isActive ? "text-brand" : "text-ink-soft hover:text-ink")
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="mobileDockPill"
                  className="absolute inset-x-1 top-1 h-8 rounded-xl bg-brand-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <div className="relative z-10">
                <MessageCircle className="h-5 w-5" />
                <UnreadDot count={unreadCount} className="absolute -right-2 -top-1.5" />
              </div>
              <span className="relative z-10">Chats</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(tabClass, isActive ? "text-brand" : "text-ink-soft hover:text-ink")
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="mobileDockPill"
                  className="absolute inset-x-1 top-1 h-8 rounded-xl bg-brand-soft"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <User className="relative z-10 h-5 w-5" />
              <span className="relative z-10">Me</span>
            </>
          )}
        </NavLink>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetPortal>
          <SheetOverlay />
          <SheetContent className="gap-0 p-0">
            <SheetHeader className="border-b border-border px-4 pb-3 pt-2 text-left">
              <SheetTitle>Quick actions</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 p-4">
              {fabActions.map((a) => (
                <Button key={a.label} variant="outline" className="h-12 justify-start text-base" type="button" onClick={a.onClick}>
                  {a.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </>
  );
}
