import { createBrowserRouter, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { OnboardingPage } from "@/pages/auth/Onboarding";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { UniversitySelectPage } from "@/pages/auth/UniversitySelect";
import { FeedPage } from "@/pages/Feed";
import { MarketplacePage } from "@/pages/Marketplace";
import { PostPage } from "@/pages/Post";
import { ChatsPage } from "@/pages/Chats";
import { ProfilePage } from "@/pages/Profile";
import { AnnouncementDetailPage } from "@/pages/AnnouncementDetail";
import { ListingDetailPage } from "@/pages/ListingDetail";
import { ConversationDetailPage } from "@/pages/ConversationDetail";
import { CreateListingPage } from "@/pages/CreateListing";
import { CreateAnnouncementPage } from "@/pages/CreateAnnouncement";
import { EditProfilePage } from "@/pages/EditProfile";
import { NotificationsPage } from "@/pages/Notifications";
import { SavedListingsPage } from "@/pages/SavedListings";
import { AiAssistantPage } from "@/pages/AiAssistant";
import { AiToolsPage } from "@/pages/AiTools";
import { TarasPage } from "@/pages/ai/Taras";
import { DiscoverPage } from "@/pages/Discover";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ProtectedRoute />
      </ErrorBoundary>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AppShell />,
        errorElement: <RouteErrorFallback />,
        children: [
          { index: true, element: <Navigate to="/feed" replace /> },
          { path: "feed", element: <FeedPage /> },
          { path: "marketplace", element: <MarketplacePage /> },
          { path: "post", element: <PostPage /> },
          { path: "chats", element: <ChatsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "announcement/:id", element: <AnnouncementDetailPage /> },
          { path: "listing/:id", element: <ListingDetailPage /> },
          { path: "conversation/:id", element: <ConversationDetailPage /> },
          { path: "create-listing", element: <CreateListingPage /> },
          { path: "create-announcement", element: <CreateAnnouncementPage /> },
          { path: "edit-profile", element: <EditProfilePage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "saved-listings", element: <SavedListingsPage /> },
          { path: "ai-assistant", element: <AiAssistantPage /> },
          { path: "ai-tools", element: <AiToolsPage /> },
          { path: "ai-tools/taras", element: <TarasPage /> },
          { path: "discover", element: <DiscoverPage /> },
        ],
      },
    ],
  },
  {
    path: "/auth/onboarding",
    element: <OnboardingPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: "/auth/login",
    element: <LoginPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: "/auth/register",
    element: <RegisterPage />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: "/auth/university-select",
    element: <UniversitySelectPage />,
    errorElement: <RouteErrorFallback />,
  },
]);
