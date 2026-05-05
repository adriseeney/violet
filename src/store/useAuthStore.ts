import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  getCurrentUserSession,
  loginAuthUser,
  logoutAuthUser,
} from "@/services/auth";

type SignInPayload = {
  email: string;
  password: string;
};

type SignInResult = Awaited<ReturnType<typeof loginAuthUser>>;
type SignOutResult = Awaited<ReturnType<typeof logoutAuthUser>>;

type AuthSessionState = {
  session: Session | null;
  user: User | null;
};

type AuthStore = AuthSessionState & {
  isLoading: boolean;
  hydrateSession: () => Promise<Session | null>;
  setSession: (session: Session | null) => void;
  signIn: (payload: SignInPayload) => Promise<SignInResult>;
  signOut: () => Promise<SignOutResult>;
};

const getAuthSessionState = (session: Session | null): AuthSessionState => ({
  session,
  user: session?.user ?? null,
});

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isLoading: false,
      hydrateSession: async () => {
        set({ isLoading: true });

        const session = await getCurrentUserSession();
        set({ ...getAuthSessionState(session), isLoading: false });

        return session;
      },
      setSession: (session) => {
        set(getAuthSessionState(session));
      },
      signIn: async (payload) => {
        set({ isLoading: true });

        const result = await loginAuthUser(payload);

        if (result.success && result.data?.session) {
          set({ ...getAuthSessionState(result.data.session), isLoading: false });
        } else {
          set({ ...getAuthSessionState(null), isLoading: false });
        }

        return result;
      },
      signOut: async () => {
        set({ isLoading: true });

        const result = await logoutAuthUser();
        set({ ...getAuthSessionState(null), isLoading: false });

        return result;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ session, user }) => ({ session, user }),
    },
  ),
);
