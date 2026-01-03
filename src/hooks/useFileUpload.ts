import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
}

export function useFileUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    bucket: "chat-attachments" | "avatars" | "stories"
  ): Promise<{ data: UploadResult | null; error: Error | null }> => {
    if (!user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setProgress(100);
      
      return {
        data: {
          url: publicUrl,
          fileName: file.name,
          fileType: file.type,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = (file: File) => uploadFile(file, "avatars");
  const uploadChatAttachment = (file: File) => uploadFile(file, "chat-attachments");
  const uploadStoryMedia = (file: File) => uploadFile(file, "stories");

  return {
    uploading,
    progress,
    uploadAvatar,
    uploadChatAttachment,
    uploadStoryMedia,
  };
}
