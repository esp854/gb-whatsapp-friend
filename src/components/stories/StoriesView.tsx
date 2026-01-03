import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CreateStoryDialog } from "./CreateStoryDialog";
import { StoryViewer } from "./StoryViewer";

interface Story {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  background_color: string | null;
  expires_at: string;
  created_at: string;
  user?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface GroupedStories {
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  stories: Story[];
  hasViewed: boolean;
}

export function StoriesView() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [groupedStories, setGroupedStories] = useState<GroupedStories[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingStories, setViewingStories] = useState<{
    stories: Story[];
    user: GroupedStories["user"];
    index: number;
  } | null>(null);

  const fetchStories = async () => {
    if (!user) return;

    // Fetch all active stories
    const { data: stories } = await supabase
      .from("stories")
      .select(`
        *,
        user:profiles!stories_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (stories) {
      // Separate my stories
      const mine = stories.filter((s) => s.user_id === user.id);
      setMyStories(mine);

      // Group other stories by user
      const othersStories = stories.filter((s) => s.user_id !== user.id);
      const grouped: Record<string, GroupedStories> = {};

      othersStories.forEach((story) => {
        if (story.user) {
          if (!grouped[story.user_id]) {
            grouped[story.user_id] = {
              user: story.user,
              stories: [],
              hasViewed: false,
            };
          }
          grouped[story.user_id].stories.push(story);
        }
      });

      // Check which stories the user has viewed
      const storyIds = othersStories.map((s) => s.id);
      if (storyIds.length > 0) {
        const { data: views } = await supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", user.id)
          .in("story_id", storyIds);

        const viewedIds = new Set(views?.map((v) => v.story_id) || []);
        Object.values(grouped).forEach((g) => {
          g.hasViewed = g.stories.every((s) => viewedIds.has(s.id));
        });
      }

      // Sort: unviewed first
      const sortedGroups = Object.values(grouped).sort((a, b) => {
        if (a.hasViewed === b.hasViewed) return 0;
        return a.hasViewed ? 1 : -1;
      });

      setGroupedStories(sortedGroups);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStories();
  }, [user]);

  const handleViewMyStories = () => {
    if (myStories.length > 0 && profile) {
      setViewingStories({
        stories: myStories,
        user: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
        index: 0,
      });
    } else {
      setShowCreateDialog(true);
    }
  };

  const handleViewUserStories = (group: GroupedStories, index: number) => {
    setViewingStories({
      stories: group.stories,
      user: group.user,
      index,
    });
  };

  const handleNextUser = () => {
    if (!viewingStories) return;
    
    const currentUserIndex = groupedStories.findIndex(
      (g) => g.user.id === viewingStories.user.id
    );
    
    if (currentUserIndex < groupedStories.length - 1) {
      const nextGroup = groupedStories[currentUserIndex + 1];
      setViewingStories({
        stories: nextGroup.stories,
        user: nextGroup.user,
        index: 0,
      });
    } else {
      setViewingStories(null);
    }
  };

  const handlePrevUser = () => {
    if (!viewingStories) return;
    
    const currentUserIndex = groupedStories.findIndex(
      (g) => g.user.id === viewingStories.user.id
    );
    
    if (currentUserIndex > 0) {
      const prevGroup = groupedStories[currentUserIndex - 1];
      setViewingStories({
        stories: prevGroup.stories,
        user: prevGroup.user,
        index: 0,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Statuts</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* My Status */}
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Mon statut
          </h2>
          <button 
            onClick={handleViewMyStories}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <div className="relative">
              <div
                className={`p-0.5 rounded-full ${
                  myStories.length > 0
                    ? "bg-gradient-to-br from-primary to-primary/60"
                    : ""
                }`}
              >
                <Avatar className={`w-14 h-14 ${myStories.length > 0 ? "border-2 border-background" : ""}`}>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.display_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
              {myStories.length === 0 && (
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Mon statut</p>
              <p className="text-sm text-muted-foreground">
                {myStories.length > 0
                  ? `${myStories.length} mise(s) à jour`
                  : "Appuyez pour ajouter un statut"}
              </p>
            </div>
          </button>
          
          {/* Add story button if already has stories */}
          {myStories.length > 0 && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full flex items-center gap-3 p-2 mt-2 rounded-lg hover:bg-accent transition-colors text-primary"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium">Ajouter un statut</span>
            </button>
          )}
        </div>

        {/* Recent Updates */}
        <div className="p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
            Mises à jour récentes
          </h2>

          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Chargement...
            </div>
          ) : groupedStories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Aucun statut récent</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedStories.map((group, index) => (
                <button
                  key={group.user.id}
                  onClick={() => handleViewUserStories(group, index)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className={`p-0.5 rounded-full ${
                      group.hasViewed
                        ? "bg-muted"
                        : "bg-gradient-to-br from-primary to-primary/60"
                    }`}
                  >
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={group.user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {group.user.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">
                      {group.user.display_name || group.user.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(group.stories[0].created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Story Dialog */}
      <CreateStoryDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={fetchStories}
      />

      {/* Story Viewer */}
      {viewingStories && (
        <StoryViewer
          stories={viewingStories.stories}
          user={viewingStories.user}
          initialIndex={0}
          onClose={() => {
            setViewingStories(null);
            fetchStories(); // Refresh to update viewed status
          }}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
        />
      )}
    </div>
  );
}
