
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Edit2, Plus, Trash2, Settings, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import IntimacyPreferences from '@/components/IntimacyPreferences';
import { useEffect, useState } from 'react';
import { getCurrentUserProfilePhotos, saveCurrentUserProfilePhotos } from '@/services/profilePhotos';
import { createUserProfile, getCurrentUserProfile, mapUserProfileRowToUser } from '@/services/users';
import type { User } from '@/types/user';

const PLACEHOLDER_PHOTO = 'https://via.placeholder.com/400x500?text=Add+photo';

function strField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function numberField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(Math.round(value));
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

function numberFieldWithConversion(
  row: Record<string, unknown>,
  primaryKey: string,
  fallbackKey: string,
  convertFallback: (value: number) => number,
): string {
  const primary = numberField(row, primaryKey);
  if (primary) return primary;

  const fallback = row[fallbackKey];
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return String(Math.round(convertFallback(fallback)));
  }

  return '';
}

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOfBirthFromAge(age: string): string | null {
  const parsedAge = parseOptionalInteger(age);
  if (!parsedAge || parsedAge < 0) return null;

  const birthYear = new Date().getFullYear() - parsedAge;
  return `${birthYear}-01-01`;
}

function splitLocation(value: string): {
  location_city: string | null;
  location_state: string | null;
} {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    location_city: parts[0] ?? null,
    location_state: parts.length > 1 ? parts.slice(1).join(', ') : null,
  };
}

function firstRealPhoto(photoList: string[]): string | undefined {
  return photoList.find((photo) => photo && photo !== PLACEHOLDER_PHOTO);
}

function realPhotos(photoList: string[]): string[] {
  return photoList.filter((photo) => photo && photo !== PLACEHOLDER_PHOTO);
}

