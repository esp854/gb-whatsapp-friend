import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members?: ConversationMember[];
  last_message?: Message | null;
  other_user?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean | null;
  } | null;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get all conversation IDs the user is part of
    const { data: memberData } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberData || memberData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = memberData.map((m) => m.conversation_id);

    // Fetch conversations with members
    const { data: convData } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (!convData) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch members for each conversation
    const { data: allMembers } = await supabase
      .from("conversation_members")
      .select(`
        *,
        profile:profiles(id, username, display_name, avatar_url, is_online)
      `)
      .in("conversation_id", conversationIds);

    // Fetch last message for each conversation
    const conversationsWithDetails = await Promise.all(
      convData.map(async (conv) => {
        const members = allMembers?.filter((m) => m.conversation_id === conv.id) || [];
        
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // For non-group conversations, find the other user
        let other_user = null;
        if (!conv.is_group && members.length > 0) {
          const otherMember = members.find((m) => m.user_id !== user.id);
          if (otherMember?.profile) {
            other_user = otherMember.profile;
          }
        }

        return {
          ...conv,
          members: members.map((m) => ({
            ...m,
            profile: m.profile,
          })),
          last_message: lastMsg,
          other_user,
        } as Conversation;
      })
    );

    setConversations(conversationsWithDetails);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createConversation = async (memberIds: string[], isGroup = false, name?: string) => {
    if (!user) return { error: new Error("Not authenticated"), data: null };

    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        is_group: isGroup,
        name: isGroup ? name : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conv) return { error: convError, data: null };

    // Add members
    const allMemberIds = [...new Set([user.id, ...memberIds])];
    const members = allMemberIds.map((id) => ({
      conversation_id: conv.id,
      user_id: id,
      is_admin: id === user.id,
    }));

    const { error: membersError } = await supabase
      .from("conversation_members")
      .insert(members);

    if (membersError) return { error: membersError, data: null };

    await fetchConversations();
    return { error: null, data: conv };
  };

  return { conversations, loading, createConversation, refetch: fetchConversations };
}
