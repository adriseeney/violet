import { ActivityIndicator, Text, View, Button } from 'react-native';
import { useLocationContext } from '@/contexts/location-context';

export function LocationGate({ children }: { children: React.ReactNode }) {
  const { permissionStatus, isLoading, error, refreshLocation } = useLocationContext();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
        <Text>Finding women near you...</Text>
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
          Turn on location to see women near you. 
        </Text>
        <Text style={{ marginBottom: 16 }}>
          Violet uses your location to show women nearby.
        </Text>
        <Button title="Try Again" onPress={refreshLocation} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ marginBottom: 16 }}>{error}</Text>
        <Button title="Retry" onPress={refreshLocation} />
      </View>
    );
  }

  return <>{children}</>;
}