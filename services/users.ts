import { supabaseConfig } from "@/config/supabase-config";
import type { User } from "@/types/user";
import { logSupabaseError } from "@/utils/logSupabaseError";

export interface IUserProfilePayload {
  id?: string | null;
  email?: string | null;
  display_name?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  profile_picture_url?: string | null;
  height_cm?: number | null;
  body_type?: string | null;
  ethnicity?: string | null;
}

export interface IUserPreferencesPayload {
  user_id: string;
  show_preference?: string | null;
  relationship_intent?: string | null;
  looking_for?: string | null;
  min_age_preference?: number | null;
  max_age_preference?: number | null;
  distance_radius_miles?: number | null;
  show_me?: string | null;
  is_discoverable?: boolean;
  intimacy_role?: string | null;
  intimacy_preferences?: string[] | null;
  show_preferences_publicly?: boolean;
}

export interface INearbyProfile {
  id: string;
  username?: string | null;
  age?: number | null;
  gender?: string | null;
  display_name?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  distance_miles?: number | null;
}

type UserProfileUpsert = {
  id: string;
  email: string;
  updated_at: string;
  display_name?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  profile_picture_url?: string | null;
  height_cm?: number | null;
  body_type?: string | null;
  ethnicity?: string | null;
};

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function setIfProvided<T extends keyof UserProfileUpsert>(
  row: UserProfileUpsert,
  column: T,
  value: UserProfileUpsert[T] | undefined,
) {
  if (value !== undefined) {
    row[column] = value;
  }
}

function setTextIfProvided<T extends keyof UserProfileUpsert>(
  row: UserProfileUpsert,
  column: T,
  value: string | null | undefined,
) {
  if (value !== undefined) {
    setIfProvided(row, column, normalizeText(value) as UserProfileUpsert[T]);
  }
}

function setDateIfProvided<T extends keyof UserProfileUpsert>(
  row: UserProfileUpsert,
  column: T,
  value: string | null | undefined,
) {
  if (value !== undefined) {
    setIfProvided(row, column, normalizeDate(value) as UserProfileUpsert[T]);
  }
}

function setNumberIfProvided<T extends keyof UserProfileUpsert>(
  row: UserProfileUpsert,
  column: T,
  value: number | null | undefined,
) {
  if (value !== undefined) {
    setIfProvided(row, column, normalizeNumber(value) as UserProfileUpsert[T]);
  }
}

export const createUserProfile = async (payload: IUserProfilePayload) => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseConfig.auth.getUser();

    if (userError) {
      logSupabaseError("createUserProfile auth.getUser", userError);
      throw new Error(userError.message);
    }

    if (!user?.id) {
      throw new Error("No authenticated user found.");
    }

    const userId = normalizeText(payload.id) ?? user.id;
    const email = normalizeText(payload.email) ?? normalizeText(user.email);

    if (!userId) {
      throw new Error("No authenticated user ID found.");
    }

    if (!email) {
      throw new Error("No email address found for the authenticated user.");
    }

    const row: UserProfileUpsert = {
      id: userId,
      email,
      updated_at: new Date().toISOString(),
    };

    setTextIfProvided(row, "display_name", payload.display_name);
    setTextIfProvided(row, "bio", payload.bio);
    setDateIfProvided(row, "date_of_birth", payload.date_of_birth);
    setTextIfProvided(row, "location_city", payload.location_city);
    setTextIfProvided(row, "location_state", payload.location_state);
    setTextIfProvided(row, "profile_picture_url", payload.profile_picture_url);
    setNumberIfProvided(row, "height_cm", payload.height_cm);
    setTextIfProvided(row, "body_type", payload.body_type);
    setTextIfProvided(row, "ethnicity", payload.ethnicity);

    const { data, error } = await supabaseConfig
      .from("user_profiles")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      logSupabaseError("createUserProfile upsert user_profiles", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "User profile created successfully.",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while creating the profile.",
    };
  }
};

