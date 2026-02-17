/**
 * Timezone helper utilities for consistent timezone display across the application.
 * 
 * Policy: "Fixed-timezone display" - events are displayed in their creation timezone
 * with explicit timezone suffix (e.g., "21:00 (CET)"), not converted to user's local time.
 */

export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  // ============ EUROPE ============
  // Central European Time
  'Europe/Warsaw': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Paris': 'CET',
  'Europe/Amsterdam': 'CET',
  'Europe/Brussels': 'CET',
  'Europe/Vienna': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Prague': 'CET',
  'Europe/Budapest': 'CET',
  'Europe/Stockholm': 'CET',
  'Europe/Oslo': 'CET',
  'Europe/Copenhagen': 'CET',
  'Europe/Zurich': 'CET',
  'Europe/Zagreb': 'CET',
  'Europe/Belgrade': 'CET',
  'Europe/Bratislava': 'CET',
  'Europe/Ljubljana': 'CET',
  'Europe/Luxembourg': 'CET',
  'Europe/Monaco': 'CET',
  'Europe/Malta': 'CET',
  'Europe/Andorra': 'CET',
  'Europe/Vatican': 'CET',
  'Europe/San_Marino': 'CET',
  
  // Greenwich Mean Time / Western European Time
  'Europe/London': 'GMT',
  'Europe/Dublin': 'GMT',
  'Europe/Lisbon': 'WET',
  'Atlantic/Reykjavik': 'GMT',
  'Atlantic/Canary': 'WET',
  'Atlantic/Faroe': 'WET',
  
  // Eastern European Time
  'Europe/Helsinki': 'EET',
  'Europe/Athens': 'EET',
  'Europe/Bucharest': 'EET',
  'Europe/Kiev': 'EET',
  'Europe/Kyiv': 'EET',
  'Europe/Sofia': 'EET',
  'Europe/Tallinn': 'EET',
  'Europe/Riga': 'EET',
  'Europe/Vilnius': 'EET',
  'Europe/Chisinau': 'EET',
  
  // Other European
  'Europe/Moscow': 'MSK',
  'Europe/Istanbul': 'TRT',
  'Europe/Minsk': 'MSK',
  'Europe/Kaliningrad': 'EET',
  
  // ============ AMERICAS ============
  // Canada
  'America/St_Johns': 'NST',        // Newfoundland UTC-3:30
  'America/Halifax': 'AST',         // Atlantic Canada
  'America/Moncton': 'AST',
  'America/Toronto': 'EST',
  'America/Montreal': 'EST',
  'America/Winnipeg': 'CST',
  'America/Regina': 'CST',          // Saskatchewan (no DST)
  'America/Edmonton': 'MST',
  'America/Calgary': 'MST',
  'America/Vancouver': 'PST',
  'America/Whitehorse': 'PST',
  'America/Yellowknife': 'MST',
  'America/Iqaluit': 'EST',
  
  // USA
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Los_Angeles': 'PST',
  'America/Phoenix': 'MST',         // Arizona (no DST)
  'America/Anchorage': 'AKST',      // Alaska
  'America/Detroit': 'EST',
  'America/Indianapolis': 'EST',
  'America/Boise': 'MST',
  'Pacific/Honolulu': 'HST',        // Hawaii
  
  // Mexico
  'America/Mexico_City': 'CST',
  'America/Tijuana': 'PST',
  'America/Cancun': 'EST',
  'America/Monterrey': 'CST',
  
  // Central America
  'America/Guatemala': 'CST',
  'America/Costa_Rica': 'CST',
  'America/Panama': 'EST',
  
  // Caribbean
  'America/Havana': 'CST',
  'America/Puerto_Rico': 'AST',
  'America/Jamaica': 'EST',
  'America/Santo_Domingo': 'AST',
  
  // South America
  'America/Sao_Paulo': 'BRT',
  'America/Buenos_Aires': 'ART',
  'America/Argentina/Buenos_Aires': 'ART',
  'America/Santiago': 'CLT',
  'America/Bogota': 'COT',
  'America/Lima': 'PET',
  'America/Caracas': 'VET',
  'America/La_Paz': 'BOT',
  'America/Montevideo': 'UYT',
  'America/Asuncion': 'PYT',
  'America/Guayaquil': 'ECT',
  
  // ============ ASIA ============
  // East Asia
  'Asia/Tokyo': 'JST',
  'Asia/Seoul': 'KST',
  'Asia/Shanghai': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Taipei': 'CST',
  'Asia/Macau': 'CST',
  'Asia/Ulaanbaatar': 'ULAT',
  
  // Southeast Asia
  'Asia/Singapore': 'SGT',
  'Asia/Bangkok': 'ICT',
  'Asia/Jakarta': 'WIB',
  'Asia/Ho_Chi_Minh': 'ICT',
  'Asia/Manila': 'PHT',
  'Asia/Kuala_Lumpur': 'MYT',
  'Asia/Phnom_Penh': 'ICT',
  'Asia/Yangon': 'MMT',
  
  // South Asia
  'Asia/Kolkata': 'IST',
  'Asia/Calcutta': 'IST',
  'Asia/Mumbai': 'IST',
  'Asia/Dhaka': 'BST',
  'Asia/Karachi': 'PKT',
  'Asia/Colombo': 'IST',
  'Asia/Kathmandu': 'NPT',          // Nepal UTC+5:45
  
  // Central Asia
  'Asia/Almaty': 'ALMT',
  'Asia/Tashkent': 'UZT',
  'Asia/Bishkek': 'KGT',
  
  // West Asia / Middle East
  'Asia/Dubai': 'GST',
  'Asia/Riyadh': 'AST',
  'Asia/Jerusalem': 'IST',
  'Asia/Tel_Aviv': 'IST',
  'Asia/Hebron': 'EET',
  'Asia/Gaza': 'EET',
  'Asia/Tehran': 'IRST',            // Iran UTC+3:30
  'Asia/Baghdad': 'AST',
  'Asia/Kuwait': 'AST',
  'Asia/Qatar': 'AST',
  'Asia/Bahrain': 'AST',
  'Asia/Muscat': 'GST',
  'Asia/Amman': 'EET',
  'Asia/Beirut': 'EET',
  'Asia/Damascus': 'EET',
  'Asia/Baku': 'AZT',
  'Asia/Tbilisi': 'GET',
  'Asia/Yerevan': 'AMT',
  
  // ============ AFRICA ============
  'Africa/Cairo': 'EET',
  'Africa/Lagos': 'WAT',
  'Africa/Johannesburg': 'SAST',
  'Africa/Nairobi': 'EAT',
  'Africa/Casablanca': 'WET',
  'Africa/Algiers': 'CET',
  'Africa/Tunis': 'CET',
  'Africa/Tripoli': 'EET',
  'Africa/Khartoum': 'CAT',
  'Africa/Addis_Ababa': 'EAT',
  'Africa/Accra': 'GMT',
  'Africa/Abidjan': 'GMT',
  'Africa/Dakar': 'GMT',
  'Africa/Dar_es_Salaam': 'EAT',
  'Africa/Kampala': 'EAT',
  'Africa/Harare': 'CAT',
  'Africa/Maputo': 'CAT',
  'Africa/Lusaka': 'CAT',
  'Africa/Windhoek': 'CAT',
  
  // ============ OCEANIA / PACIFIC ============
  'Australia/Sydney': 'AEST',
  'Australia/Melbourne': 'AEST',
  'Australia/Brisbane': 'AEST',     // Queensland (no DST)
  'Australia/Perth': 'AWST',
  'Australia/Adelaide': 'ACST',
  'Australia/Darwin': 'ACST',
  'Australia/Hobart': 'AEST',
  'Australia/Canberra': 'AEST',
  'Pacific/Auckland': 'NZST',
  'Pacific/Wellington': 'NZST',
  'Pacific/Fiji': 'FJT',
  'Pacific/Guam': 'ChST',
  'Pacific/Tahiti': 'TAHT',
  'Pacific/Noumea': 'NCT',
  'Pacific/Port_Moresby': 'PGT',
  'Pacific/Samoa': 'SST',
  'Pacific/Tongatapu': 'TOT',
  
  // ============ UTC ============
  'UTC': 'UTC',
  'Etc/UTC': 'UTC',
  'Etc/GMT': 'GMT',
};

