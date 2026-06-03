import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { useChats } from '@/hooks/useChats';
import { Chat } from '@/types/chat';
import { ChatListItem } from '@/components/ChatListItem';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { chats, loading, error } = useChats();
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  
  // Update filtered chats when search query or chats change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => 
        chat.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [chats, searchQuery]);

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
        </View>
        
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations"
        />

        {error ? (
          <Text style={[styles.errorBanner, { color: colors.textSecondary }]}>{error}</Text>
        ) : null}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading conversations...
            </Text>
          </View>
        ) : filteredChats.length > 0 ? (
          <FlatList
            data={filteredChats}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleChatPress(item.id)}>
                <ChatListItem chat={item} />
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim() !== '' 
                ? 'No conversations found matching your search'
                : 'No conversations yet. Start chatting!'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  errorBanner: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chatList: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 24,
  }
});