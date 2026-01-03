import { useState, useEffect } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface AddContactDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingContactIds: string[];
}

export function AddContactDialog({
  open,
  onClose,
  onAdded,
  existingContactIds,
}: AddContactDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setUsers([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!search.trim() || search.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_online")
        .neq("id", user?.id || "")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(20);

      if (data) {
        // Filter out existing contacts
        const filtered = data.filter((u) => !existingContactIds.includes(u.id));
        setUsers(filtered);
      }
      setLoading(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, user, existingContactIds]);

  const handleSendRequest = async (profileId: string) => {
    if (!user) return;

    setSendingTo(profileId);

    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      contact_id: profileId,
      status: "pending",
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Demande déjà envoyée",
          description: "Vous avez déjà envoyé une demande à cet utilisateur",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer la demande",
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Demande envoyée !" });
      onAdded();
      // Remove user from list
      setUsers((prev) => prev.filter((u) => u.id !== profileId));
    }

    setSendingTo(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : search.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tapez au moins 2 caractères pour rechercher
              </p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun utilisateur trouvé
              </p>
            ) : (
              users.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {profile.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{profile.display_name || profile.username}</p>
                    {profile.username && profile.display_name && (
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(profile.id)}
                    disabled={sendingTo === profile.id}
                    className="gradient-primary"
                  >
                    {sendingTo === profile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Ajouter
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
