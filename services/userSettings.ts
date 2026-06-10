import { supabaseConfig } from '@/config/supabase-config';
import { logSupabaseError } from '@/utils/logSupabaseError';

export type AccountSettings = {
  showLocation: boolean;
  showOnlineStatus: boolean;
  notificationsEnabled: boolean;
};

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  showLocation: true,
  showOnlineStatus: true,
  notificationsEnabled: true,
};

function settingsFromRows(
  profile: Record<string, unknown> | null,
  userSettings: Record<string, unknown> | null,
): AccountSettings {
  return {
    showLocation:
      typeof profile?.show_location === 'boolean'
        ? profile.show_location
        : typeof userSettings?.show_location === 'boolean'
          ? userSettings.show_location
          : DEFAULT_ACCOUNT_SETTINGS.showLocation,
    showOnlineStatus:
      typeof profile?.show_online_status === 'boolean'
        ? profile.show_online_status
        : typeof userSettings?.show_online === 'boolean'
          ? userSettings.show_online
          : DEFAULT_ACCOUNT_SETTINGS.showOnlineStatus,
    notificationsEnabled:
      typeof userSettings?.notifications_enabled === 'boolean'
        ? userSettings.notifications_enabled
        : DEFAULT_ACCOUNT_SETTINGS.notificationsEnabled,
  };
}

export async function getAccountSettings(): Promise<AccountSettings | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError('getAccountSettings auth.getSession', sessionError);
      throw new Error(sessionError.message);
    }

    const userId = session?.user?.id;
    if (!userId) {
      return null;
    }

    const [profileResult, settingsResult] = await Promise.all([
      supabaseConfig.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseConfig
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      logSupabaseError('getAccountSettings select user_profiles', profileResult.error);
      throw new Error(profileResult.error.message);
    }

    if (settingsResult.error) {
      logSupabaseError('getAccountSettings select user_settings', settingsResult.error);
      throw new Error(settingsResult.error.message);
    }

    return settingsFromRows(
      profileResult.data as Record<string, unknown> | null,
      settingsResult.data as Record<string, unknown> | null,
    );
  } catch {
    return null;
  }
}

export async function saveAccountSettings(
  patch: Partial<AccountSettings>,
): Promise<{ success: boolean; message?: string; data?: AccountSettings }> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabaseConfig.auth.getSession();

    if (sessionError) {
      logSupabaseError('saveAccountSettings auth.getSession', sessionError);
      throw new Error(sessionError.message);
    }

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error('You must be logged in to update settings.');
    }

    const current = (await getAccountSettings()) ?? { ...DEFAULT_ACCOUNT_SETTINGS };
    const next: AccountSettings = { ...current, ...patch };
    const updatedAt = new Date().toISOString();

    const profileUpdate: Record<string, unknown> = {
      show_location: next.showLocation,
      show_online_status: next.showOnlineStatus,
      updated_at: updatedAt,
    };

    const { error: profileError } = await supabaseConfig
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileError) {
      logSupabaseError('saveAccountSettings update user_profiles', profileError);
      throw new Error(profileError.message);
    }

    const { error: settingsError } = await supabaseConfig.from('user_settings').upsert(
      {
        user_id: userId,
        notifications_enabled: next.notificationsEnabled,
        show_location: next.showLocation,
        show_online: next.showOnlineStatus,
        updated_at: updatedAt,
      },
      { onConflict: 'user_id' },
    );

    if (settingsError) {
      logSupabaseError('saveAccountSettings upsert user_settings', settingsError);
      throw new Error(settingsError.message);
    }

    return {
      success: true,
      message: 'Settings saved.',
      data: next,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'An error occurred while saving settings.',
    };
  }
}
