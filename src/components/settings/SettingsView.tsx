import { useState, useRef } from "react";
import { Camera, Edit2, Check, Moon, Sun, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Label } from "@/components/ui/label";

export function SettingsView() {
  const { profile, updateProfile } = useProfile();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { uploadAvatar, uploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [status, setStatus] = useState(profile?.status || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (field: string, value: string) => {
    setSaving(true);
    const { error } = await updateProfile({ [field]: value });
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive",
      });
    } else {
      toast({ title: "Sauvegardé" });
      setEditingField(null);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 Mo",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await uploadAvatar(file);
    
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger l'image",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      const { error: updateError } = await updateProfile({ avatar_url: data.url });
      
      if (updateError) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour l'avatar",
          variant: "destructive",
        });
      } else {
        toast({ title: "Avatar mis à jour !" });
      }
    }
  };

  const themes = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Système" },
  ] as const;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">
            Profil
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.display_name || profile?.username}
              </p>
              <p className="text-sm text-muted-foreground">@{profile?.username}</p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nom d'affichage</Label>
              {editingField === "display_name" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSave("display_name", displayName)}
                  disabled={saving}
                >
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDisplayName(profile?.display_name || "");
                    setEditingField("display_name");
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {editingField === "display_name" ? (
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary border-0"
              />
            ) : (
              <p className="text-foreground p-2 bg-secondary rounded-lg">
                {profile?.display_name || "Non défini"}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bio</Label>
              {editingField === "bio" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSave("bio", bio)}
                  disabled={saving}
                >
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBio(profile?.bio || "");
                    setEditingField("bio");
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {editingField === "bio" ? (
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-secondary border-0 min-h-[80px]"
                placeholder="Parlez de vous..."
              />
            ) : (
              <p className="text-foreground p-2 bg-secondary rounded-lg min-h-[60px]">
                {profile?.bio || "Aucune bio"}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Statut</Label>
              {editingField === "status" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSave("status", status)}
                  disabled={saving}
                >
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStatus(profile?.status || "");
                    setEditingField("status");
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {editingField === "status" ? (
              <Input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-secondary border-0"
                placeholder="Votre statut..."
              />
            ) : (
              <p className="text-foreground p-2 bg-secondary rounded-lg">
                {profile?.status || "Aucun statut"}
              </p>
            )}
          </div>
        </section>

        {/* Theme Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">
            Apparence
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                  theme === t.value
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-secondary border-2 border-transparent"
                }`}
              >
                <t.icon className={`w-6 h-6 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === t.value ? "text-primary" : "text-foreground"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
