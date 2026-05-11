import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { router } from "@/router";
import "@/index.css";

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
    <RouterProvider router={router} />
    <Toaster richColors position="top-right" />
    <PwaUpdateNotifier />
  </React.StrictMode>
);
