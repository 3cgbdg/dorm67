import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { router } from "@/router";
import "@/index.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hydrateThemeClassFromStorage } from "@/store/uiStore";

hydrateThemeClassFromStorage();

function PwaUpdateNotifier() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast("A new version of Dorm67 is available!", {
        duration: Infinity,
        action: {
          label: "Update",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
        <PwaUpdateNotifier />
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
