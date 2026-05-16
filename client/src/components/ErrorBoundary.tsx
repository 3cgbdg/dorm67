import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dorm67 UI error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message;
      return (
        <div className="page-container flex min-h-[50vh] flex-col gap-4 py-8">
          <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
          {msg ? (
            <p className="max-w-xl rounded-md border border-border bg-surface-2/80 p-3 font-mono text-xs text-ink-soft">
              {msg}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
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
    return this.props.children;
  }
}