function isRemotePhoto(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([PLACEHOLDER_PHOTO]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileInfo, setProfileInfo] = useState({
    name: '',
    age: '',
    bio: '',
    height: '',
    weight: '',
    ethnicity: '',
    location: '',
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await getCurrentUserProfile();
      if (cancelled) return;

      if (!row) {
        setProfileUser(null);
        setProfileLoading(false);
        return;
      }

      const r = row as Record<string, unknown>;
      const u = mapUserProfileRowToUser(r);
      setProfileUser(u);

      const pic = (r.profile_picture_url as string | null | undefined)?.trim();
      const photosResponse = await getCurrentUserProfilePhotos();
      const persistedPhotos =
        photosResponse.success && photosResponse.data.length > 0
          ? photosResponse.data.map((photo) => photo.url)
          : [];
      const photoList = persistedPhotos.length > 0
        ? persistedPhotos
        : pic && pic.length > 0
          ? [pic]
          : [PLACEHOLDER_PHOTO];
      setPhotos(photoList);
      setProfileImage(photoList[0]);

      setProfileInfo({
        name: u.username,
        age: u.age > 0 ? String(u.age) : '',
        bio: u.bio ?? '',
        height: numberFieldWithConversion(r, 'height_cm', 'height_in', (value) => value * 2.54),
        weight: numberFieldWithConversion(r, 'weight_kg', 'weight_lbs', (value) => value * 0.453592),
        ethnicity: strField(r, 'ethnicity'),
        location:
          u.location ??
          [r.location_city, r.location_state].filter(Boolean).join(', '),
      });

      setProfileLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (field: string, value: string) => {
    setProfileInfo((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant camera roll permissions to add photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;

      if (photos.length === 1 && photos[0] === PLACEHOLDER_PHOTO) {
        setProfileImage(imageUri);
        setPhotos([imageUri]);
        return;
      }

      setPhotos([...photos, imageUri]);
    }
  };

  const handleDeletePhoto = (index: number) => {
    // Don't allow deleting if it's the last photo
    if (photos.length <= 1) {
      Alert.alert("Cannot Delete", "You must have at least one profile photo.");
      return;
    }

    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            const nextProfilePhoto = firstRealPhoto(newPhotos) ?? null;
            setProfileImage(nextProfilePhoto);
            setPhotos(newPhotos);
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      const locationFields = splitLocation(profileInfo.location);
      const photoUris = realPhotos(photos);
      let savedPhotoUrls = photoUris;
      let profilePictureUrl = firstRealPhoto(savedPhotoUrls);
      let photoWarning: string | undefined;

      if (photoUris.length > 0) {
        const photosResponse = await saveCurrentUserProfilePhotos(photoUris);

        if (photosResponse.success) {
          savedPhotoUrls = photosResponse.data.map((photo) => photo.url);
          profilePictureUrl = firstRealPhoto(savedPhotoUrls);
          setPhotos(savedPhotoUrls.length > 0 ? savedPhotoUrls : [PLACEHOLDER_PHOTO]);
          setProfileImage(profilePictureUrl ?? null);
        } else {
          photoWarning =
            photosResponse.message ??
            'The profile details were saved, but the selected photos could not be uploaded.';
          profilePictureUrl =
            profileImage && profileImage !== PLACEHOLDER_PHOTO && isRemotePhoto(profileImage)
              ? profileImage
              : undefined;
        }
      }

      const response = await createUserProfile({
        display_name: profileInfo.name,
        bio: profileInfo.bio,
        date_of_birth: dateOfBirthFromAge(profileInfo.age),
        height_cm: parseOptionalInteger(profileInfo.height),
        weight_kg: parseOptionalInteger(profileInfo.weight),
        ethnicity: profileInfo.ethnicity,
        profile_picture_url: profilePictureUrl,
        ...locationFields,
      });

      if (!response.success) {
        Alert.alert("Error", response.message);
        return;
      }

      if (response.data) {
        const row = response.data as Record<string, unknown>;
        setProfileUser(mapUserProfileRowToUser(row));

        const savedPhoto = (row.profile_picture_url as string | null | undefined)?.trim();
        if (savedPhoto && savedPhotoUrls.length === 0) {
          setProfileImage(savedPhoto);
          setPhotos([savedPhoto]);
        }
      }

      setIsEditing(false);
      Alert.alert(
        photoWarning ? "Profile Details Saved" : "Success",
        photoWarning ?? "Your profile has been updated!",
      );
    } catch {
      Alert.alert("Error", "Error saving profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfileHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => router.push('/(tabs)/settings')}
      >
        <Settings size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderProfilePhotos = () => (
    <View style={styles.photosSection}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosContainer}
      >
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoWrapper}>
            <Image
              source={{ uri: photo }}
              style={styles.profilePhoto}
            />
            {isEditing && (
              <TouchableOpacity 
                style={[styles.deletePhotoButton, { backgroundColor: colors.primary }]}
                onPress={() => handleDeletePhoto(index)}
              >
                <Trash2 size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {isEditing && photos.length < 6 && (
          <TouchableOpacity 
            style={[styles.addPhotoButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
            onPress={handleAddPhoto}
          >
            <Plus size={32} color={colors.primary} />
            <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  const renderProfileInfo = () => (
    <View style={[styles.infoSection, { backgroundColor: colors.cardBackground }]}>
      {isEditing ? (
        <>
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={profileInfo.name}
              onChangeText={(text) => handleChange("name", text)}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Age</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={profileInfo.age}
              onChangeText={(text) => handleChange("age", text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="Your age"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.bioInput, { color: colors.text, borderColor: colors.border }]}
              value={profileInfo.bio}
              onChangeText={(text) => handleChange("bio", text)}
              placeholder="Write something about yourself"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>
          
          <View style={styles.fieldRow}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={profileInfo.height}
                onChangeText={(text) => handleChange("height", text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Height"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={[styles.fieldContainer, { flex: 1, marginLeft: 12 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                value={profileInfo.weight}
                onChangeText={(text) => handleChange("weight", text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="Weight"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ethnicity</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={profileInfo.ethnicity}
              onChangeText={(text) => handleChange("ethnicity", text)}
              placeholder="Your ethnicity"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
              value={profileInfo.location}
              onChangeText={(text) => handleChange("location", text)}
              placeholder="Your location"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.profileHeader}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profileInfo.name}, {profileInfo.age}
            </Text>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsEditing(true)}
            >
              <Edit2 size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.profileBio, { color: colors.textSecondary }]}>
            {profileInfo.bio}
          </Text>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Height</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{profileInfo.height} cm</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Weight</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{profileInfo.weight} kg</Text>
            </View>
            <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Ethnicity</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{profileInfo.ethnicity}</Text>
            </View>
          </View>
          
          <View style={styles.locationContainer}>
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              📍 {profileInfo.location}
            </Text>
          </View>
        </>
      )}
    </View>
  );

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
        <SafeAreaView style={[styles.safeArea, styles.loadingSafe]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </View>
    );
  }

  const intimacyUser: User | null = profileUser
    ? {
        ...profileUser,
        profilePicture:
          photos[0] && photos[0] !== PLACEHOLDER_PHOTO
            ? photos[0]
            : profileUser.profilePicture,
        sexualPreference: profileUser.sexualPreference ?? 'Everyone',
        sexualRole: profileUser.sexualRole ?? 'Not specified',
        sexualPosition: profileUser.sexualPosition ?? 'Both',
        intimacyPreferences: profileUser.intimacyPreferences ?? [],
        sexStyle: profileUser.sexStyle ?? 'Moderate',
        hivStatus: profileUser.hivStatus ?? 'Prefer not to say',
        safetyPractices: profileUser.safetyPractices ?? '',
        showPreferencesPublicly: profileUser.showPreferencesPublicly ?? true,
      }
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {renderProfileHeader()}
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProfilePhotos()}
          {renderProfileInfo()}
          
          {!isEditing && intimacyUser && (
            <View style={styles.preferencesSection}>
              <IntimacyPreferences user={intimacyUser} showFull={true} />
            </View>
          )}
          
          {isEditing && (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check size={20} color="#FFFFFF" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          <View style={styles.spacer} />
        </ScrollView>
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
  loadingSafe: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  photosSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  photosContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  photoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 200,
    height: 250,
    borderRadius: 12,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: 160,
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginTop: 8,
  },
  infoSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
    lineHeight: 24,
  },
  profileDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  detailDivider: {
    width: 1,
    height: 24,
  },
  locationContainer: {
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  fieldInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  bioInput: {
    height: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  spacer: {
    height: 50,
  },
  preferencesSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
});