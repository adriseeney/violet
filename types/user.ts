export interface User {
  id: string;
  name: string;
  display_name: string;
  email: string;
  age: number;
  gender: string;
  /** Distance from the viewer in miles */
  distance: number;
  bio?: string;
  profilePicture?: string;
  locationCity?: string;
  locationState?: string;
  interests?: string[];
  lastActive?: string;
  isOnline?: boolean;
  // Additional profile information
  height?: number; // Height in cm
  bodyType?: string;
  ethnicity?: string;
  /** Sapphic profile preferences (stored in user_preferences) */
  intimacyRole?: string;
  presentationTags?: string[];
  relationshipFramework?: string;
  relationalRelationship?: string;
  showPreferencesPublicly?: boolean;
  photos?: string[];
} 