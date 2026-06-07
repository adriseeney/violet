
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Edit2, Plus, Trash2, Settings, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { PreferencePicker, MultiPreferencePicker } from '@/components/PreferencePicker';
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUserProfilePhotos, saveCurrentUserProfilePhotos } from '@/services/profilePhotos';
import {
  applyPreferencesRowToUser,
  createUserPreferences,
  createUserProfile,
  getCurrentUserPreferences,
  getCurrentUserProfile,
  mapUserProfileRowToUser,
} from '@/services/users';
import type { User } from '@/types/user';
import { useAuthStore } from '@/src/store/useAuthStore';
import {
  BODY_TYPE_OPTIONS,
  HEIGHT_OPTIONS,
  IDENTITY_TAG_OPTIONS,
  INTIMACY_ROLE_OPTIONS,
  RELATIONAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
  type HeightString,
} from '@/types/preferences';
const PLACEHOLDER_PHOTO = '@/assets/images/violet_user_placeholder.png';

function formatTypeLabel(value: string): string {
  if (value === 'prefer not to say') return 'Prefer not to say';
  return value
    .split('/')
    .map((part) => part.trim())
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function parseFeetInchesToCm(height: string): number | null {
  const match = height.trim().match(/^(\d)'(\d{1,2})$/);
  if (!match) return null;

  const feet = Number.parseInt(match[1], 10);
  const inches = Number.parseInt(match[2], 10);
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches >= 12) {
    return null;
  }

  return Math.round((feet * 12 + inches) * 2.54);
}

function cmToHeightString(cm: number): HeightString | '' {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const candidate = `${feet}'${inches}` as HeightString;
  return HEIGHT_OPTIONS.some((option) => option.height === candidate)
    ? candidate
    : '';
}

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

type ProfileInfoState = {
  name: string;
  age: string;
  bio: string;
  height: string;
  bodyType: string;
  ethnicity: string;
  location: string;
  intimacyRole: string;
  presentationTags: string[];
  relationshipFramework: string;
  relationalRelationship: string;
};

const EMPTY_PROFILE_INFO: ProfileInfoState = {
  name: '',
  age: '',
  bio: '',
  height: '',
  bodyType: '',
  ethnicity: '',
  location: '',
  intimacyRole: '',
  presentationTags: [],
  relationshipFramework: '',
  relationalRelationship: '',
};

function readHeightCm(row: Record<string, unknown>): number | null {
  const value = row.height_cm;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

function buildProfileInfo(
  profileRow: Record<string, unknown>,
  user: User,
): ProfileInfoState {
  const heightCm = readHeightCm(profileRow);
  const ageFromDob = computeAgeFromRow(profileRow);

  return {
    name:
      strField(profileRow, 'display_name') ||
      user.display_name ||
      user.name ||
      '',
    age: ageFromDob > 0 ? String(ageFromDob) : user.age > 0 ? String(user.age) : '',
    bio: strField(profileRow, 'bio') || user.bio || '',
    height:
      heightCm != null
        ? cmToHeightString(heightCm) || `${heightCm} cm`
        : strField(profileRow, 'height'),
    bodyType:
      strField(profileRow, 'body_type', 'bodyType') || user.bodyType || '',
    ethnicity: strField(profileRow, 'ethnicity') || user.ethnicity || '',
    location:
      [user.locationCity, user.locationState].filter(Boolean).join(', ') ||
      [profileRow.location_city, profileRow.location_state]
        .filter(Boolean)
        .join(', '),
    intimacyRole: user.intimacyRole ?? '',
    presentationTags: user.presentationTags ?? [],
    relationshipFramework: user.relationshipFramework ?? '',
    relationalRelationship: user.relationalRelationship ?? '',
  };
}

function computeAgeFromRow(row: Record<string, unknown>): number {
  const dob = row.date_of_birth;
  if (typeof dob !== 'string' || !dob.trim()) return 0;

  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

/** Prefer freshly loaded DB values, fall back to what the user just edited. */
function mergeProfileInfoState(
  draft: ProfileInfoState,
  loaded: ProfileInfoState,
): ProfileInfoState {
  return {
    name: loaded.name || draft.name,
    age: loaded.age || draft.age,
    bio: loaded.bio || draft.bio,
    height: loaded.height || draft.height,
    bodyType: loaded.bodyType || draft.bodyType,
    ethnicity: loaded.ethnicity || draft.ethnicity,
    location: loaded.location || draft.location,
    intimacyRole: loaded.intimacyRole || draft.intimacyRole,
    presentationTags:
      loaded.presentationTags.length > 0
        ? loaded.presentationTags
        : draft.presentationTags,
    relationshipFramework:
      loaded.relationshipFramework || draft.relationshipFramework,
    relationalRelationship:
      loaded.relationalRelationship || draft.relationalRelationship,
  };
}

function viewProfileFromState(
  profileInfo: ProfileInfoState,
  profileUser: User | null,
): ProfileInfoState {
  const heightFromUserCm =
    profileUser?.height != null && Number.isFinite(profileUser.height)
      ? cmToHeightString(profileUser.height) || `${profileUser.height} cm`
      : '';

  return {
    name:
      profileInfo.name ||
      profileUser?.display_name ||
      profileUser?.name ||
      '',
    age:
      profileInfo.age ||
      (profileUser?.age && profileUser.age > 0 ? String(profileUser.age) : ''),
    bio: profileInfo.bio || profileUser?.bio || '',
    height: profileInfo.height || heightFromUserCm,
    bodyType: profileInfo.bodyType || profileUser?.bodyType || '',
    ethnicity: profileInfo.ethnicity || profileUser?.ethnicity || '',
    location:
      profileInfo.location ||
      [profileUser?.locationCity, profileUser?.locationState]
        .filter(Boolean)
        .join(', '),
    intimacyRole: profileInfo.intimacyRole || profileUser?.intimacyRole || '',
    presentationTags:
      profileInfo.presentationTags.length > 0
        ? profileInfo.presentationTags
        : profileUser?.presentationTags ?? [],
    relationshipFramework:
      profileInfo.relationshipFramework ||
      profileUser?.relationshipFramework ||
      '',
    relationalRelationship:
      profileInfo.relationalRelationship ||
      profileUser?.relationalRelationship ||
      '',
  };
}

function renderDetailRow(
  label: string,
  value: string,
  colors: { text: string; textSecondary: string; border: string },
) {
  return (
    <View key={label} style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([PLACEHOLDER_PHOTO]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileInfo, setProfileInfo] = useState<ProfileInfoState>(EMPTY_PROFILE_INFO);

  const loadProfileFromServer = useCallback(async (): Promise<ProfileInfoState | null> => {
    const row = await getCurrentUserProfile();
    const preferencesRow = await getCurrentUserPreferences();

    if (!row) {
      setProfileUser(null);
      return null;
    }

    const r = row as Record<string, unknown>;
    const u = applyPreferencesRowToUser(
      mapUserProfileRowToUser(r),
      preferencesRow as Record<string, unknown> | null,
    );
    setProfileUser(u);

    const pic = (r.profile_picture_url as string | null | undefined)?.trim();
    const photosResponse = await getCurrentUserProfilePhotos();
    const persistedPhotos =
      photosResponse.success && photosResponse.data.length > 0
        ? photosResponse.data.map((photo) => photo.url)
        : [];
    const photoList =
      persistedPhotos.length > 0
        ? persistedPhotos
        : pic && pic.length > 0
          ? [pic]
          : [PLACEHOLDER_PHOTO];
    setPhotos(photoList);
    setProfileImage(photoList[0]);

    const nextInfo = buildProfileInfo(r, u);
    setProfileInfo(nextInfo);
    return nextInfo;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setProfileLoading(true);
      await loadProfileFromServer();
      if (!cancelled) {
        setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfileFromServer]);

  const viewProfile = viewProfileFromState(profileInfo, profileUser);

  const handleChange = (field: string, value: string) => {
    setProfileInfo((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTogglePresentationTag = (tag: string) => {
    setProfileInfo((current) => ({
      ...current,
      presentationTags: current.presentationTags.includes(tag)
        ? current.presentationTags.filter((item) => item !== tag)
        : [...current.presentationTags, tag],
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
      if (!authUser?.id || !authUser.email) {
        Alert.alert("Error", "Unable to save profile because your account session is missing.");
        return;
      }

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
          console.error(
            '[profile] saveCurrentUserProfilePhotos failed:',
            photosResponse.message,
          );
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
        id: authUser.id,
        email: authUser.email,
        display_name: profileInfo.name,
        bio: profileInfo.bio,
        date_of_birth: dateOfBirthFromAge(profileInfo.age),
        height_cm: parseFeetInchesToCm(profileInfo.height),
        body_type: profileInfo.bodyType.trim() || null,
        ethnicity: profileInfo.ethnicity,
        profile_picture_url: profilePictureUrl,
        ...locationFields,
      });

      if (!response.success) {
        Alert.alert("Error", response.message);
        return;
      }

      let preferencesWarning: string | undefined;

      const preferencesResponse = await createUserPreferences({
        user_id: authUser.id,
        intimacy_role: profileInfo.intimacyRole.trim() || null,
        intimacy_preferences: profileInfo.presentationTags,
        relationship_intent: profileInfo.relationshipFramework.trim() || null,
        looking_for: profileInfo.relationalRelationship.trim() || null,
        show_preferences_publicly: true,
      });

      if (!preferencesResponse.success) {
        console.error(
          '[profile] createUserPreferences failed:',
          preferencesResponse.message,
        );
        preferencesWarning =
          preferencesResponse.message ??
          'Profile details were saved, but preferences could not be updated.';
      }

      const savedDraft = { ...profileInfo };

      if (response.data) {
        const row = response.data as Record<string, unknown>;
        const prefsRow = preferencesResponse.success
          ? (preferencesResponse.data as Record<string, unknown> | null)
          : null;
        const savedUser = applyPreferencesRowToUser(
          mapUserProfileRowToUser(row),
          prefsRow,
        );
        setProfileUser(savedUser);
        setProfileInfo(mergeProfileInfoState(savedDraft, buildProfileInfo(row, savedUser)));

        const savedPhoto = (row.profile_picture_url as string | null | undefined)?.trim();
        if (savedPhoto && savedPhotoUrls.length === 0) {
          setProfileImage(savedPhoto);
          setPhotos([savedPhoto]);
        }
      }

      setIsEditing(false);

      const reloaded = await loadProfileFromServer();
      if (reloaded) {
        setProfileInfo((current) => mergeProfileInfoState(savedDraft, reloaded));
      } else {
        setProfileInfo(savedDraft);
      }

      const alertTitle =
        photoWarning || preferencesWarning
          ? "Profile Details Saved"
          : "Success";
      const alertMessage =
        [photoWarning, preferencesWarning].filter(Boolean).join("\n\n") ||
        "Your profile has been updated!";

      Alert.alert(alertTitle, alertMessage);
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
          <PreferencePicker
            label="Height"
            variant="list"
            options={HEIGHT_OPTIONS.map((option) => ({ value: option.height }))}
            selectedValue={profileInfo.height}
            onSelect={(value) => handleChange('height', value)}
          />

          <PreferencePicker
            label="Body type"
            options={BODY_TYPE_OPTIONS.map((option) => ({ value: option.bodyType }))}
            selectedValue={profileInfo.bodyType}
            onSelect={(value) => handleChange('bodyType', value)}
            formatLabel={formatTypeLabel}
          />

          <PreferencePicker
            label="Intimacy role"
            options={INTIMACY_ROLE_OPTIONS.map((option) => ({ value: option.role }))}
            selectedValue={profileInfo.intimacyRole}
            onSelect={(value) => handleChange('intimacyRole', value)}
          />

          <MultiPreferencePicker
            label="I identify as"
            options={IDENTITY_TAG_OPTIONS.map((option) => ({
              value: option.tag,
              label: option.tag,
            }))}
            selectedValues={profileInfo.presentationTags}
            onToggle={handleTogglePresentationTag}
          />

          <PreferencePicker
            label="Relationship style"
            options={RELATIONSHIP_OPTIONS.map((option) => ({ value: option.framework }))}
            selectedValue={profileInfo.relationshipFramework}
            onSelect={(value) => handleChange('relationshipFramework', value)}
          />

          <PreferencePicker
            label="Looking for"
            options={RELATIONAL_OPTIONS.map((option) => ({ value: option.relationship }))}
            selectedValue={profileInfo.relationalRelationship}
            onSelect={(value) => handleChange('relationalRelationship', value)}
          />
          
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
              {viewProfile.name || 'Your profile'}
              {viewProfile.age ? `, ${viewProfile.age}` : ''}
            </Text>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setProfileInfo(viewProfileFromState(profileInfo, profileUser));
                setIsEditing(true);
              }}
            >
              <Edit2 size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.profileBio, { color: colors.textSecondary }]}>
            {viewProfile.bio || '—'}
          </Text>

          <View style={styles.detailRows}>
            {renderDetailRow(
              'Height',
              viewProfile.height || '—',
              colors,
            )}
            {renderDetailRow(
              'Body type',
              viewProfile.bodyType
                ? formatTypeLabel(viewProfile.bodyType)
                : '—',
              colors,
            )}
            {renderDetailRow(
              'Ethnicity',
              viewProfile.ethnicity || '—',
              colors,
            )}
            {viewProfile.intimacyRole
              ? renderDetailRow('Intimacy role', viewProfile.intimacyRole, colors)
              : null}
            {viewProfile.presentationTags.length > 0
              ? renderDetailRow(
                  'I identify as',
                  viewProfile.presentationTags.join(', '),
                  colors,
                )
              : null}
            {viewProfile.relationshipFramework
              ? renderDetailRow(
                  'Relationship style',
                  viewProfile.relationshipFramework,
                  colors,
                )
              : null}
            {viewProfile.relationalRelationship
              ? renderDetailRow(
                  'Looking for',
                  viewProfile.relationalRelationship,
                  colors,
                )
              : null}
          </View>

          {viewProfile.location ? (
            <View style={styles.locationContainer}>
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                📍 {viewProfile.location}
              </Text>
            </View>
          ) : null}
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
  detailRows: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    gap: 4,
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