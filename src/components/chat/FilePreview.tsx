import { X, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="relative inline-flex items-center gap-2 p-2 bg-secondary rounded-lg animate-scale-in">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="w-16 h-16 object-cover rounded"
        />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center bg-muted rounded">
          {file.type.includes("pdf") ? (
            <FileText className="w-8 h-8 text-muted-foreground" />
          ) : (
            <File className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate max-w-[150px]">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

interface MessageAttachmentProps {
  fileUrl: string;
  fileName: string;
  messageType: string;
}

export function MessageAttachment({ fileUrl, fileName, messageType }: MessageAttachmentProps) {
  const isImage = messageType === "image";

  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-[250px] max-h-[300px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 bg-background/20 rounded-lg hover:bg-background/30 transition-colors"
    >
      <FileText className="w-5 h-5" />
      <span className="text-sm truncate max-w-[200px]">{fileName}</span>
    </a>
  );
}
