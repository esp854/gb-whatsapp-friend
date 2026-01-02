import { useState } from "react";
import { Search, Plus, Users, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/hooks/useConversations";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.is_group
      ? conv.name
      : conv.other_user?.display_name || conv.other_user?.username;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewChat}
            className="hover:bg-accent"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm text-center">Aucune conversation</p>
            <Button variant="link" onClick={onNewChat} className="mt-2">
              Démarrer une conversation
            </Button>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = conversation.is_group
    ? conversation.name
    : conversation.other_user?.display_name || conversation.other_user?.username || "Utilisateur";

  const avatar = conversation.is_group
    ? conversation.image_url
    : conversation.other_user?.avatar_url;

  const isOnline = !conversation.is_group && conversation.other_user?.is_online;

  const lastMessage = conversation.last_message;
  const timeAgo = lastMessage
    ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true, locale: fr })
    : "";

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors ${
        isSelected ? "bg-accent" : ""
      }`}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {conversation.is_group ? (
              <Users className="w-5 h-5" />
            ) : (
              name?.charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground truncate">{name}</span>
          {timeAgo && (
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {timeAgo}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage.message_type === "text"
              ? lastMessage.content
              : "📎 Fichier partagé"}
          </p>
        )}
      </div>
    </button>
  );
}
