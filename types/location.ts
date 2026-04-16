export type AppCoordinates = {
  latitude: number;
  longitude: number;
};

export type LocationState = {
    coords: AppCoordinates | null;
    permissionStatus: 'granted' | 'denied' | 'undetermined';
    isLoading: boolean;
    error: string | null;
}