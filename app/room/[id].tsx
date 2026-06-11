import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import UserCard from '@/components/UserCard';
import {
  getActiveEventRoom,
  heartbeatEventRoom,
  joinEventRoom,
  leaveEventRoom,
  listEventRoomMembers,
} from '@/services/eventRooms';
import type { INearbyProfile } from '@/services/users';
import { goBackOrReplace } from '@/utils/navigation';
import {
  getProfileGridCardSize,
  PROFILE_GRID_COLUMNS,
  PROFILE_GRID_GAP,
  PROFILE_GRID_PADDING,
} from '@/utils/profileGrid';

const HEARTBEAT_MS = 4 * 60 * 1000;

export default function EventRoomScreen() {
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const roomId = Array.isArray(id) ? id[0] : id;
  const roomName = Array.isArray(name) ? name[0] : name;
  const { width: screenWidth } = useWindowDimensions();
  const { cardWidth, cardHeight } = getProfileGridCardSize(screenWidth);

  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [members, setMembers] = useState<INearbyProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMembers = useCallback(async () => {
    if (!roomId) {
      return;
    }

    setError(null);
    const response = await listEventRoomMembers(roomId);

    if (response.success) {
      setJoined(true);
      setMembers(response.data ?? []);
      return;
    }

    const message = response.message ?? 'Could not load room members.';
    if (message.toLowerCase().includes('join this room')) {
      setJoined(false);
      setMembers([]);
      return;
    }

    setError(message);
    setMembers([]);
  }, [roomId]);

  const initializeRoom = useCallback(async () => {
    if (!roomId) {
      return;
    }

    setLoading(true);
    setError(null);

    const status = await getActiveEventRoom(roomId);

    if (!status.success || !status.data) {
      setJoined(false);
      setMembers([]);
      setError(status.message ?? 'This room is no longer active.');
      setLoading(false);
      return;
    }

    if (!status.data.is_joined) {
      setJoined(false);
      setMembers([]);
      setLoading(false);
      return;
    }

    const joinResponse = await joinEventRoom(roomId);
    if (!joinResponse.success) {
      setJoined(false);
      setMembers([]);
      setError(joinResponse.message ?? 'Could not refresh room presence.');
      setLoading(false);
      return;
    }

    await loadMembers();
    setLoading(false);
  }, [loadMembers, roomId]);

  useFocusEffect(
    useCallback(() => {
      void initializeRoom();
    }, [initializeRoom]),
  );

  useEffect(() => {
    if (!joined || !roomId) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const sendHeartbeat = () => {
      void heartbeatEventRoom(roomId);
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [joined, roomId]);

  const handleJoin = async () => {
    if (!roomId) {
      return;
    }

    setJoining(true);
    setError(null);

    const response = await joinEventRoom(roomId);

    if (!response.success) {
      setJoining(false);
      Alert.alert('Could not join room', response.message ?? 'Please try again.');
      return;
    }

    await loadMembers();
    setJoining(false);
  };

  const handleLeave = () => {
    if (!roomId) {
      return;
    }

    Alert.alert(
      'Leave room?',
      'You will no longer appear in this event room.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            const response = await leaveEventRoom(roomId);
            setLeaving(false);

            if (!response.success) {
              Alert.alert(
                'Could not leave room',
                response.message ?? 'Please try again.',
              );
              return;
            }

            setJoined(false);
            setMembers([]);
          },
        },
      ],
    );
  };

  const renderMember = ({ item }: { item: INearbyProfile }) => (
    <UserCard
      width={cardWidth}
      height={cardHeight}
      user={{
        id: item.id,
        profilePicture:
          item.profile_picture_url ||
          'https://via.placeholder.com/300x300?text=User',
        isOnline: item.is_online === true,
        showOnlineStatus: item.show_online_status !== false,
        showLocation: false,
        distance: null,
        username: item.display_name || item.username || 'Unknown',
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => goBackOrReplace('/(tabs)/rooms')}
          >
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {roomName ?? 'Event room'}
            </Text>
            {joined ? (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {members.length} {members.length === 1 ? 'person' : 'people'} here
              </Text>
            ) : null}
          </View>

          {joined ? (
            <Pressable
              onPress={handleLeave}
              disabled={leaving}
              style={[styles.leaveButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                {leaving ? '...' : 'Leave'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : joined ? (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            numColumns={PROFILE_GRID_COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {error ?? 'No one else is in the room right now. Check back soon.'}
                </Text>
              </View>
            }
          />
        ) : (
          <View style={styles.joinContainer}>
            <Text style={[styles.joinTitle, { color: colors.text }]}>
              Join this room
            </Text>
            <Text style={[styles.joinBody, { color: colors.textSecondary }]}>
              Opt in to appear in the room and see other members who are here for
              the event.
            </Text>
            <Pressable
              onPress={handleJoin}
              disabled={joining}
              style={[styles.joinButton, { backgroundColor: colors.primary }]}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinButtonText}>Join room</Text>
              )}
            </Pressable>
            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  leaveButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  leaveButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  list: {
    paddingHorizontal: PROFILE_GRID_PADDING,
    paddingBottom: PROFILE_GRID_PADDING,
  },
  row: {
    gap: PROFILE_GRID_GAP,
    marginBottom: PROFILE_GRID_GAP,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  joinTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  joinBody: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  joinButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
