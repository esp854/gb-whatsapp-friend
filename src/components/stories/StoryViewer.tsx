import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Story {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  background_color: string | null;
  expires_at: string;
  created_at: string;
}

interface StoryUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface StoryViewerProps {
  stories: Story[];
  user: StoryUser;
  initialIndex?: number;
  onClose: () => void;
  onPrevUser?: () => void;
  onNextUser?: () => void;
}

export function StoryViewer({
  stories,
  user: storyUser,
  initialIndex = 0,
  onClose,
  onPrevUser,
  onNextUser,
}: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story

  // Mark story as viewed
  useEffect(() => {
    if (!user || !currentStory || storyUser.id === user.id) return;

    supabase
      .from("story_views")
      .upsert(
        {
          story_id: currentStory.id,
          viewer_id: user.id,
        },
        { onConflict: "story_id,viewer_id" }
      )
      .then();
  }, [currentStory, user, storyUser.id]);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else if (onNextUser) {
      onNextUser();
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onNextUser, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else if (onPrevUser) {
      onPrevUser();
    }
  }, [currentIndex, onPrevUser]);

  // Auto-progress timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (STORY_DURATION / 100));
        if (newProgress >= 100) {
          goToNext();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, onClose]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Navigation arrows */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
        disabled={currentIndex === 0 && !onPrevUser}
      >
        <ChevronLeft className="w-8 h-8" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
      >
        <ChevronRight className="w-8 h-8" />
      </Button>

      {/* Story content */}
      <div
        className="relative w-full max-w-md h-full max-h-[90vh] rounded-xl overflow-hidden"
        style={{
          backgroundColor: currentStory.background_color || "#1a1a2e",
        }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentIndex
                      ? "100%"
                      : index === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 p-4">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={storyUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {storyUser.display_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-white font-semibold">
              {storyUser.display_name || storyUser.username}
            </p>
            <p className="text-white/70 text-sm">
              {formatDistanceToNow(new Date(currentStory.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          </div>
        </div>

        {/* Story media */}
        {currentStory.image_url ? (
          <img
            src={currentStory.image_url}
            alt="Story"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8">
            <p className="text-white text-2xl text-center font-medium">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Touch areas for navigation */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full" onClick={goToPrev} />
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full" onClick={goToNext} />
        </div>
      </div>
    </div>
  );
}
