export interface PartnerProfileData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  city?: string | null;
  country?: string | null;
  specialization?: string | null;
  profile_description?: string | null;
  eq_id?: string | null;
  avatar_url?: string | null;
}

export const VARIABLES_LEGEND: { variable: string; label: string }[] = [
  { variable: '{{imie}}', label: 'Imię partnera' },
  { variable: '{{nazwisko}}', label: 'Nazwisko partnera' },
  { variable: '{{imie_nazwisko}}', label: 'Imię i nazwisko' },
  { variable: '{{email}}', label: 'Email partnera' },
  { variable: '{{telefon}}', label: 'Numer telefonu' },
  { variable: '{{miasto}}', label: 'Miasto' },
  { variable: '{{kraj}}', label: 'Kraj' },
  { variable: '{{specjalizacja}}', label: 'Specjalizacja' },
  { variable: '{{opis}}', label: 'Opis profilu' },
  { variable: '{{eq_id}}', label: 'ID partnera (EQ)' },
  { variable: '{{avatar_url}}', label: 'URL awatara' },
];

const VARIABLE_MAP: Record<string, (p: PartnerProfileData) => string> = {
  '{{imie}}': p => p.first_name || '',
  '{{nazwisko}}': p => p.last_name || '',
  '{{imie_nazwisko}}': p => `${p.first_name || ''} ${p.last_name || ''}`.trim(),
  '{{email}}': p => p.email || '',
  '{{telefon}}': p => p.phone_number || '',
  '{{miasto}}': p => p.city || '',
  '{{kraj}}': p => p.country || '',
  '{{specjalizacja}}': p => p.specialization || '',
  '{{opis}}': p => p.profile_description || '',
  '{{eq_id}}': p => p.eq_id || '',
  '{{avatar_url}}': p => p.avatar_url || '',
};

/** Replace all {{variable}} placeholders in a string with profile data */
export function resolveVariablesInText(text: string, profile: PartnerProfileData): string {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const [key, resolver] of Object.entries(VARIABLE_MAP)) {
    result = result.replaceAll(key, resolver(profile));
  }
  return result;
}

/** Deep-resolve all string values in a config object */
export function resolveVariablesInConfig(
  config: Record<string, any>,
  profile: PartnerProfileData
): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = resolveVariablesInText(value, profile);
    } else if (Array.isArray(value)) {
      resolved[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? resolveVariablesInConfig(item, profile)
          : typeof item === 'string'
          ? resolveVariablesInText(item, profile)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveVariablesInConfig(value, profile);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/** Dummy profile for template preview */
export const PREVIEW_PROFILE: PartnerProfileData = {
  first_name: 'Jan',
  last_name: 'Kowalski',
  email: 'jan.kowalski@example.com',
  phone_number: '+48 600 123 456',
  city: 'Warszawa',
  country: 'Polska',
  specialization: 'Zdrowie i wellness',
  profile_description: 'Pasjonat zdrowego stylu życia',
  eq_id: 'EQ123456',
  avatar_url: '',
};