/**
 * Get a short abbreviation for a timezone (e.g., "CET", "GMT")
 */
export const getTimezoneAbbr = (timezone: string): string => {
  if (!timezone) return 'CET';
  return TIMEZONE_ABBREVIATIONS[timezone] || timezone.split('/').pop() || 'UTC';
};

/**
 * Get the user's current timezone from the browser
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Warsaw';
  }
};

/**
 * Check if user's timezone differs from event timezone
 */
export const areTimezonesDifferent = (eventTimezone: string): boolean => {
  const userTimezone = getUserTimezone();
  const eventTz = eventTimezone || 'Europe/Warsaw';
  return userTimezone !== eventTz;
};

/**
 * Default timezone for events (Poland)
 */
export const DEFAULT_EVENT_TIMEZONE = 'Europe/Warsaw';

/**
 * Common timezones for selector dropdowns
 */
export const COMMON_TIMEZONES = [
  // Europe
  { value: 'Europe/Warsaw', label: 'Polska (CET)' },
  { value: 'Europe/London', label: 'Wielka Brytania (GMT)' },
  { value: 'Europe/Berlin', label: 'Niemcy (CET)' },
  { value: 'Europe/Paris', label: 'Francja (CET)' },
  { value: 'Europe/Amsterdam', label: 'Holandia (CET)' },
  { value: 'Europe/Brussels', label: 'Belgia (CET)' },
  { value: 'Europe/Vienna', label: 'Austria (CET)' },
  { value: 'Europe/Rome', label: 'Włochy (CET)' },
  { value: 'Europe/Madrid', label: 'Hiszpania (CET)' },
  { value: 'Europe/Prague', label: 'Czechy (CET)' },
  { value: 'Europe/Budapest', label: 'Węgry (CET)' },
  { value: 'Europe/Stockholm', label: 'Szwecja (CET)' },
  { value: 'Europe/Helsinki', label: 'Finlandia (EET)' },
  { value: 'Europe/Athens', label: 'Grecja (EET)' },
  { value: 'Europe/Moscow', label: 'Rosja (MSK)' },
  { value: 'Europe/Istanbul', label: 'Turcja (TRT)' },
  // Americas - USA
  { value: 'America/New_York', label: 'Nowy Jork (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaje (HST)' },
  // Americas - Canada
  { value: 'America/Toronto', label: 'Toronto (EST)' },
  { value: 'America/Vancouver', label: 'Vancouver (PST)' },
  { value: 'America/St_Johns', label: 'Nowa Fundlandia (NST)' },
  // Americas - Other
  { value: 'America/Mexico_City', label: 'Meksyk (CST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  // Asia & Middle East
  { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
  { value: 'Asia/Seoul', label: 'Seul (KST)' },
  { value: 'Asia/Shanghai', label: 'Szanghaj (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hongkong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapur (SGT)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Dubai', label: 'Dubaj (GST)' },
  { value: 'Asia/Jerusalem', label: 'Jerozolima (IST)' },
  { value: 'Asia/Kolkata', label: 'Indie (IST)' },
  // Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

/**
 * Localized common timezones - use inside React components with tf() from useLanguage()
 */
type TfFunc = (key: string, fallback: string) => string;

export const getCommonTimezones = (tf: TfFunc) => [
  // Europe
  { value: 'Europe/Warsaw', label: tf('tz.poland', 'Polska') + ' (CET)' },
  { value: 'Europe/London', label: tf('tz.uk', 'Wielka Brytania') + ' (GMT)' },
  { value: 'Europe/Berlin', label: tf('tz.germany', 'Niemcy') + ' (CET)' },
  { value: 'Europe/Paris', label: tf('tz.france', 'Francja') + ' (CET)' },
  { value: 'Europe/Amsterdam', label: tf('tz.netherlands', 'Holandia') + ' (CET)' },
  { value: 'Europe/Brussels', label: tf('tz.belgium', 'Belgia') + ' (CET)' },
  { value: 'Europe/Vienna', label: tf('tz.austria', 'Austria') + ' (CET)' },
  { value: 'Europe/Rome', label: tf('tz.italy', 'Włochy') + ' (CET)' },
  { value: 'Europe/Madrid', label: tf('tz.spain', 'Hiszpania') + ' (CET)' },
  { value: 'Europe/Prague', label: tf('tz.czechia', 'Czechy') + ' (CET)' },
  { value: 'Europe/Budapest', label: tf('tz.hungary', 'Węgry') + ' (CET)' },
  { value: 'Europe/Stockholm', label: tf('tz.sweden', 'Szwecja') + ' (CET)' },
  { value: 'Europe/Helsinki', label: tf('tz.finland', 'Finlandia') + ' (EET)' },
  { value: 'Europe/Athens', label: tf('tz.greece', 'Grecja') + ' (EET)' },
  { value: 'Europe/Moscow', label: tf('tz.russia', 'Rosja') + ' (MSK)' },
  { value: 'Europe/Istanbul', label: tf('tz.turkey', 'Turcja') + ' (TRT)' },
  // Americas - USA
  { value: 'America/New_York', label: tf('tz.newYork', 'Nowy Jork') + ' (EST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'America/Denver', label: 'Denver (MST)' },
  { value: 'America/Phoenix', label: tf('tz.arizona', 'Arizona') + ' (MST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Anchorage', label: tf('tz.alaska', 'Alaska') + ' (AKST)' },
  { value: 'Pacific/Honolulu', label: tf('tz.hawaii', 'Hawaje') + ' (HST)' },
  // Americas - Canada
  { value: 'America/Toronto', label: 'Toronto (EST)' },
  { value: 'America/Vancouver', label: 'Vancouver (PST)' },
  { value: 'America/St_Johns', label: tf('tz.newfoundland', 'Nowa Fundlandia') + ' (NST)' },
  // Americas - Other
  { value: 'America/Mexico_City', label: tf('tz.mexico', 'Meksyk') + ' (CST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  // Asia & Middle East
  { value: 'Asia/Tokyo', label: tf('tz.tokyo', 'Tokio') + ' (JST)' },
  { value: 'Asia/Seoul', label: tf('tz.seoul', 'Seul') + ' (KST)' },
  { value: 'Asia/Shanghai', label: tf('tz.shanghai', 'Szanghaj') + ' (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hongkong (HKT)' },
  { value: 'Asia/Singapore', label: tf('tz.singapore', 'Singapur') + ' (SGT)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Dubai', label: tf('tz.dubai', 'Dubaj') + ' (GST)' },
  { value: 'Asia/Jerusalem', label: tf('tz.jerusalem', 'Jerozolima') + ' (IST)' },
  { value: 'Asia/Kolkata', label: tf('tz.india', 'Indie') + ' (IST)' },
  // Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];
