import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { listConversationSummaries } from '@/services/chat';
import type { Chat } from '@/types/chat';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listConversationSummaries();
    if (res.success) {
      setChats(res.data);
    } else {
      setChats([]);
      setError(res.message ?? 'Could not load conversations.');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { chats, loading, error, refresh };
}
