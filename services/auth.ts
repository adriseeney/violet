import { supabaseConfig } from "@/config/supabase-config";
import { logSupabaseError } from "@/utils/logSupabaseError";

export const registerAuthUser = async (payload: {
  email: string;
  password: string;
  username?: string;
}) => {
  try {
    const { data, error } = await supabaseConfig.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          username: payload.username,
          display_name: payload.username,
        },
      },
    });

    if (error) {
      logSupabaseError("registerAuthUser auth.signUp", error);
      throw new Error(error.message);
    }

    if (!data.user?.id) {
      throw new Error("User account created, but no user ID was returned.");
    }

    return {
      success: true,
      message: "Auth user registered successfully.",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred during sign up.",
    };
  }
};

export const loginAuthUser = async (payload: {
  email: string;
  password: string;
}) => {
  try {
    const { data, error } = await supabaseConfig.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (error) {
      logSupabaseError("loginAuthUser auth.signInWithPassword", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      message: "User logged in successfully.",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred during login.",
    };
  }
};

export const getCurrentUserSession = async () => {
  try {
    const { data, error } = await supabaseConfig.auth.getSession();

    if (error) {
      logSupabaseError("getCurrentUserSession auth.getSession", error);
      throw new Error(error.message);
    }

    return data.session;
  } catch {
    return null;
  }
};

export const logoutAuthUser = async () => {
  try {
    const { error } = await supabaseConfig.auth.signOut();

    if (error) {
      logSupabaseError("logoutAuthUser auth.signOut", error);
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: "User logged out successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred during logout.",
    };
  }
};