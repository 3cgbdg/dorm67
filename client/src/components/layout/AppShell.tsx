import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PageShellProvider } from "@/components/layout/page-shell-context";
import { GlobalSearchProvider } from "@/components/layout/global-search-context";

export function AppShell() {
  return (
    <GlobalSearchProvider>
      <PageShellProvider>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
            <TopBar />
            <main className="flex-1 overflow-x-hidden">
              <Outlet />
            </main>
          </div>
          <MobileNav />
        </div>
      </PageShellProvider>
    </GlobalSearchProvider>
  );
}
