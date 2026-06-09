// types/preferences.ts

// ==========================================
// 1. HEIGHT OPTIONS
// ==========================================
export const HEIGHT_OPTIONS = [
    { height: "4'0" }, { height: "4'1" }, { height: "4'2" }, { height: "4'3" }, { height: "4'4" }, { height: "4'5" }, { height: "4'6" }, { height: "4'7" }, { height: "4'8" }, { height: "4'9" }, { height: "4'10" }, { height: "4'11" },
    { height: "5'0" }, { height: "5'1" }, { height: "5'2" }, { height: "5'3" }, { height: "5'4" }, { height: "5'5" }, { height: "5'6" }, { height: "5'7" }, { height: "5'8" }, { height: "5'9" }, { height: "5'10" }, { height: "5'11" },
    { height: "6'0" }, { height: "6'1" }, { height: "6'2" }, { height: "6'3" }, { height: "6'4" }, { height: "6'5" }, { height: "6'6" }, { height: "6'7" }, { height: "6'8" }, { height: "6'9" }, { height: "6'10" }, { height: "6'11" },
    { height: "7'0" },
  ] as const;
  
  export type IHeightOption = typeof HEIGHT_OPTIONS[number];
  export type HeightString = IHeightOption['height'];
  
  
  // ==========================================
  // 2. BODY TYPE OPTIONS
  // ==========================================
  export const BODY_TYPE_OPTIONS = [
    { bodyType: "slim/slender" },
    { bodyType: "average" },
    { bodyType: "athletic" },
    { bodyType: "curvy" },
    { bodyType: "a few extra / heavy set" },
    { bodyType: "prefer not to say" },
  ] as const;
  
  export type IBodyTypeOption = typeof BODY_TYPE_OPTIONS[number];
  export type BodyTypeString = IBodyTypeOption['bodyType'];
  
  
  // ==========================================
  // 3. INTIMACY ROLE OPTIONS
  // ==========================================
  export const INTIMACY_ROLE_OPTIONS = [
    { role: 'Still exploring' },
    { role: 'Ask me' },
    { role: 'Figuring it out' },
    { role: 'Open & curious' },
    { role: 'Top' },
    { role: 'Stone Top' },
    { role: 'Bottom' },
    { role: 'Pillow Princess' },
    { role: 'Switch' },
    { role: 'No Label' },
    { role: 'Prefer not to say' },
    { role: 'Not specified' }
  ] as const;
  
  export type IInimacyRoleOption = typeof INTIMACY_ROLE_OPTIONS[number];
  export type SapphicRoleString = IInimacyRoleOption['role'];
  
  
 // ========================================== //
// 4. IDENTITY & PRESENTATION TAGS            //
// ========================================== //
export const IDENTITY_TAG_OPTIONS = [
    // ALWAYS FIRST: Low-pressure, open placeholders for women figuring it out
    { tag: 'Still figuring it out', value: 'exploring' },
    { tag: 'No Label / Just Me', value: 'unlabeled' },
    
    // Traditional & Subculture presentation styles
    { tag: 'Femme', value: 'femme' },
    { tag: 'Masc', value: 'masc' },
    { tag: 'Butch', value: 'butch' },
    { tag: 'Stem', value: 'stem' },
    { tag: 'Stud', value: 'stud' },
    { tag: 'Chapstick', value: 'chapstick' },
  ] as const;
  
  export type IIdentityTagOption = typeof IDENTITY_TAG_OPTIONS[number];
  export type SapphicIdentityTagString = IIdentityTagOption['tag'];
  
  
  // ==========================================
  // 5. RELATIONSHIP FRAMEWORK OPTIONS
  // ==========================================
  export const RELATIONSHIP_OPTIONS = [
    { framework: 'Prefer not to say' },
    { framework: 'Platonic' },
    { framework: 'Monogamous' },
    { framework: 'Polyamorous / ENM' },
    { framework: 'Open to Both' },
    { framework: 'Not Sure Yet' },
  ] as const;
  
  export type IRelationshipOption = typeof RELATIONSHIP_OPTIONS[number];
  export type RelationshipFrameworkString = IRelationshipOption['framework'];

  // ==========================================
  // 6. Relational Options
  // ==========================================
  export const RELATIONAL_OPTIONS = [
    { relationship: 'Prefer not to say' },
    { relationship: 'Exploring' },
    { relationship: 'Casual Dating' },
    { relationship: 'Hookups' },
    { relationship: 'Serious Relationship' },
    { relationship: 'Friendship' },
    { relationship: 'Networking' },
    { relationship: 'Open to Anything' },
  ] as const;
  
  export type IRelationalOption = typeof RELATIONAL_OPTIONS[number];
  export type RelationalRelationshipString = IRelationalOption['relationship'];
  
  
  // ==========================================
  // DB COLUMN MAPPING (app field → Supabase)
  // ==========================================
  // height                 → user_profiles.height_cm
  // bodyType               → user_profiles.body_type
  // intimacyRole           → user_preferences.intimacy_role
  // presentationTags[]     → user_preferences.intimacy_preferences
  // relationshipFramework  → user_preferences.relationship_intent
  // relationalRelationship → user_preferences.looking_for
  // showPreferencesPublicly→ user_preferences.show_preferences_publicly
  // interestedIn[]           → user_preferences.show_me / show_preference (comma-separated)
  // ageRange                 → user_preferences.min_age_preference / max_age_preference
  // maxDistanceMiles         → user_preferences.distance_radius_miles
  // bodyTypes[] (filter)     → user_preferences.body_types
  // relationshipStatusFilter → user_preferences.relationship_status_filter

  // ==========================================
  // MAIN COMBINED INTERFACE FOR PROFILE STATE
  // ==========================================
  export interface SapphicPreferences {
    height?: HeightString;
    bodyType?: BodyTypeString;
    intimacyRole?: SapphicRoleString;
    presentationTags?: SapphicIdentityTagString[]; // Array because users can multi-select tags
    relationshipFramework?: RelationshipFrameworkString;
    relationalRelationship?: RelationalRelationshipString;
    showPreferencesPublicly?: boolean;
  }
  