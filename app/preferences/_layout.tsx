import { Stack } from 'expo-router';

export default function PreferencesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="filtering" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="intimacy" />
    </Stack>
  );
}
