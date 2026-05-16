import { Link } from "react-router-dom";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import type { Conversation } from "@/types";

type Props = {
  conversation: Conversation;
  otherName: string;
  otherAvatar?: string;
};

export function ConversationItem({ conversation, otherName, otherAvatar }: Props) {
  return (
    <Link to={`/conversation/${conversation.id}`}>
      <Card className="transition-colors hover:bg-surface-2/50">
        <CardContent className="flex items-center gap-3 p-4">
          <UserAvatar src={otherAvatar} name={otherName} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{otherName}</p>
            <p className="truncate text-sm text-ink-soft">
              {conversation.lastMessage || "Start a conversation..."}
            </p>
          </div>
          <span className="shrink-0 text-xs text-ink-soft">
            {timeAgo(conversation.lastMessageAt)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
