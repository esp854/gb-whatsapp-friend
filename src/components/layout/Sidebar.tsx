import { MessageCircle, Users, Disc, Settings, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Tab = "chats" | "stories" | "contacts" | "settings";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { resolvedTheme, setTheme } = useTheme();

  const tabs = [
    { id: "chats" as Tab, icon: MessageCircle, label: "Messages" },
    { id: "stories" as Tab, icon: Disc, label: "Statuts" },
    { id: "contacts" as Tab, icon: Users, label: "Contacts" },
    { id: "settings" as Tab, icon: Settings, label: "Paramètres" },
  ];

  return (
    <div className="flex flex-col items-center py-4 px-2 bg-card border-r border-border h-full">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-6">
        <MessageCircle className="w-5 h-5 text-primary-foreground" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {tabs.map((tab) => (
          <Tooltip key={tab.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTabChange(tab.id)}
                className={`w-10 h-10 ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tab.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2">
        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-10 h-10 text-muted-foreground hover:text-foreground"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Changer le thème</p>
          </TooltipContent>
        </Tooltip>

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="w-10 h-10 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Déconnexion</p>
          </TooltipContent>
        </Tooltip>

        {/* Profile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onTabChange("settings")}
              className="mt-2"
            >
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{profile?.display_name || profile?.username || "Mon profil"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
