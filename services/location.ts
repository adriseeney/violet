import * as Location from 'expo-location';
import type {AppCoordinates} from '@/types/location';

export async function ensureForegroundLocationPermissions(): Promise<
    'granted' | 'denied' | 'undetermined'> {
        const existing = await Location.getForegroundPermissionsAsync();
        if (existing.status === 'granted') {
            return existing.status;
        }
        
        const request = await Location.requestForegroundPermissionsAsync();
        return request.status;
    }
    
    export async function getCurrentCoordinates(): Promise<AppCoordinates | null> {
        const servicesEnabled = await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
            throw new Error('Location services are not enabled');
        }
        
        const permission = await ensureForegroundLocationPermissions();

        if (permission !== 'granted') {
            throw new Error('Location permission not granted');
        }

        const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
    }