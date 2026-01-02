import { MessageCircle, Users, Disc, Settings } from "lucide-react";

type Tab = "chats" | "stories" | "contacts" | "settings";

interface MobileNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const tabs = [
    { id: "chats" as Tab, icon: MessageCircle, label: "Messages" },
    { id: "stories" as Tab, icon: Disc, label: "Statuts" },
    { id: "contacts" as Tab, icon: Users, label: "Contacts" },
    { id: "settings" as Tab, icon: Settings, label: "Paramètres" },
  ];

  return (
    <nav className="flex items-center justify-around py-2 px-4 bg-card border-t border-border md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            activeTab === tab.id
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <tab.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
