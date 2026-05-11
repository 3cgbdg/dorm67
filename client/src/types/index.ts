export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  universityId?: string;
  universityName?: string;
  dormName?: string;
  isVerified?: boolean;
  createdAt?: string;
};

export type Listing = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition?: string;
  images: string[];
  status: "active" | "sold";
  soldAt?: string;
  createdAt: string;
};

export type Announcement = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  body: string;
  isOfficial: boolean;
  universityId?: string;
  likesCount: number;
  likedBy?: string[];
  commentsCount: number;
  createdAt: string;
};

export type Conversation = {
  id: string;
  listingId?: string;
  participantIds: string[];
  participantKey: string;
  participantProfiles?: Record<string, { fullName: string; avatarUrl?: string }>;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
};
