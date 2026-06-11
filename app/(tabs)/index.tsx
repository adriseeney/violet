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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import UserCard from '@/components/UserCard';
import { SearchBar } from '@/components/SearchBar';
import { FilterButton } from '@/components/FilterButton';
import { User } from '@/types/user';
import { useLocationContext } from '@/contexts/location-context';
import {
  getCurrentUserProfile,
  getNearbyProfiles,
  INearbyProfile,
  updateCurrentUserLocation,
} from '@/services/users';

const GRID_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const CARD_FOOTER_HEIGHT = 44;
const PROFILE_AVATAR_SIZE = 40;
const PROFILE_PLACEHOLDER =
  'https://via.placeholder.com/300x300?text=You';

export default function BrowseScreen() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor(
    (screenWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );
  const cardHeight = cardWidth + CARD_FOOTER_HEIGHT;
  const {
    coords,
    isLoading: locationLoading,
    permissionStatus,
    error: locationError,
    refreshLocation,
  } = useLocationContext();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const loadViewerProfile = useCallback(async () => {
    const row = await getCurrentUserProfile();
    const url = (row?.profile_picture_url as string | null | undefined)?.trim();
    setProfilePictureUrl(url || null);
  }, []);

  const mapNearbyToUser = (profile: INearbyProfile): User => ({
    id: profile.id,
    name: profile.display_name || profile.username || 'Unknown',
    display_name: profile.display_name || profile.username || 'Unknown',
    email: '',
    age: profile.age ?? 0,
    gender: profile.gender_identity ?? profile.gender ?? '',
    distance: profile.distance_miles ?? 0,
    bio: profile.bio ?? '',
    profilePicture: profile.profile_picture_url || 'https://via.placeholder.com/300x300?text=User',
    isOnline: profile.is_online === true,
    showLocation: profile.show_location !== false,
    showOnlineStatus: profile.show_online_status !== false,
  });

  const loadNearbyUsers = useCallback(async () => {
    if (!coords) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setBrowseError(null);

    try {
      const locationResponse = await updateCurrentUserLocation(
        coords.latitude,
        coords.longitude,
      );

      if (!locationResponse.success) {
        console.warn(
          '[browse] updateCurrentUserLocation failed:',
          locationResponse.message,
        );
      }

      const response = await getNearbyProfiles(coords.latitude, coords.longitude);

      if (response.success) {
        setUsers(response.data.map(mapNearbyToUser));
        if (response.data.length === 0) {
          console.info(
            '[browse] nearby_profiles returned 0 users. Viewer coords:',
            coords.latitude,
            coords.longitude,
          );
        }
      } else {
        console.error('[browse] getNearbyProfiles failed:', response.message);
        setUsers([]);
        setBrowseError(response.message ?? 'Could not load nearby profiles.');
      }
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useFocusEffect(
    useCallback(() => {
      void loadViewerProfile();

      if (permissionStatus === 'granted' && coords) {
        void loadNearbyUsers();
      }
    }, [
      permissionStatus,
      coords?.latitude,
      coords?.longitude,
      loadNearbyUsers,
      loadViewerProfile,
    ]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([refreshLocation(), loadViewerProfile()]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <UserCard
      width={cardWidth}
      height={cardHeight}
      user={{
        id: item.id,
        profilePicture: item.profilePicture || 'https://via.placeholder.com/300x300?text=User',
        isOnline: item.isOnline,
        showOnlineStatus: item.showOnlineStatus,
        showLocation: item.showLocation,
        distance: item.distance,
        username: item.display_name || item.name || 'Unknown',
      }}
    />
  );

  if (locationLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.messageText, { color: colors.text, marginTop: 12 }]}>
          Finding women near you...
        </Text>
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>
          Turn on location to browse nearby users
        </Text>
        <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
          Violet uses your location to show women near you.
        </Text>

        <Pressable
          onPress={refreshLocation}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Enable Location</Text>
        </Pressable>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>
          We couldn’t get your location
        </Text>
        <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
          {locationError}
        </Text>

        <Pressable
          onPress={refreshLocation}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={({ pressed }) => [
              styles.profileAvatarButton,
              { borderColor: colors.primary },
              pressed && styles.profileAvatarPressed,
            ]}
            accessibilityLabel="Your profile"
          >
            <Image
              source={{ uri: profilePictureUrl ?? PROFILE_PLACEHOLDER }}
              style={styles.profileAvatar}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Browse</Text>
            {coords ? (
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                Near {coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)}
              </Text>
            ) : null}
          </View>

          <FilterButton onPress={() => router.push('/preferences/filtering')} />
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or bio"
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery.trim() !== ''
                    ? 'No users match your search'
                    : browseError ?? 'No users found nearby'}
                </Text>
                {!browseError && coords ? (
                  <Text
                    style={[
                      styles.emptyHint,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Other profiles need latitude/longitude, is_discoverable =
                    true, and a user_preferences row within your distance and
                    filter settings (see Settings → Dating preferences).
                  </Text>
                ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  profileAvatarButton: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
    borderRadius: PROFILE_AVATAR_SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
  },
  profileAvatarPressed: {
    opacity: 0.85,
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: GRID_PADDING,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBody: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});