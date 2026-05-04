import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';

// Updated sexual preferences options to be inclusive of all genders
type OptionSelectorProps = {
  title: string;
  options: string[];
  selectedOption: string;
  setSelectedOption: (option: string) => void;
  description?: string;
};

type MultiSelectorProps = {
  title: string;
  options: string[];
  selectedOptions: string[];
  toggleOption: (option: string) => void;
  description?: string;
};

// Role options for all genders
const sexualRoleOptions = ["Active", "Passive", "Versatile", "Not specified"]; 

// Position options
const sexualPositionOptions = ["Giving", "Receiving", "Both", "None"];

// Relationship goals and connection types
const intimacyOptions = ["Casual Dating", "Hookups", "Serious Relationship", "Friendship", "Networking"];

// Updated sex style options to be inclusive
const sexStyleOptions = ["Gentle", "Moderate",  "Intense", "Experimental", "BDSM/Kink"];

// Health status options
const hivStatusOptions = ["Negative", "Negative on PrEP", "Positive", "Positive Undetectable", "Prefer not to say"];

// Safety preference options
const safetyOptions = ["Always practice safe sex", "Sometimes practice safe sex", "Prefer not to say", "Discuss in person"];

export default function SexualPreferences() {
  const { colors } = useTheme();
  const [sexualRole, setSexualRole] = useState("Not specified");
  const [sexualPosition, setSexualPosition] = useState("None");
  const [intimacyPreferences, setIntimacyPreferences] = useState(["Casual Dating"]);
  const [sexStyle, setSexStyle] = useState("Moderate");
  const [hivStatus, setHivStatus] = useState("Prefer not to say");
  const [safetySetting, setSafetySetting] = useState("Always practice safe sex");
  const [showInPublic, setShowInPublic] = useState(false);

  const toggleIntimacyPreference = (option: string) => {
    if (intimacyPreferences.includes(option)) {
      setIntimacyPreferences(intimacyPreferences.filter(item => item !== option));
    } else {
      setIntimacyPreferences([...intimacyPreferences, option]);
    }
  };

  const OptionSelector = ({ title, options, selectedOption, setSelectedOption, description }: OptionSelectorProps) => (
    <View style={styles.optionSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
      <View style={styles.optionsContainer}>
        {options.map((option: string) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              { 
                backgroundColor: selectedOption === option ? colors.primary : colors.cardBackground,
                borderColor: colors.border
              }
            ]}
            onPress={() => setSelectedOption(option)}
          >
            <Text
              style={[
                styles.optionText,
                { color: selectedOption === option ? '#ffffff' : colors.text }
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const MultiSelector = ({ title, options, selectedOptions, toggleOption, description }: MultiSelectorProps) => (
    <View style={styles.optionSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
      <View style={styles.optionsContainer}>
        {options.map((option: string) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              { 
                backgroundColor: selectedOptions.includes(option) ? colors.primary : colors.cardBackground,
                borderColor: colors.border
              }
            ]}
            onPress={() => toggleOption(option)}
          >
            <Text
              style={[
                styles.optionText,
                { color: selectedOptions.includes(option) ? '#ffffff' : colors.text }
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Intimacy Preferences</Text>
          <View style={styles.rightPlaceholder} />
        </View>
        
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.infoNote, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              This information is used to help find compatible matches. You can control which information is shown publicly on your profile.
            </Text>
          </View>

          <OptionSelector 
            title="Sexual Role" 
            options={sexualRoleOptions} 
            selectedOption={sexualRole} 
            setSelectedOption={setSexualRole}
            description="Your preferred role in intimate encounters"
          />

          <OptionSelector 
            title="Sexual Position" 
            options={sexualPositionOptions} 
            selectedOption={sexualPosition} 
            setSelectedOption={setSexualPosition}
            description="Your preferred position during intimate encounters"
          />

          <MultiSelector 
            title="Looking For" 
            options={intimacyOptions} 
            selectedOptions={intimacyPreferences} 
            toggleOption={toggleIntimacyPreference}
            description="What types of connections are you seeking? (Select multiple)"
          />

          <OptionSelector 
            title="Intimacy Style" 
            options={sexStyleOptions} 
            selectedOption={sexStyle} 
            setSelectedOption={setSexStyle}
            description="Your preferences regarding intimacy style and intensity"
          />

          <OptionSelector 
            title="Health Status" 
            options={hivStatusOptions} 
            selectedOption={hivStatus} 
            setSelectedOption={setHivStatus}
            description="Your health status"
          />

          <OptionSelector 
            title="Safety Practices" 
            options={safetyOptions} 
            selectedOption={safetySetting} 
            setSelectedOption={setSafetySetting}
            description="Your safety practices preferences"
          />

          <View style={styles.switchSection}>
            <View style={styles.switchHeader}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>
                Show intimacy preferences publicly
              </Text>
              <Switch
                value={showInPublic}
                onValueChange={setShowInPublic}
                trackColor={{ false: colors.border, true: Platform.OS === 'ios' ? colors.primary : `${colors.primary}80` }}
                thumbColor={Platform.OS === 'android' ? colors.primary : '#fff'}
                ios_backgroundColor={colors.border}
              />
            </View>
            <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
              When enabled, these preferences will be visible on your public profile
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  infoNote: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  optionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  switchSection: {
    marginBottom: 24,
  },
  switchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  switchDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
}); 