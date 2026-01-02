import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatView } from "@/components/chat/ChatView";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { StoriesView } from "@/components/stories/StoriesView";
import { ContactsView } from "@/components/contacts/ContactsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { MessageCircle } from "lucide-react";

type Tab = "chats" | "stories" | "contacts" | "settings";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading: convsLoading, createConversation } = useConversations();

  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsMobileViewingChat(true);
  };

  const handleBackToList = () => {
    setIsMobileViewingChat(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel (Conversation List / Stories / Contacts / Settings) */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0 ${
            isMobileViewingChat ? "hidden md:block" : "block"
          }`}
        >
          {activeTab === "chats" && (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              onNewChat={() => setShowNewChat(true)}
            />
          )}
          {activeTab === "stories" && <StoriesView />}
          {activeTab === "contacts" && <ContactsView />}
          {activeTab === "settings" && <SettingsView />}
        </div>

        {/* Right Panel (Chat View) */}
        <div
          className={`flex-1 ${
            !isMobileViewingChat && !selectedConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedConversation ? (
            <ChatView conversation={selectedConversation} onBack={handleBackToList} />
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-secondary/30">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Sélectionnez une conversation</p>
                <p className="text-sm">ou démarrez une nouvelle discussion</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {!isMobileViewingChat && (
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreateConversation={createConversation}
      />
    </div>
  );
}
