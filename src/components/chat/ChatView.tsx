import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Smile, Users, Image, X, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation } from "@/hooks/useConversations";
import { Message, useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useFileUpload } from "@/hooks/useFileUpload";
import { EmojiPicker } from "./EmojiPicker";
import { FilePreview, MessageAttachment } from "./FilePreview";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, sendMessage, loading, refetch } = useMessages(conversation.id);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(conversation.id);
  const { uploadChatAttachment, uploading } = useFileUpload();
  
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Mark messages as read
  useEffect(() => {
    if (!user || !conversation.id) return;

    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    };

    markAsRead();
  }, [messages, user, conversation.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    setSending(true);
    stopTyping();

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let messageType = "text";

      if (selectedFile) {
        const { data, error } = await uploadChatAttachment(selectedFile);
        if (error) throw error;
        
        fileUrl = data?.url;
        fileName = data?.fileName;
        messageType = selectedFile.type.startsWith("image/") ? "image" : "file";
      }

      await sendMessage(
        newMessage.trim() || (fileName || "Fichier"),
        messageType,
        fileUrl,
        fileName
      );

      setNewMessage("");
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 10 Mo",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    } else {
      refetch();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
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
            {typingUsers.length > 0 ? (
              <span className="text-primary animate-pulse">
                {typingUsers.map((u) => u.display_name).join(", ")} écrit...
              </span>
            ) : isOnline ? (
              "En ligne"
            ) : conversation.is_group ? (
              `${conversation.members?.length || 0} membres`
            ) : (
              "Hors ligne"
            )}
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
                onDelete={() => handleDeleteMessage(message.id)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-border">
          <FilePreview file={selectedFile} onRemove={() => setSelectedFile(null)} />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border glass">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5" />
            </Button>
            {showEmojiPicker && (
              <EmojiPicker 
                onSelect={handleEmojiSelect} 
                onClose={() => setShowEmojiPicker(false)} 
              />
            )}
          </div>
          
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez un message..."
            className="flex-1 bg-secondary border-0"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}
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
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onDelete: () => void;
}) {
  const time = format(new Date(message.created_at), "HH:mm", { locale: fr });
  const hasAttachment = message.file_url && (message.message_type === "image" || message.message_type === "file");

  return (
    <div
      className={`flex items-end gap-2 animate-fade-in group ${isOwn ? "flex-row-reverse" : ""}`}
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

      <div className="relative">
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          
          {hasAttachment && (
            <MessageAttachment
              fileUrl={message.file_url!}
              fileName={message.file_name || "Fichier"}
              messageType={message.message_type}
            />
          )}
          
          {message.content && message.message_type === "text" && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
            <p className={`text-[10px] ${isOwn ? "opacity-70" : "opacity-50"}`}>
              {time}
            </p>
            {isOwn && (
              <span className="opacity-70">
                {message.is_read ? (
                  <CheckCheck className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
