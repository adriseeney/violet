import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentCoordinates, ensureForegroundLocationPermissions } from '@/services/location';
import type { AppCoordinates } from '@/types/location';


type PremissionStatus = 'granted' | 'denied' | 'undetermined';

type LocationContextType = {
    coords: AppCoordinates | null;
    permissionStatus: PremissionStatus;
    isLoading: boolean;
    error: string | null;
    requestLocationPermission: () => Promise<void>;
    refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
    const [coords, setCoords] = useState<AppCoordinates | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PremissionStatus>('undetermined');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshLocation = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const permission = await ensureForegroundLocationPermissions();
            setPermissionStatus(permission);

            if (permission !== 'granted') {
                setCoords(null);
                return;
            }

            const nextCoords = await getCurrentCoordinates();
            setCoords(nextCoords);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
            setCoords(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const requestLocationPermission = useCallback(async () => {
        await refreshLocation();
    }, [refreshLocation]);


    useEffect(() => {
        refreshLocation();
    }, [refreshLocation]);

    const value = useMemo(() => ({
        coords,
        permissionStatus,
        isLoading,
        error,
        requestLocationPermission,
        refreshLocation,
    }), [coords, permissionStatus, isLoading, error, requestLocationPermission, refreshLocation]);

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;

}

export function useLocationContext() {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocationContext must be used within a LocationProvider');
    }
    return context;
}