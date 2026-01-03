import { useState, useRef } from "react";
import { X, Image, Type, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const BACKGROUND_COLORS = [
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#533483",
  "#e94560",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
];

export function CreateStoryDialog({ open, onClose, onCreated }: CreateStoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadStoryMedia, uploading } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"text" | "image">("text");
  const [content, setContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setMode("image");
    }
  };

  const handleCreate = async () => {
    if (!user) return;

    if (mode === "text" && !content.trim()) {
      toast({
        title: "Erreur",
        description: "Ajoutez du texte à votre statut",
        variant: "destructive",
      });
      return;
    }

    if (mode === "image" && !imageFile) {
      toast({
        title: "Erreur",
        description: "Sélectionnez une image",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const { data, error } = await uploadStoryMedia(imageFile);
        if (error) throw error;
        imageUrl = data?.url;
      }

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        content: mode === "text" ? content : null,
        image_url: imageUrl,
        background_color: mode === "text" ? backgroundColor : null,
      });

      if (error) throw error;

      toast({ title: "Statut publié !" });
      onCreated();
      handleClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le statut",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setMode("text");
    setBackgroundColor(BACKGROUND_COLORS[0]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle>Créer un statut</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "text" ? "default" : "outline"}
              onClick={() => setMode("text")}
              className="flex-1"
            >
              <Type className="w-4 h-4 mr-2" />
              Texte
            </Button>
            <Button
              variant={mode === "image" ? "default" : "outline"}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Image className="w-4 h-4 mr-2" />
              Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Preview */}
          <div
            className="relative aspect-[9/16] max-h-[400px] rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: mode === "text" ? backgroundColor : undefined,
            }}
          >
            {mode === "image" && imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setMode("text");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Écrivez quelque chose..."
                className="absolute inset-0 w-full h-full bg-transparent border-0 text-white text-xl text-center resize-none flex items-center justify-center p-8 placeholder:text-white/50"
                style={{ textAlign: "center" }}
              />
            )}
          </div>

          {/* Background Colors (for text mode) */}
          {mode === "text" && (
            <div className="flex gap-2 justify-center flex-wrap">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBackgroundColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    backgroundColor === color ? "scale-125 ring-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={creating || uploading}
            className="w-full gradient-primary"
          >
            {creating || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Publier"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