function isMissingColumnError(message: string | undefined): boolean {
  return /column .* does not exist/i.test(message ?? "");
}

function buildPreferencesBaseRow(
  payload: IUserPreferencesPayload,
): Record<string, unknown> {
  return {
    user_id: payload.user_id,
    relationship_intent: payload.relationship_intent ?? null,
    looking_for: payload.looking_for ?? null,
    min_age_preference: payload.min_age_preference ?? null,
    max_age_preference: payload.max_age_preference ?? null,
    distance_radius_miles: payload.distance_radius_miles ?? 25,
    show_me: payload.show_me ?? null,
    is_discoverable: payload.is_discoverable ?? true,
    intimacy_preferences: payload.intimacy_preferences ?? [],
    show_preferences_publicly: payload.show_preferences_publicly ?? false,
    updated_at: new Date().toISOString(),
  };
}

/** New column names (after 20260607130000 rename migration). */
function buildPreferencesRowRenamed(
  payload: IUserPreferencesPayload,
): Record<string, unknown> {
  return {
    ...buildPreferencesBaseRow(payload),
    intimacy_role: payload.intimacy_role ?? null,
    show_preference: payload.show_preference ?? null,
  };
}

/** Pre-rename column names still present on many live databases. */
function buildPreferencesRowLegacy(
  payload: IUserPreferencesPayload,
): Record<string, unknown> {
  return {
    ...buildPreferencesBaseRow(payload),
    sexual_role: payload.intimacy_role ?? null,
    sexual_preference: payload.show_preference ?? null,
  };
}

function readIntimacyRole(row: Record<string, unknown>): string | undefined {
  const value = row.intimacy_role ?? row.sexual_role;
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export const createUserPreferences = async (
  payload: IUserPreferencesPayload
) => {
  try {
    let data: Record<string, unknown> | null = null;
    let error: { message?: string } | null = null;

    const renamedAttempt = await supabaseConfig
      .from("user_preferences")
      .upsert(buildPreferencesRowRenamed(payload), { onConflict: "user_id" })
      .select()
      .single();

    if (renamedAttempt.error && isMissingColumnError(renamedAttempt.error.message)) {
      const legacyAttempt = await supabaseConfig
        .from("user_preferences")
        .upsert(buildPreferencesRowLegacy(payload), { onConflict: "user_id" })
        .select()
        .single();

      data = legacyAttempt.data as Record<string, unknown> | null;
      error = legacyAttempt.error;
    } else {
      data = renamedAttempt.data as Record<string, unknown> | null;
      error = renamedAttempt.error;
    }

    if (error) {
      logSupabaseError("createUserPreferences upsert user_preferences", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "User preferences created successfully.",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while creating preferences.",
    };
  }
};

function computeAgeFromDob(dateOfBirth: string | null | undefined): number {
  if (!dateOfBirth) return 0;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const md = today.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < d.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

/** Map a `user_profiles` row to the in-app `User` shape (viewing another person). */
export function mapUserProfileRowToUser(row: Record<string, unknown>): User {
  const city = row.location_city as string | null | undefined;
  const state = row.location_state as string | null | undefined;
  const displayName =
    (row.display_name as string | null | undefined) ||
    (row.username as string | null | undefined) ||
    "Unknown";
  const email = (row.email as string | null | undefined) || "";

  return {
    id: String(row.id),
    name: displayName,
    display_name: displayName,
    email,
    age: computeAgeFromDob(row.date_of_birth as string | null | undefined),
    gender: (row.gender_identity as string | null | undefined) || "",
    distance: 0,
    bio: (row.bio as string | null | undefined) || undefined,
    profilePicture:
      (row.profile_picture_url as string | null | undefined) ||
      "https://via.placeholder.com/300x300?text=User",
    locationCity: city || undefined,
    locationState: state || undefined,
    bodyType: (row.body_type as string | null | undefined) || undefined,
    height:
      typeof row.height_cm === 'number' && Number.isFinite(row.height_cm)
        ? row.height_cm
        : undefined,
    ethnicity: (row.ethnicity as string | null | undefined) || undefined,
    isOnline: false,
  };
}

function stringArrayField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Merge a `user_preferences` row into the in-app `User` shape. */
export function applyPreferencesRowToUser(
  user: User,
  row: Record<string, unknown> | null | undefined,
): User {
  if (!row) return user;

  const presentationTags = stringArrayField(row.intimacy_preferences);

  return {
    ...user,
    intimacyRole: readIntimacyRole(row),
    presentationTags,
    relationshipFramework:
      (row.relationship_intent as string | null | undefined) || undefined,
    relationalRelationship:
      (row.looking_for as string | null | undefined) || undefined,
    showPreferencesPublicly: row.show_preferences_publicly === true,
  };
}

export const getCurrentUserPreferences = async () => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError("getCurrentUserPreferences auth.getSession", sessionError);
      throw new Error(sessionError.message);
    }

    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await supabaseConfig
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      logSupabaseError("getCurrentUserPreferences select user_preferences", error);
      throw new Error(error.message);
    }

    return data;
  } catch {
    return null;
  }
};

