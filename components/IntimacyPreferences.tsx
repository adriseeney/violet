import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { User } from '@/types/user';

interface IntimacyPreferencesProps {
  user: User;
  showFull?: boolean;
}

export default function IntimacyPreferences({
  user,
  showFull = false,
}: IntimacyPreferencesProps) {
  const { colors } = useTheme();

  if (!user.showPreferencesPublicly && !showFull) {
    return null;
  }

  const renderItem = (label: string, value: string | string[] | undefined) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    return (
      <View style={styles.preferenceItem}>
        <Text style={[styles.preferenceLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.preferenceValue, { color: colors.text }]}>
          {Array.isArray(value) ? value.join(', ') : value}
        </Text>
      </View>
    );
  };

  const hasSapphicFields =
    user.intimacyRole ||
    (user.presentationTags && user.presentationTags.length > 0) ||
    user.relationshipFramework ||
    user.relationalRelationship;

  if (!showFull && user.intimacyRole) {
    return (
      <View style={styles.previewContainer}>
        <Text style={[styles.previewText, { color: colors.textSecondary }]}>
          Role: {user.intimacyRole}
        </Text>
      </View>
    );
  }

  if (!hasSapphicFields && !showFull) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Preferences
      </Text>

      <View style={styles.preferencesContainer}>
        {renderItem('Intimacy role', user.intimacyRole)}
        {renderItem('I identify as', user.presentationTags)}
        {renderItem('Relationship style', user.relationshipFramework)}
        {renderItem('Looking for', user.relationalRelationship)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  preferencesContainer: {
    gap: 12,
  },
  preferenceItem: {
    gap: 4,
  },
  preferenceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  preferenceValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  previewContainer: {
    marginTop: 4,
  },
  previewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
