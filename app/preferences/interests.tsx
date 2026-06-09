import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { getCurrentUserPreferences, saveUserPreferences } from '@/services/users';
import { useAuthStore } from '@/src/store/useAuthStore';
import {
  DEFAULT_DISCOVERY_PREFERENCES,
  discoveryFormFromPreferencesRow,
  INTEREST_OPTIONS,
  interestsToPreferencesPatch,
} from '@/utils/discoveryPreferences';

export default function InterestsPreferences() {
  const { colors } = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    [...DEFAULT_DISCOVERY_PREFERENCES.interestedIn],
  );

  useEffect(() => {
    void (async () => {
      const row = await getCurrentUserPreferences();
      const form = discoveryFormFromPreferencesRow(
        row as Record<string, unknown> | null,
      );
      setSelectedInterests(form.interestedIn);
      setLoading(false);
    })();
  }, []);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      if (selectedInterests.length > 1) {
        setSelectedInterests(selectedInterests.filter((item) => item !== interest));
      }
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSelectAll = () => {
    setSelectedInterests([...INTEREST_OPTIONS]);
  };

  const handleSave = async () => {
    if (!authUser?.id) {
      Alert.alert('Error', 'You must be logged in to save preferences.');
      return;
    }

    setSaving(true);

    const response = await saveUserPreferences(
      authUser.id,
      interestsToPreferencesPatch(selectedInterests),
    );

    setSaving(false);

    if (!response.success) {
      Alert.alert('Error', response.message ?? 'Could not save preferences.');
      return;
    }

    Alert.alert('Saved', 'Your interests were updated.');
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
          <Text style={[styles.title, { color: colors.text }]}>I'm interested in</Text>
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
              Select the people you're interested in meeting
            </Text>

            <View style={styles.interestsContainer}>
              {INTEREST_OPTIONS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestButton,
                    {
                      backgroundColor: selectedInterests.includes(interest)
                        ? colors.primary
                        : colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text
                    style={[
                      styles.interestText,
                      {
                        color: selectedInterests.includes(interest)
                          ? '#ffffff'
                          : colors.text,
                      },
                    ]}
                  >
                    {interest}
                  </Text>
                  {selectedInterests.includes(interest) && (
                    <View style={styles.checkContainer}>
                      <Check size={16} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.selectAllButton, { borderColor: colors.border }]}
              onPress={handleSelectAll}
            >
              <Text style={[styles.selectAllText, { color: colors.primary }]}>
                Select Everyone
              </Text>
            </TouchableOpacity>

            <View style={styles.noteContainer}>
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                This helps us show you more relevant people. Your preferences are private
                and can be changed at any time.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Preferences</Text>
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
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  interestsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  interestText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  selectAllText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  noteContainer: {
    marginBottom: 32,
  },
  noteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
