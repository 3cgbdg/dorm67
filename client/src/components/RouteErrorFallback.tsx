import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * React Router `errorElement` — catches loader/action/render errors for this route segment.
 */
export function RouteErrorFallback() {
  const error = useRouteError();

  let title = "Something went wrong";
  let detail = "This page hit an unexpected error. You can try again or go back to the app.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText || "Error"}`;
    if (typeof error.data === "string" && error.data) {
      detail = error.data;
    }
  } else if (error instanceof Error) {
    title = "Application error";
    detail = error.message;
  }

  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-ink-soft">{detail}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link to="/feed">Campus feed</Link>
        </Button>
      </div>
    </div>
  );
}
