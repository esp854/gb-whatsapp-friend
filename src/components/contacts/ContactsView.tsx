import { useState, useEffect } from "react";
import { Search, UserPlus, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddContactDialog } from "./AddContactDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  status: string;
  created_at: string;
  contact_profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean | null;
  };
  user_profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean | null;
  };
}

export function ContactsView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Contact[]>([]);
  const [pendingSent, setPendingSent] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchContacts = async () => {
    if (!user) return;

    // Fetch accepted contacts (both directions)
    const { data: acceptedAsUser } = await supabase
      .from("contacts")
      .select(`
        *,
        contact_profile:profiles!contacts_contact_id_fkey(id, username, display_name, avatar_url, is_online)
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const { data: acceptedAsContact } = await supabase
      .from("contacts")
      .select(`
        *,
        user_profile:profiles!contacts_user_id_fkey(id, username, display_name, avatar_url, is_online)
      `)
      .eq("contact_id", user.id)
      .eq("status", "accepted");

    // Merge both directions
    const allAccepted = [
      ...(acceptedAsUser || []),
      ...(acceptedAsContact || []).map((c) => ({
        ...c,
        contact_profile: c.user_profile,
      })),
    ];

    // Fetch pending requests received
    const { data: received } = await supabase
      .from("contacts")
      .select(`
        *,
        user_profile:profiles!contacts_user_id_fkey(id, username, display_name, avatar_url, is_online)
      `)
      .eq("contact_id", user.id)
      .eq("status", "pending");

    // Fetch pending requests sent
    const { data: sent } = await supabase
      .from("contacts")
      .select(`
        *,
        contact_profile:profiles!contacts_contact_id_fkey(id, username, display_name, avatar_url, is_online)
      `)
      .eq("user_id", user.id)
      .eq("status", "pending");

    setContacts(allAccepted);
    setPendingReceived(received || []);
    setPendingSent(sent || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  const handleAccept = async (contactId: string) => {
    const { error } = await supabase
      .from("contacts")
      .update({ status: "accepted" })
      .eq("id", contactId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    } else {
      toast({ title: "Demande acceptée" });
      fetchContacts();
    }
  };

  const handleReject = async (contactId: string) => {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
    } else {
      toast({ title: "Demande refusée" });
      fetchContacts();
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const name = c.contact_profile?.display_name || c.contact_profile?.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Get all existing contact IDs
  const existingContactIds = [
    ...contacts.map((c) => c.contact_profile?.id || c.contact_id),
    ...pendingSent.map((c) => c.contact_id),
    ...pendingReceived.map((c) => c.user_id),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setShowAddDialog(true)}
          >
            <UserPlus className="w-5 h-5" />
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

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="all" className="flex-1">
            Tous ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            En attente ({pendingReceived.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex-1">
            Envoyées ({pendingSent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 overflow-y-auto scrollbar-hide mt-0 p-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Chargement...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Aucun contact</p>
              <Button 
                variant="link" 
                onClick={() => setShowAddDialog(true)}
                className="mt-2"
              >
                Ajouter des contacts
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.contact_profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.contact_profile?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {contact.contact_profile?.is_online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {contact.contact_profile?.display_name || contact.contact_profile?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.contact_profile?.is_online ? "En ligne" : "Hors ligne"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="flex-1 overflow-y-auto scrollbar-hide mt-0 p-4">
          {pendingReceived.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingReceived.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {request.user_profile?.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {request.user_profile?.display_name || request.user_profile?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Souhaite vous ajouter
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleReject(request.id)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="gradient-primary"
                      onClick={() => handleAccept(request.id)}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="flex-1 overflow-y-auto scrollbar-hide mt-0 p-4">
          {pendingSent.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Aucune demande envoyée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingSent.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={request.contact_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {request.contact_profile?.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {request.contact_profile?.display_name || request.contact_profile?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      En attente de réponse
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleReject(request.id)}
                  >
                    Annuler
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdded={fetchContacts}
        existingContactIds={existingContactIds}
      />
    </div>
  );
}
