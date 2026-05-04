import { useCallback, useEffect, useState } from 'react';
import { supabaseConfig } from '@/config/supabase-config';
import {
  fetchConversationMeta,
  fetchMessages,
  sendChatMessage,
  markConversationRead,
} from '@/services/chat';
import type { Chat } from '@/types/chat';
import type { Message } from '@/types/message';

function rowToMessage(row: {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}): Message {
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

export function useChatMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const convId = conversationId ?? '';

  const mergeMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, []);

  const load = useCallback(async () => {
    if (!convId) {
      setChat(null);
      setMessages([]);
      setThreadError('No conversation selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setThreadError(null);
    const meta = await fetchConversationMeta(convId);
    if (meta.success && meta.chat) {
      setChat(meta.chat);
      setThreadError(null);
    } else {
      setChat(null);
      setThreadError(meta.message ?? 'Could not open this conversation.');
    }

    const msgRes = await fetchMessages(convId);
    if (msgRes.success) {
      setMessages(msgRes.data);
    } else {
      setMessages([]);
      if (meta.success) {
        setThreadError(msgRes.message ?? null);
      }
    }

    if (meta.success) {
      await markConversationRead(convId);
    }
    setLoading(false);
  }, [convId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabaseConfig.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabaseConfig.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!convId) return;

    const channel = supabaseConfig
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
            read_at: string | null;
          };
          mergeMessage(rowToMessage(row));
        }
      )
      .subscribe();

    return () => {
      supabaseConfig.removeChannel(channel);
    };
  }, [convId, mergeMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!convId) return null;
      const res = await sendChatMessage(convId, text);
      if (!res.success || !res.data) {
        return null;
      }
      mergeMessage(res.data);
      return res.data;
    },
    [convId, mergeMessage]
  );

  return { messages, chat, loading, threadError, sendMessage, currentUserId, refresh: load };
}
