export interface User {
  id: string;
  username: string;
  age: number;
  gender: string;
  /** Distance from the viewer in miles */
  distance: number;
  bio?: string;
  profilePicture: string;
  location?: string;
  interests?: string[];
  lastActive?: string;
  isOnline?: boolean;
  // New fields for preferences
  sexualPreference?: string; // Men, Women, Everyone
  sexualRole?: string; // Active, Passive, Versatile, Not specified
  sexualPosition?: string; // Giving, Receiving, Both, None
  intimacyPreferences?: string[]; // Casual Dating, Hookups, Serious Relationship, etc.
  sexStyle?: string; // Gentle, Moderate, Intense, etc.
  hivStatus?: string; // Health status information
  safetyPractices?: string; // Safety preferences
  showPreferencesPublicly?: boolean; // Whether to show preferences on profile
  // Additional profile information
  height?: number; // Height in cm
  weight?: number; // Weight in kg
  bodyType?: string; // Body type description
  ethnicity?: string; // Ethnicity information
  relationshipStatus?: string; // Current relationship status
  photos?: string[]; // Additional user photos
} 