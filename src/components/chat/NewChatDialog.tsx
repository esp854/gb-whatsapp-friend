import { useState, useEffect } from "react";
import { Search, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean | null;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateConversation: (memberIds: string[], isGroup: boolean, name?: string) => Promise<{ error: Error | null; data: any }>;
}

export function NewChatDialog({ open, onClose, onCreateConversation }: NewChatDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedUsers([]);
      setIsGroup(false);
      setGroupName("");
      return;
    }

    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_online")
        .neq("id", user?.id || "")
        .order("display_name");

      if (data) {
        setUsers(data);
      }
    };

    fetchUsers();
  }, [open, user]);

  const filteredUsers = users.filter((u) => {
    const name = u.display_name || u.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez au moins un utilisateur",
        variant: "destructive",
      });
      return;
    }

    if (isGroup && !groupName.trim()) {
      toast({
        title: "Erreur",
        description: "Entrez un nom pour le groupe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const shouldBeGroup = isGroup || selectedUsers.length > 1;
    const { error } = await onCreateConversation(
      selectedUsers,
      shouldBeGroup,
      shouldBeGroup ? groupName.trim() || "Nouveau groupe" : undefined
    );

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la conversation",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Conversation créée",
      });
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isGroup"
              checked={isGroup}
              onCheckedChange={(c) => setIsGroup(c === true)}
            />
            <label htmlFor="isGroup" className="text-sm cursor-pointer">
              Créer un groupe
            </label>
          </div>

          {/* Group name */}
          {(isGroup || selectedUsers.length > 1) && (
            <Input
              placeholder="Nom du groupe"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((id) => {
                const u = users.find((u) => u.id === id);
                if (!u) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-sm"
                  >
                    <span>{u.display_name || u.username}</span>
                    <button onClick={() => toggleUser(id)} className="ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des utilisateurs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun utilisateur trouvé
              </p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors ${
                    selectedUsers.includes(u.id) ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(u.display_name || u.username)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {u.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{u.display_name || u.username}</p>
                    {u.username && u.display_name && (
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    )}
                  </div>
                  <Checkbox checked={selectedUsers.includes(u.id)} />
                </button>
              ))
            )}
          </div>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || loading}
            className="w-full gradient-primary"
          >
            {loading ? "Création..." : "Créer la conversation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
