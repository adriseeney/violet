import { parseFeetInchesToCm, cmToHeightString } from '@/utils/height';

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

/** Browse filters — multi-select arrays; empty means "no filter / show everyone". */
export type DiscoveryPreferencesForm = {
  interestedIn: string[];
  ageRange: [number, number];
  maxDistanceMiles: number;
  minHeight: string;
  maxHeight: string;
  bodyTypes: string[];
  relationshipStatusFilter: string[];
  intimacyRoles: string[];
  identityTags: string[];
  relationshipIntents: string[];
  lookingFor: string[];
};

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferencesForm = {
  interestedIn: ['Women'],
  ageRange: [18, 65],
  maxDistanceMiles: 25,
  minHeight: '',
  maxHeight: '',
  bodyTypes: [],
  relationshipStatusFilter: [],
  intimacyRoles: [],
  identityTags: [],
  relationshipIntents: [],
  lookingFor: [],
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
    minHeight:
      typeof row.height_min_cm === 'number' ? cmToHeightString(row.height_min_cm) : '',
    maxHeight:
      typeof row.height_max_cm === 'number' ? cmToHeightString(row.height_max_cm) : '',
    bodyTypes: stringArrayField(row.body_types),
    relationshipStatusFilter: stringArrayField(row.relationship_status_filter),
    intimacyRoles: stringArrayField(row.intimacy_roles_filter),
    identityTags: stringArrayField(row.identity_tags_filter),
    relationshipIntents: stringArrayField(row.relationship_intent_filter),
    lookingFor: stringArrayField(row.looking_for_filter),
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
    height_min_cm: form.minHeight ? parseFeetInchesToCm(form.minHeight) : null,
    height_max_cm: form.maxHeight ? parseFeetInchesToCm(form.maxHeight) : null,
    body_types: form.bodyTypes,
    relationship_status_filter: form.relationshipStatusFilter,
    intimacy_roles_filter: form.intimacyRoles,
    identity_tags_filter: form.identityTags,
    relationship_intent_filter: form.relationshipIntents,
    looking_for_filter: form.lookingFor,
  };
}

/** Toggle one value in a multi-select filter array. */
export function toggleFilterValue(
  current: string[],
  value: string,
): string[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}
