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


// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function SessionGate() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const user = useAuthStore((state) => state.user);
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const setSession = useAuthStore((state) => state.setSession);
  const [checkingSession, setCheckingSession] = useState(true);
  const hasLoadedSession = useRef(false);


  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error, 
        } = await supabaseConfig.auth.getSession();

        if (error) {
          throw error;
        }

<<<<<<< HEAD
        if (!isMounted) return;
        
        setSession(session ?? null);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
=======
      setSession(session);
      setCheckingSession(false);

      console.log("INITIAL SESSION:", session);
>>>>>>> origin/fix/auth-routing-bugs
    };

    loadSession();

    const {
      data: { subscription },
    } = supabaseConfig.auth.onAuthStateChange((event, session) => {
      console.log("AUTH EVENT:", event);
      console.log("AUTH SESSION:", session);
    
      if (!isMounted) return;
    
      setSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateSession, setSession]);

  useEffect(() => {
    console.log("ROUTE GUARD:", {
      session,
      checkingSession,
      segments,
      rootKey: rootNavigationState?.key,
    });
    if (!rootNavigationState?.key || checkingSession) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [user, segments, router, rootNavigationState?.key, checkingSession]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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