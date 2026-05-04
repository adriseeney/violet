import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send, Paperclip } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useChatMessages } from '@/hooks/useChatMessages';
import { Message } from '@/types/message';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const chatId = Array.isArray(id) ? id[0] : id;

  const { messages, chat, loading, threadError, sendMessage, currentUserId } = useChatMessages(chatId);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    await sendMessage(inputText.trim());
    setInputText('');
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert('You need to grant camera roll permissions to send images.');
      return;
    }

    setIsLoading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    setIsLoading(false);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await sendMessage('[Image sent]');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = currentUserId != null && item.senderId === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.theirMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMe ? colors.primary : colors.cardBackground,
              borderBottomLeftRadius: isMe ? 16 : 4,
              borderBottomRightRadius: isMe ? 4 : 16,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text }]}>
            {item.content}
          </Text>

          <Text
            style={[
              styles.messageTimestamp,
              { color: isMe ? 'rgba(255, 255, 255, 0.7)' : colors.textSecondary },
            ]}
          >
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading conversation...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (threadError || !chat) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text, textAlign: 'center' }]}>
              {threadError ?? 'Conversation unavailable.'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {chat.username || 'Chat'}
            </Text>
            <Text style={[styles.userStatus, { color: colors.textSecondary }]}>Message</Text>
          </View>

          <TouchableOpacity style={styles.avatarContainer}>
            <Image
              source={{
                uri: chat.profileImage || 'https://via.placeholder.com/80?text=User',
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator
          />

          <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Paperclip size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.sendButton} />
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={handleSend}
                disabled={inputText.trim() === ''}
              >
                <Send size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  userStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  messageTimestamp: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    position: 'absolute',
    right: 8,
    bottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  attachButton: {
    marginRight: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
});
