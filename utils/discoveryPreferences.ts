/** "I'm interested in" options (stored in user_preferences.show_me / show_preference). */
export const INTEREST_OPTIONS = [
  'Men',
  'Women',
  'Trans Men',
  'Trans Women',
  'Non-binary People',
  'Gender Fluid People',
  'Everyone',
] as const;

export type InterestOption = (typeof INTEREST_OPTIONS)[number];

export const RELATIONSHIP_STATUS_FILTER_OPTIONS = [
  'Single',
  'Dating',
  'Open relationship',
  'Partnered',
  'Married',
] as const;

export type DiscoveryPreferencesForm = {
  interestedIn: string[];
  ageRange: [number, number];
  maxDistanceMiles: number;
  bodyTypes: string[];
  relationshipStatusFilter: string[];
};

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferencesForm = {
  interestedIn: ['Women'],
  ageRange: [18, 65],
  maxDistanceMiles: 25,
  bodyTypes: [],
  relationshipStatusFilter: [],
};

function stringArrayField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseInterestList(value: unknown): string[] {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string');
    return items.length > 0 ? items : [...DEFAULT_DISCOVERY_PREFERENCES.interestedIn];
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : [...DEFAULT_DISCOVERY_PREFERENCES.interestedIn];
  }

  return [...DEFAULT_DISCOVERY_PREFERENCES.interestedIn];
}

export function serializeInterestList(interests: string[]): string {
  return interests.join(', ');
}

export function discoveryFormFromPreferencesRow(
  row: Record<string, unknown> | null | undefined,
): DiscoveryPreferencesForm {
  if (!row) {
    return { ...DEFAULT_DISCOVERY_PREFERENCES };
  }

  return {
    interestedIn: parseInterestList(row.show_me ?? row.show_preference),
    ageRange: [
      typeof row.min_age_preference === 'number' ? row.min_age_preference : 18,
      typeof row.max_age_preference === 'number' ? row.max_age_preference : 65,
    ],
    maxDistanceMiles:
      typeof row.distance_radius_miles === 'number' ? row.distance_radius_miles : 25,
    bodyTypes: stringArrayField(row.body_types),
    relationshipStatusFilter: stringArrayField(row.relationship_status_filter),
  };
}

export function interestsToPreferencesPatch(interestedIn: string[]) {
  const serialized = serializeInterestList(interestedIn);
  return {
    show_me: serialized,
    show_preference: serialized,
  };
}

export function filteringToPreferencesPatch(form: DiscoveryPreferencesForm) {
  return {
    min_age_preference: form.ageRange[0],
    max_age_preference: form.ageRange[1],
    distance_radius_miles: form.maxDistanceMiles,
    body_types: form.bodyTypes,
    relationship_status_filter: form.relationshipStatusFilter,
  };
}
