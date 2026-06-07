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
    { role: 'Top' },
    { role: 'Stone Top' },
    { role: 'Bottom' },
    { role: 'Pillow Princess' },
    { role: 'Switch' },
    { role: 'No Label' },
  ] as const;
  
  export type IInimacyRoleOption = typeof INTIMACY_ROLE_OPTIONS[number];
  export type SapphicRoleString = IInimacyRoleOption['role'];
  
  
  // ==========================================
  // 4. IDENTITY & PRESENTATION TAGS
  // ==========================================
  export const IDENTITY_TAG_OPTIONS = [
    { tag: 'Femme' },
    { tag: 'Butch' },
    { tag: 'Masc' },
    { tag: 'Stem' },
    { tag: 'Stud' },
    { tag: 'Chapstick' },
    { tag: 'No Label' },
  ] as const;
  
  export type IIdentityTagOption = typeof IDENTITY_TAG_OPTIONS[number];
  export type SapphicIdentityTagString = IIdentityTagOption['tag'];
  
  
  // ==========================================
  // 5. RELATIONSHIP FRAMEWORK OPTIONS
  // ==========================================
  export const RELATIONSHIP_OPTIONS = [
    { framework: 'Monogamous' },
    { framework: 'Polyamorous / ENM' },
    { framework: 'Open to Both' },
    { framework: 'Not Sure Yet' },
  ] as const;
  
  export type IRelationshipOption = typeof RELATIONSHIP_OPTIONS[number];
  export type RelationshipFrameworkString = IRelationshipOption['framework'];
  
  
  // ==========================================
  // MAIN COMBINED INTERFACE FOR PROFILE STATE
  // ==========================================
  export interface SapphicPreferences {
    height?: HeightString;
    bodyType?: BodyTypeString;
    intimacyRole?: SapphicRoleString;
    presentationTags?: SapphicIdentityTagString[]; // Array because users can multi-select tags
    relationshipFramework?: RelationshipFrameworkString;
    showPreferencesPublicly?: boolean;
  }
  