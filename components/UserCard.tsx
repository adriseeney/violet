import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Pressable, Alert, ActivityIndicator } from 'react-native';
import { MoreVertical, MessageCircle, Star, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { formatDistanceMiles } from '@/utils/formatDistance';
import { getOrCreateDm } from '@/services/chat';

interface UserCardProps {
  user: {
    id: string;
    profilePicture: string;
    isOnline: boolean;
    distance: number;
    username: string;
  };
  onPress?: () => void;
}

export default function UserCard({ user, onPress }: UserCardProps) {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/profile/[id]',
        params: { id: user.id, distance: String(user.distance) },
      });
    }
  };

  const handleMessage = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setOpeningChat(true);

    try {
      const res = await getOrCreateDm(user.id);

      if (res.success && res.conversationId) {
        router.push(`/chat/${res.conversationId}`);
        return;
      }

      Alert.alert(
        'Chat unavailable',
        res.message ?? 'Could not start a conversation with this user.',
      );
    } finally {
      setOpeningChat(false);
    }
  };

  const handleOptionsPress = (e: any) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  const handleFavorite = (e: any) => {
    e.stopPropagation();
    setShowActions(false);
    Alert.alert("Added to Favorites");
  };

  const handleBlock = (e: any) => {
    e.stopPropagation();
    setShowActions(false);
    Alert.alert("User Blocked");
  };

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.cardBackground },
        isPressed && styles.cardPressed
      ]}
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      {/* IMAGE */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: user.profilePicture }}
          style={styles.image}
        />

        {/* TOP RIGHT MENU */}
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={handleOptionsPress}
        >
          <MoreVertical size={16} color="#fff" />
        </TouchableOpacity>

        {/* MESSAGE BUTTON */}
        <TouchableOpacity
          style={[styles.messageButton, { backgroundColor: colors.primary }]}
          onPress={handleMessage}
          disabled={openingChat}
        >
          {openingChat ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MessageCircle size={14} color="#fff" />
          )}
        </TouchableOpacity>

        {/* ONLINE DOT */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.dot,
              { backgroundColor: user.isOnline ? 'green' : 'gray' }
            ]}
          />
        </View>

        {/* ACTION MENU */}
        {showActions && (
          <View
            style={[
              styles.actionsMenu,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={handleFavorite} style={styles.actionItem}>
              <Star size={14} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Favorite</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBlock} style={styles.actionItem}>
              <X size={14} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Block</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* FOOTER*/}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Text style={[styles.name, { color: colors.text }]}>
          {user.username}
        </Text>

        <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
          {formatDistanceMiles(user.distance)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120, // ← your compact grid style
  },

  optionsButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  messageButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  footer: {
    padding: 6,
  },

  name: {
    fontSize: 14,
    fontWeight: '600',
  },

  distanceText: {
    fontSize: 12,
  },

  actionsMenu: {
    position: 'absolute',
    top: 30,
    right: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    elevation: 5,
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },

  actionText: {
    marginLeft: 6,
    fontSize: 12,
  },
});