export const getUserPreferencesById = async (userId: string) => {
  try {
    const { data, error } = await supabaseConfig
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logSupabaseError("getUserPreferencesById select user_preferences", error);
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

export const getProfileById = async (profileId: string) => {
  try {
    const { data, error } = await supabaseConfig
      .from("user_profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      logSupabaseError("getProfileById select user_profiles", error);
      return {
        success: false as const,
        user: null as User | null,
        message: error.message,
      };
    }

    if (!data) {
      return {
        success: false as const,
        user: null as User | null,
        message: "Profile not found.",
      };
    }

    const preferencesRow = await getUserPreferencesById(profileId);
    const user = applyPreferencesRowToUser(
      mapUserProfileRowToUser(data as Record<string, unknown>),
      preferencesRow as Record<string, unknown> | null,
    );

    return {
      success: true as const,
      user,
      message: undefined as string | undefined,
    };
  } catch (error) {
    return {
      success: false as const,
      user: null as User | null,
      message:
        error instanceof Error ? error.message : "Failed to load profile.",
    };
  }
};
export const getCurrentUserProfile = async () => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError("getCurrentUserProfile auth.getSession", sessionError);
      throw new Error(sessionError.message);
    }

    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await supabaseConfig
      .from("user_profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      logSupabaseError("getCurrentUserProfile select user_profiles", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    logSupabaseError("getCurrentUserProfile", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const updateCurrentUserLocation = async (
  latitude: number,
  longitude: number
) => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError("updateCurrentUserLocation auth.getSession", sessionError);
      throw new Error(sessionError.message);
    }

    if (!session?.user?.id) {
      throw new Error("No authenticated user found.");
    }

    const { data, error } = await supabaseConfig.rpc("update_user_location", {
      current_user_id: session.user.id,
      user_lat: latitude,
      user_lng: longitude,
    });

    if (error) {
      logSupabaseError("updateCurrentUserLocation rpc update_user_location", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "User location updated successfully.",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while updating location.",
    };
  }
};

export const getNearbyProfiles = async (
  latitude: number,
  longitude: number
) => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError("getNearbyProfiles auth.getSession", sessionError);
      throw new Error(sessionError.message);
    }

    if (!session?.user?.id) {
      throw new Error("No authenticated user found.");
    }

    const { data, error } = await supabaseConfig.rpc("nearby_profiles", {
      user_lat: latitude,
      user_lng: longitude,
      current_user_id: session.user.id,
    });

    if (error) {
      logSupabaseError("getNearbyProfiles rpc nearby_profiles", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "Nearby profiles loaded successfully.",
      data: (data ?? []) as INearbyProfile[],
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while fetching nearby profiles.",
      data: [] as INearbyProfile[],
    };
  }
};