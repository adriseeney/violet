import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import { goBackFromFiltering } from '@/utils/navigation';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react-native';
import { MultiPreferencePicker, PreferencePicker } from '@/components/PreferencePicker';
import { getCurrentUserPreferences, saveUserPreferences } from '@/services/users';
import { useAuthStore } from '@/src/store/useAuthStore';
import {
  BODY_TYPE_OPTIONS,
  HEIGHT_OPTIONS,
  IDENTITY_TAG_OPTIONS,
  INTIMACY_ROLE_OPTIONS,
  RELATIONAL_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from '@/types/preferences';
import {
  DEFAULT_DISCOVERY_PREFERENCES,
  discoveryFormFromPreferencesRow,
  filteringToPreferencesPatch,
  RELATIONSHIP_STATUS_FILTER_OPTIONS,
  toggleFilterValue,
  type DiscoveryPreferencesForm,
} from '@/utils/discoveryPreferences';

function formatTypeLabel(value: string): string {
  if (value === 'prefer not to say') return 'Prefer not to say';
  return value
    .split('/')
    .map((part) => part.trim())
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

const ANY_HEIGHT = '';

export default function FilteringPreferences() {
  const { colors } = useTheme();
  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<DiscoveryPreferencesForm>({
    ...DEFAULT_DISCOVERY_PREFERENCES,
  });

  useEffect(() => {
    void (async () => {
      const row = await getCurrentUserPreferences();
      setFilters(discoveryFormFromPreferencesRow(row as Record<string, unknown> | null));
      setLoading(false);
    })();
  }, []);

  const patchFilters = (patch: Partial<DiscoveryPreferencesForm>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const toggleMulti = (field: keyof Pick<
    DiscoveryPreferencesForm,
    | 'bodyTypes'
    | 'relationshipStatusFilter'
    | 'intimacyRoles'
    | 'identityTags'
    | 'relationshipIntents'
    | 'lookingFor'
  >, value: string) => {
    setFilters((current) => ({
      ...current,
      [field]: toggleFilterValue(current[field], value),
    }));
  };

  const updateMinAge = (value: string) => {
    const newMinAge = parseInt(value, 10) || 18;
    patchFilters({
      ageRange: [Math.min(newMinAge, filters.ageRange[1]), filters.ageRange[1]],
    });
  };

  const updateMaxAge = (value: string) => {
    const newMaxAge = parseInt(value, 10) || 65;
    patchFilters({
      ageRange: [filters.ageRange[0], Math.max(newMaxAge, filters.ageRange[0])],
    });
  };

  const updateDistance = (value: string) => {
    const newDistance = parseInt(value, 10) || 1;
    patchFilters({ maxDistanceMiles: Math.max(1, newDistance) });
  };

  const handleSave = async () => {
    if (!authUser?.id) {
      Alert.alert('Error', 'You must be logged in to save filters.');
      return;
    }

    setSaving(true);

    const response = await saveUserPreferences(
      authUser.id,
      filteringToPreferencesPatch(filters),
    );

    setSaving(false);

    if (!response.success) {
      Alert.alert('Error', response.message ?? 'Could not save filters.');
      return;
    }

    Alert.alert('Saved', 'Your browse filters were updated.');
    goBackFromFiltering();
  };

  const heightOptions = [
    { value: ANY_HEIGHT, label: 'Any' },
    ...HEIGHT_OPTIONS.map((option) => ({ value: option.height })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBackFromFiltering}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Filtering Options</Text>
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
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Uses the same options as profile preferences. Leave sections empty to see
              everyone in that category.
            </Text>

            <View style={[styles.formCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <SlidersHorizontal size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Age range</Text>
                </View>
                <View style={styles.rangeInputContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Min</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={filters.ageRange[0].toString()}
                        onChangeText={updateMinAge}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <Text style={[styles.rangeDivider, { color: colors.textSecondary }]}>to</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={filters.ageRange[1].toString()}
                        onChangeText={updateMaxAge}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <SlidersHorizontal size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Distance</Text>
                </View>
                <View style={styles.distanceInputContainer}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        flex: 1,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={filters.maxDistanceMiles.toString()}
                      onChangeText={updateDistance}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>mi</Text>
                </View>
              </View>

              <PreferencePicker
                label="Minimum height"
                variant="list"
                options={heightOptions}
                selectedValue={filters.minHeight}
                onSelect={(value) => patchFilters({ minHeight: value })}
                maxListHeight={160}
              />

              <PreferencePicker
                label="Maximum height"
                variant="list"
                options={heightOptions}
                selectedValue={filters.maxHeight}
                onSelect={(value) => patchFilters({ maxHeight: value })}
                maxListHeight={160}
              />

              <MultiPreferencePicker
                label="Body type"
                options={BODY_TYPE_OPTIONS.map((option) => ({
                  value: option.bodyType,
                  label: formatTypeLabel(option.bodyType),
                }))}
                selectedValues={filters.bodyTypes}
                onToggle={(value) => toggleMulti('bodyTypes', value)}
              />

              <MultiPreferencePicker
                label="Intimacy role"
                options={INTIMACY_ROLE_OPTIONS.map((option) => ({
                  value: option.role,
                  label: option.role,
                }))}
                selectedValues={filters.intimacyRoles}
                onToggle={(value) => toggleMulti('intimacyRoles', value)}
              />

              <MultiPreferencePicker
                label="I identify as"
                options={IDENTITY_TAG_OPTIONS.map((option) => ({
                  value: option.tag,
                  label: option.tag,
                }))}
                selectedValues={filters.identityTags}
                onToggle={(value) => toggleMulti('identityTags', value)}
              />

              <MultiPreferencePicker
                label="Relationship style"
                options={RELATIONSHIP_OPTIONS.map((option) => ({
                  value: option.framework,
                  label: option.framework,
                }))}
                selectedValues={filters.relationshipIntents}
                onToggle={(value) => toggleMulti('relationshipIntents', value)}
              />

              <MultiPreferencePicker
                label="Looking for"
                options={RELATIONAL_OPTIONS.map((option) => ({
                  value: option.relationship,
                  label: option.relationship,
                }))}
                selectedValues={filters.lookingFor}
                onToggle={(value) => toggleMulti('lookingFor', value)}
              />

              <MultiPreferencePicker
                label="Relationship status"
                options={RELATIONSHIP_STATUS_FILTER_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
                selectedValues={filters.relationshipStatusFilter}
                onToggle={(value) => toggleMulti('relationshipStatusFilter', value)}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Apply Filters</Text>
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
  intro: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  rangeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  rangeDivider: {
    marginHorizontal: 16,
    fontFamily: 'Inter-Regular',
  },
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitText: {
    marginLeft: 12,
    fontFamily: 'Inter-Medium',
    fontSize: 16,
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
