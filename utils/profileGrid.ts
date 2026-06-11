export const PROFILE_GRID_COLUMNS = 3;
export const PROFILE_GRID_PADDING = 16;
export const PROFILE_GRID_GAP = 8;
export const PROFILE_GRID_FOOTER_HEIGHT = 44;

export function getProfileGridCardSize(screenWidth: number) {
  const cardWidth = Math.floor(
    (screenWidth -
      PROFILE_GRID_PADDING * 2 -
      PROFILE_GRID_GAP * (PROFILE_GRID_COLUMNS - 1)) /
      PROFILE_GRID_COLUMNS,
  );

  return {
    cardWidth,
    cardHeight: cardWidth + PROFILE_GRID_FOOTER_HEIGHT,
  };
}
