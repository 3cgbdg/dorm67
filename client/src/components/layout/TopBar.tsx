import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGlobalSearch } from "@/components/layout/global-search-context";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { signOut } from "firebase/auth";
import { UserAvatar } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { usePageShell } from "@/components/layout/page-shell-context";
import { useUiStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { AppDrawer, AppDrawerContent, AppDrawerHeader, AppDrawerOverlay, AppDrawerPortal, AppDrawerTitle } from "@/components/ui/drawer";
import { NotificationsPeek } from "@/components/layout/notifications-peek";

export function TopBar() {
  const navigate = useNavigate();
  const { open: openGlobalSearch } = useGlobalSearch();
  const profile = useAuthStore((s) => s.profile);
  const { title, description } = usePageShell();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-4 border-b bg-bg/80 px-4 backdrop-blur-md lg:flex">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-ink">{title || "Dorm67"}</h1>
          {description ? <p className="truncate text-xs text-ink-soft">{description}</p> : null}
        </div>
        <div className="hidden max-w-md flex-1 md:block">
          <button
            type="button"
            onClick={() => openGlobalSearch()}
            className="relative w-full text-left"
            aria-label="Open search"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              readOnly
              tabIndex={-1}
              placeholder="Search campus… (⌘K)"
              className="pointer-events-none cursor-default bg-surface-2/50 pl-9"
              aria-hidden
            />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            className="rounded-md p-2 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand-ring"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <IconButton
            type="button"
            variant="outline"
            size="md"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => toggleTheme()}
            className="shrink-0 rounded-full border-border"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md p-1 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand-ring"
              >
                <UserAvatar src={profile?.avatarUrl} name={profile?.fullName} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/edit-profile">Edit profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut(auth);
                  navigate("/auth/onboarding");
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AppDrawer open={notifOpen} onOpenChange={setNotifOpen}>
        <AppDrawerPortal>
          <AppDrawerOverlay />
          <AppDrawerContent className="p-0">
            <AppDrawerHeader>
              <AppDrawerTitle>Notifications</AppDrawerTitle>
              <Link
                to="/notifications"
                className="text-xs font-medium text-brand hover:underline"
                onClick={() => setNotifOpen(false)}
              >
                View all
              </Link>
            </AppDrawerHeader>
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <NotificationsPeek />
            </div>
          </AppDrawerContent>
        </AppDrawerPortal>
      </AppDrawer>
    </>
  );
}
