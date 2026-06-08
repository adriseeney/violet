import { useEffect, useState } from 'react';
import {
  Stack,
  SplashScreen,
  useRouter,
  useSegments,
  useRootNavigationState,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabaseConfig } from '@/config/supabase-config';
import { LocationProvider } from '@/contexts/location-context';
import { useAuthStore } from '@/src/store/useAuthStore';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/** Logged-in users can open tab screens plus these stack routes outside (tabs). */
function isAuthenticatedAppRoute(segments: string[]): boolean {
  const root = segments[0];
  if (!root) return false;
  if (root === '(tabs)') return true;
  if (root === 'preferences') return true;
  if (root === 'profile') return true;
  if (root === 'chat') return true;
  return false;
}

function SessionGate() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const user = useAuthStore((state) => state.user);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const setSession = useAuthStore((state) => state.setSession);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        await hydrateSession();
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabaseConfig.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateSession, setSession]);

  useEffect(() => {
    if (!rootNavigationState?.key || checkingSession) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inAppRoute = isAuthenticatedAppRoute(segments);

    if (user && !inAppRoute) {
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [user, segments, router, rootNavigationState?.key, checkingSession]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="preferences" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <LocationProvider>
        <SessionGate />
      </LocationProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}