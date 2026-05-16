import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; to?: string };

/** Human-readable trail from pathname (no network). */
export function breadcrumbsFromPathname(pathname: string): BreadcrumbItem[] {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";

  if (path === "/" || path === "/feed") {
    return [{ label: "Campus feed" }];
  }

  const parts = path.split("/").filter(Boolean);
  const out: BreadcrumbItem[] = [{ label: "Campus", to: "/feed" }];

  if (parts[0] === "announcement" && parts[1]) {
    out.push({ label: "Announcement" });
    return out;
  }

  if (parts[0] === "listing" && parts[1]) {
    out.push({ label: "Marketplace", to: "/marketplace" }, { label: "Listing" });
    return out;
  }

  if (parts[0] === "conversation" && parts[1]) {
    out.push({ label: "Chats", to: "/chats" }, { label: "Conversation" });
    return out;
  }

  const labelBySegment: Record<string, string> = {
    marketplace: "Marketplace",
    discover: "Discover",
    post: "Create",
    chats: "Chats",
    profile: "Profile",
    notifications: "Notifications",
    "saved-listings": "Saved listings",
    "create-listing": "Sell an item",
    "create-announcement": "New announcement",
    "edit-profile": "Edit profile",
    "ai-assistant": "AI assistant",
    "ai-tools": "AI tools",
    taras: "Taras",
  };

  let accum = "";
  for (let i = 0; i < parts.length; i++) {
    accum += "/" + parts[i];
    const seg = parts[i];
    const isLast = i === parts.length - 1;
    const label =
      seg === "taras" && parts[i - 1] === "ai-tools"
        ? "Taras"
        : labelBySegment[seg] ?? seg.replace(/-/g, " ");
    out.push({
      label,
      to: isLast ? undefined : accum,
    });
  }

  return out;
}

export function AppBreadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const items = useMemo(() => breadcrumbsFromPathname(pathname), [pathname]);

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex list-none flex-wrap items-center gap-x-1 gap-y-0.5 p-0 text-xs">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex max-w-full items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-soft opacity-60" aria-hidden />
              ) : null}
              {!isLast && item.to ? (
                <Link
                  to={item.to}
                  className="truncate font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn("truncate font-medium", isLast ? "text-ink" : "text-ink-soft")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
