import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

export function Header() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onOutsideClick);
    return () => window.removeEventListener("mousedown", onOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md lg:flex">
      <div className="flex items-center gap-4">
        {/* Empty space for alignment since Sidebar has logo on desktop */}
      </div>
      <div className="flex items-center gap-3">
        <Link to="/notifications" className="rounded-md p-2 hover:bg-muted">
          <Bell className="h-4 w-4" />
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md p-1 hover:bg-muted"
          >
            <Avatar src={profile?.avatarUrl} name={profile?.fullName} />
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {open ? (
            <div className="absolute right-0 mt-2 w-44 rounded-md border bg-card p-2 shadow-lofi">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full items-center justify-start gap-2 px-2"
                onClick={async () => {
                  setOpen(false);
                  await signOut(auth);
                  navigate("/auth/onboarding");
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
