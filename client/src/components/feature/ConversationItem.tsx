import { Link } from "react-router-dom";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { Conversation } from "@/types";

type Props = {
  conversation: Conversation;
  otherName: string;
  otherAvatar?: string;
  unreadCount?: number;
};

export function ConversationItem({ conversation, otherName, otherAvatar, unreadCount = 0 }: Props) {
  return (
    <Link to={`/conversation/${conversation.id}`} className="block">
      <Card className="overflow-hidden border-border/80 bg-surface/90 transition-all duration-200 hover:border-brand/30 hover:bg-surface-2/50 hover:shadow-lg">
        <CardContent className="flex items-center gap-3 px-4 py-3.5">
          <UserAvatar
            className="h-11 w-11 border border-border/70 bg-surface-2"
            src={otherAvatar}
            name={otherName}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-[15px] font-semibold leading-tight">{otherName}</p>
            <p className="truncate text-sm leading-tight text-ink-soft">
              {conversation.lastMessage || "Start a conversation..."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[11px] font-medium text-ink-soft">
              {timeAgo(conversation.lastMessageAt)}
            </span>
            {unreadCount > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
