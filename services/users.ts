import { supabaseConfig } from "@/config/supabase-config";

export interface IUserProfilePayload {
  id: string;
  email: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  gender_identity?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  profile_picture_url?: string | null;
}

export interface IUserPreferencesPayload {
  user_id: string;
  sexual_preference?: string | null;
  relationship_intent?: string | null;
  looking_for?: string | null;
  min_age_preference?: number | null;
  max_age_preference?: number | null;
  distance_radius_miles?: number | null;
  show_me?: string | null;
  is_discoverable?: boolean;
}

export interface INearbyProfile {
  id: string;
  username: string;
  display_name?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  distance_miles?: number | null;
}

export const createUserProfile = async (payload: IUserProfilePayload) => {
  try {
    const { data, error } = await supabaseConfig
      .from("user_profiles")
      .insert([
        {
          id: payload.id,
          email: payload.email,
          username: payload.username,
          display_name: payload.display_name ?? payload.username,
          bio: payload.bio ?? null,
          date_of_birth: payload.date_of_birth ?? null,
          gender_identity: payload.gender_identity ?? null,
          location_city: payload.location_city ?? null,
          location_state: payload.location_state ?? null,
          profile_picture_url: payload.profile_picture_url ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
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

export const createUserPreferences = async (
  payload: IUserPreferencesPayload
) => {
  try {
    const { data, error } = await supabaseConfig
      .from("user_preferences")
      .insert([
        {
          user_id: payload.user_id,
          sexual_preference: payload.sexual_preference ?? null,
          relationship_intent: payload.relationship_intent ?? null,
          looking_for: payload.looking_for ?? null,
          min_age_preference: payload.min_age_preference ?? null,
          max_age_preference: payload.max_age_preference ?? null,
          distance_radius_miles: payload.distance_radius_miles ?? 25,
          show_me: payload.show_me ?? null,
          is_discoverable: payload.is_discoverable ?? true,
        },
      ])
      .select()
      .single();

    if (error) {
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

export const getCurrentUserProfile = async () => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session?.user?.id) {
      return null;
    }

    const { data, error } = await supabaseConfig
      .from("user_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch {
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