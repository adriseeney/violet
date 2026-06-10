import { router } from 'expo-router';

type RouterHref = Parameters<typeof router.replace>[0];

/** Go back when possible; otherwise replace with a sensible parent screen. */
export function goBackOrReplace(fallback: RouterHref) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

export function goBackFromPreferences() {
  goBackOrReplace('/(tabs)/settings');
}

export function goBackFromFiltering() {
  // Browse opens filters too; tabs root is a safe fallback when history is empty.
  goBackOrReplace('/(tabs)');
}

export function goBackFromLogin() {
  goBackOrReplace('/(auth)');
}

export function goBackFromSignup() {
  goBackOrReplace('/(auth)');
}
