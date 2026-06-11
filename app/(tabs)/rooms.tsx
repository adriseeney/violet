import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Sparkles, Users, ChevronRight } from 'lucide-react-native';
import {
  listActiveEventRooms,
  type IEventRoom,
} from '@/services/eventRooms';

export default function RoomsScreen() {
  const { colors } = useTheme();
  const [rooms, setRooms] = useState<IEventRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setError(null);

    const response = await listActiveEventRooms();

    if (response.success && response.data) {
      setRooms(response.data);
    } else {
      setRooms([]);
      setError(response.message ?? 'Could not load event rooms.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadRooms().finally(() => setLoading(false));
    }, [loadRooms]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const renderRoom = ({ item }: { item: IEventRoom }) => (
    <Pressable
      style={[styles.roomCard, { backgroundColor: colors.cardBackground }]}
      onPress={() =>
        router.push({
          pathname: '/room/[id]',
          params: { id: item.id, name: item.name },
        })
      }
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.roomImage} />
      ) : (
        <View
          style={[
            styles.roomImagePlaceholder,
            { backgroundColor: colors.backgroundMuted },
          ]}
        >
          <Sparkles size={28} color={colors.primary} />
        </View>
      )}

      <View style={styles.roomContent}>
        <View style={styles.roomHeader}>
          <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        {item.city ? (
          <Text style={[styles.roomCity, { color: colors.textSecondary }]}>
            {item.city}
          </Text>
        ) : null}

        {item.description ? (
          <Text
            style={[styles.roomDescription, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        <View style={styles.roomMeta}>
          <Users size={14} color={colors.primary} />
          <Text style={[styles.roomMetaText, { color: colors.textSecondary }]}>
            {item.member_count} here now
          </Text>
          {item.is_joined ? (
            <View
              style={[
                styles.joinedBadge,
                { backgroundColor: colors.primaryTransparent },
              ]}
            >
              <Text style={[styles.joinedBadgeText, { color: colors.primary }]}>
                Joined
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Rooms</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join event rooms to see who&apos;s here
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            renderItem={renderRoom}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Sparkles size={32} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No active rooms
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  {error ??
                    'Check back during Pride and other events. Rooms appear when they are activated in Supabase.'}
                </Text>
              </View>
            }
          />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  roomCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  roomImage: {
    width: '100%',
    height: 140,
  },
  roomImagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomContent: {
    padding: 16,
    gap: 6,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomName: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  roomCity: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  roomDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roomMetaText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  joinedBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  joinedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
