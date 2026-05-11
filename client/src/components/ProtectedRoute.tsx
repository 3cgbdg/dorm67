import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/PageLoader";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader text="Verifying access..." />;
  }
  
  if (!user) {
    return <Navigate to="/auth/onboarding" replace />;
  }
  
  return <Outlet />;
}
