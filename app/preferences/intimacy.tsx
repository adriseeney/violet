import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { PreferencePicker, MultiPreferencePicker } from '@/components/PreferencePicker';
import {
  applyPreferencesRowToUser,
  createUserPreferences,
  getCurrentUserPreferences,
  mapUserProfileRowToUser,
  getCurrentUserProfile,
} from '@/services/users';
import { useAuthStore } from '@/src/store/useAuthStore';
import {
  IDENTITY_TAG_OPTIONS,
  INTIMACY_ROLE_OPTIONS,
  RELATIONAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from '@/types/preferences';

type IntimacyFormState = {
  intimacyRole: string;
  presentationTags: string[];
  relationshipFramework: string;
  relationalRelationship: string;
  showPreferencesPublicly: boolean;
};

const EMPTY_FORM: IntimacyFormState = {
  intimacyRole: '',
  presentationTags: [],
  relationshipFramework: '',
  relationalRelationship: '',
  showPreferencesPublicly: true,
};

export default function IntimacyPreferencesScreen() {
  const { colors } = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IntimacyFormState>(EMPTY_FORM);

  useEffect(() => {
    void (async () => {
      const profileRow = await getCurrentUserProfile();
      const preferencesRow = await getCurrentUserPreferences();

      if (profileRow) {
        const user = applyPreferencesRowToUser(
          mapUserProfileRowToUser(profileRow as Record<string, unknown>),
          preferencesRow as Record<string, unknown> | null,
        );
        setForm({
          intimacyRole: user.intimacyRole ?? '',
          presentationTags: user.presentationTags ?? [],
          relationshipFramework: user.relationshipFramework ?? '',
          relationalRelationship: user.relationalRelationship ?? '',
          showPreferencesPublicly: user.showPreferencesPublicly ?? true,
        });
      }

      setLoading(false);
    })();
  }, []);

  const handleChange = (field: keyof IntimacyFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleToggleTag = (tag: string) => {
    setForm((current) => ({
      ...current,
      presentationTags: current.presentationTags.includes(tag)
        ? current.presentationTags.filter((item) => item !== tag)
        : [...current.presentationTags, tag],
    }));
  };

  const handleSave = async () => {
    if (!authUser?.id) {
      Alert.alert('Error', 'You must be logged in to save preferences.');
      return;
    }

    setSaving(true);

    const response = await createUserPreferences({
      user_id: authUser.id,
      intimacy_role: form.intimacyRole.trim() || null,
      intimacy_preferences: form.presentationTags,
      relationship_intent: form.relationshipFramework.trim() || null,
      looking_for: form.relationalRelationship.trim() || null,
      show_preferences_publicly: form.showPreferencesPublicly,
    });

    setSaving(false);

    if (!response.success) {
      Alert.alert('Error', response.message ?? 'Could not save preferences.');
      return;
    }

    Alert.alert('Saved', 'Your intimacy preferences were updated.');
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Intimacy preferences</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              These show on your profile when you choose to share them publicly.
            </Text>

            <View style={[styles.formCard, { backgroundColor: colors.cardBackground }]}>
              <PreferencePicker
                label="Intimacy role"
                options={INTIMACY_ROLE_OPTIONS.map((option) => ({ value: option.role }))}
                selectedValue={form.intimacyRole}
                onSelect={(value) => handleChange('intimacyRole', value)}
              />

              <MultiPreferencePicker
                label="I identify as"
                options={IDENTITY_TAG_OPTIONS.map((option) => ({
                  value: option.tag,
                  label: option.tag,
                }))}
                selectedValues={form.presentationTags}
                onToggle={handleToggleTag}
              />

              <PreferencePicker
                label="Relationship style"
                options={RELATIONSHIP_OPTIONS.map((option) => ({ value: option.framework }))}
                selectedValue={form.relationshipFramework}
                onSelect={(value) => handleChange('relationshipFramework', value)}
              />

              <PreferencePicker
                label="Looking for"
                options={RELATIONAL_OPTIONS.map((option) => ({ value: option.relationship }))}
                selectedValue={form.relationalRelationship}
                onSelect={(value) => handleChange('relationalRelationship', value)}
              />

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    Show on my profile
                  </Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    Others can see these preferences when viewing your profile.
                  </Text>
                </View>
                <Switch
                  value={form.showPreferencesPublicly}
                  onValueChange={(value) => handleChange('showPreferencesPublicly', value)}
                  trackColor={{
                    false: colors.border,
                    true: Platform.OS === 'ios' ? colors.primary : colors.primaryTransparent,
                  }}
                  thumbColor={Platform.OS === 'android' ? colors.primary : '#fff'}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save preferences</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  rightPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    lineHeight: 22,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  switchHint: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
