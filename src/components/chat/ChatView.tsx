import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Smile, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/hooks/useConversations";
import { Message, useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const { user } = useAuth();
  const { messages, sendMessage, loading } = useMessages(conversation.id);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const name = conversation.is_group
    ? conversation.name
    : conversation.other_user?.display_name || conversation.other_user?.username || "Utilisateur";

  const avatar = conversation.is_group
    ? conversation.image_url
    : conversation.other_user?.avatar_url;

  const isOnline = !conversation.is_group && conversation.other_user?.is_online;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setNewMessage("");
    await sendMessage(newMessage.trim());
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border glass">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.is_group ? (
                <Users className="w-4 h-4" />
              ) : (
                name?.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{name}</h2>
          <p className="text-xs text-muted-foreground">
            {isOnline ? "En ligne" : conversation.is_group ? `${conversation.members?.length || 0} membres` : "Hors ligne"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Chargement...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>Aucun message</p>
            <p className="text-sm">Envoyez le premier message !</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                showAvatar={
                  conversation.is_group &&
                  message.sender_id !== user?.id &&
                  (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border glass">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez un message..."
            className="flex-1 bg-secondary border-0"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="shrink-0 gradient-primary"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
  showAvatar,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}) {
  const time = format(new Date(message.created_at), "HH:mm", { locale: fr });

  return (
    <div
      className={`flex items-end gap-2 animate-fade-in ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {showAvatar ? (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {message.sender?.display_name?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8" />
      )}

      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
          isOwn
            ? "bg-chat-sent text-chat-sent-foreground rounded-br-sm"
            : "bg-chat-received text-chat-received-foreground rounded-bl-sm"
        }`}
      >
        {showAvatar && message.sender?.display_name && (
          <p className="text-xs font-semibold mb-1 opacity-70">
            {message.sender.display_name}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-right opacity-70" : "opacity-50"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
