import { supabaseConfig } from '@/config/supabase-config';
import type { Chat } from '@/types/chat';
import type { Message } from '@/types/message';

export type ConversationSummaryRow = {
  conversation_id: string;
  other_user_id: string;
  display_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

function mapSummaryToChat(row: ConversationSummaryRow, currentUserId: string): Chat {
  return {
    id: row.conversation_id,
    participants: [currentUserId, row.other_user_id],
    lastMessage: row.last_message ?? '',
    lastMessageTime: row.last_message_at ?? new Date().toISOString(),
    unreadCount: Number(row.unread_count ?? 0),
    username: row.display_name || row.username || 'User',
    profileImage: row.profile_picture_url ?? undefined,
    isOnline: false,
    lastSeen: row.last_message_at ?? undefined,
  };
}

export async function listConversationSummaries(): Promise<{
  success: boolean;
  data: Chat[];
  message?: string;
}> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return { success: false, data: [], message: 'Not signed in.' };
    }

    const { data, error } = await supabaseConfig.rpc('list_conversation_summaries');

    if (error) {
      return { success: false, data: [], message: error.message };
    }

    const rows = (data ?? []) as ConversationSummaryRow[];
    const chats = rows.map((r) => mapSummaryToChat(r, session.user.id));
    return { success: true, data: chats };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load chats.';
    return { success: false, data: [], message };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrCreateDm(otherUserId: string): Promise<{
  success: boolean;
  conversationId?: string;
  message?: string;
}> {
  try {
    if (!UUID_RE.test(otherUserId.trim())) {
      return {
        success: false,
        message: 'Chat only works for real user IDs (e.g. from Browse). Mock profiles cannot open DMs.',
      };
    }

    const { data, error } = await supabaseConfig.rpc('get_or_create_dm', {
      other_user_id: otherUserId,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const conversationId =
      typeof data === 'string' && data.length > 0
        ? data
        : null;
    if (!conversationId) {
      return { success: false, message: 'No conversation id returned.' };
    }

    return { success: true, conversationId };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to open chat.';
    return { success: false, message };
  }
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function mapRowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.conversation_id,
    senderId: row.sender_id,
    content: row.body,
    timestamp: row.created_at,
    read: !!row.read_at,
    delivered: true,
  };
}

export async function fetchMessages(conversationId: string): Promise<{
  success: boolean;
  data: Message[];
  message?: string;
}> {
  try {
    const { data, error } = await supabaseConfig
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, data: [], message: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => mapRowToMessage(row as MessageRow)),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load messages.';
    return { success: false, data: [], message };
  }
}

export async function sendChatMessage(conversationId: string, body: string): Promise<{
  success: boolean;
  data?: Message;
  message?: string;
}> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return { success: false, message: 'Not signed in.' };
    }

    const trimmed = body.trim();
    if (!trimmed) {
      return { success: false, message: 'Message is empty.' };
    }

    const { data, error } = await supabaseConfig
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: trimmed,
      })
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .single();

    if (error || !data) {
      return { success: false, message: error?.message ?? 'Send failed.' };
    }

    return { success: true, data: mapRowToMessage(data as MessageRow) };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send.';
    return { success: false, message };
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  try {
    await supabaseConfig.rpc('mark_conversation_read', {
      p_conversation_id: conversationId,
    });
  } catch {
    // non-fatal
  }
}

export async function fetchConversationMeta(conversationId: string): Promise<{
  success: boolean;
  chat?: Chat;
  message?: string;
}> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return { success: false, message: 'Not signed in.' };
    }

    const { data: parts, error: pErr } = await supabaseConfig
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (pErr || !parts?.length) {
      return { success: false, message: pErr?.message ?? 'Conversation not found.' };
    }

    const otherId = parts.map((p) => p.user_id).find((id) => id !== session.user.id);
    if (!otherId) {
      return { success: false, message: 'Could not resolve other participant.' };
    }

    const { data: profile, error: profErr } = await supabaseConfig
      .from('user_profiles')
      .select('username, display_name, profile_picture_url')
      .eq('id', otherId)
      .maybeSingle();

    if (profErr) {
      return { success: false, message: profErr.message };
    }

    const chat: Chat = {
      id: conversationId,
      participants: [session.user.id, otherId],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      username: profile?.display_name || profile?.username || 'User',
      profileImage: profile?.profile_picture_url ?? undefined,
      isOnline: false,
    };

    return { success: true, chat };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load chat.';
    return { success: false, message };
  }
}
