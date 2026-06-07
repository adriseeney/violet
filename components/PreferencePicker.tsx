import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export type PreferencePickerOption = {
  value: string;
  label?: string;
};

interface PreferencePickerProps {
  label: string;
  options: readonly PreferencePickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  /** `list` = vertical scroll; `chips` = wrapping row (default) */
  variant?: 'list' | 'chips';
  formatLabel?: (value: string) => string;
  maxListHeight?: number;
}

export function PreferencePicker({
  label,
  options,
  selectedValue,
  onSelect,
  variant = 'chips',
  formatLabel,
  maxListHeight = 220,
}: PreferencePickerProps) {
  const { colors } = useTheme();

  const getLabel = (option: PreferencePickerOption) =>
    option.label ?? formatLabel?.(option.value) ?? option.value;

  const renderOption = (option: PreferencePickerOption) => {
    const selected = selectedValue === option.value;

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          variant === 'list' ? styles.listOption : styles.chip,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : colors.cardBackground,
          },
        ]}
        onPress={() => onSelect(option.value)}
      >
        <Text
          style={[
            styles.optionText,
            { color: selected ? '#FFFFFF' : colors.text },
          ]}
        >
          {getLabel(option)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {variant === 'list' ? (
        <ScrollView
          style={[styles.listScroll, { maxHeight: maxListHeight }]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {options.map(renderOption)}
        </ScrollView>
      ) : (
        <View style={styles.chipsRow}>{options.map(renderOption)}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listScroll: {
    borderRadius: 8,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  listOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: 'stretch',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});
