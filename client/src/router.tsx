import { createBrowserRouter, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ErrorBoundary>
        <ProtectedRoute />
      </ErrorBoundary>
    ),
    children: [
      {
        element: <AppLayout />,
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
        ],
      },
    ],
  },
  { path: "/auth/onboarding", element: <OnboardingPage /> },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/register", element: <RegisterPage /> },
  { path: "/auth/university-select", element: <UniversitySelectPage /> },
]);
