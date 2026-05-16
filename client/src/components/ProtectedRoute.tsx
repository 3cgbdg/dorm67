import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { PageLoader } from "@/components/data/PageLoader";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader text="Verifying access..." />;
  }

  // `onAuthStateChanged` can lag behind `auth.currentUser` right after sign-in; without this
  // we briefly see `user === null` and bounce to onboarding even though the session exists.
  if (!user && auth.currentUser) {
    return <PageLoader text="Signing you in…" />;
  }

  if (!user) {
    return <Navigate to="/auth/onboarding" replace />;
  }

  return <Outlet />;
}
