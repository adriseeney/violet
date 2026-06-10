const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export function isRecentlyActive(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;

  const timestamp = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp <= ONLINE_WINDOW_MS;
}

export function readShowLocationFlag(value: unknown): boolean {
  return value !== false;
}

export function readShowOnlineStatusFlag(value: unknown): boolean {
  return value !== false;
}

/** Whether another user should see location / distance for this profile. */
export function canViewerSeeLocation(showLocation: boolean | undefined): boolean {
  return showLocation !== false;
}

/** Whether another user should see online / last-active status. */
export function canViewerSeeOnlineStatus(showOnlineStatus: boolean | undefined): boolean {
  return showOnlineStatus !== false;
}

export function resolvePublicIsOnline(
  showOnlineStatus: boolean | undefined,
  lastActiveAt: string | null | undefined,
): boolean {
  if (!canViewerSeeOnlineStatus(showOnlineStatus)) return false;
  return isRecentlyActive(lastActiveAt);
}

export function resolvePublicDistanceMiles(
  distanceMiles: number | null | undefined,
  showLocation: boolean | undefined,
): number | null {
  if (!canViewerSeeLocation(showLocation)) return null;
  if (typeof distanceMiles !== 'number' || !Number.isFinite(distanceMiles) || distanceMiles < 0) {
    return null;
  }
  return distanceMiles;
}

export function formatLastActiveLabel(lastActiveAt: string | null | undefined): string | undefined {
  if (!lastActiveAt) return undefined;

  const timestamp = new Date(lastActiveAt).getTime();
  if (!Number.isFinite(timestamp)) return undefined;

  const diffMs = Date.now() - timestamp;
  if (diffMs < ONLINE_WINDOW_MS) return undefined;

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}
