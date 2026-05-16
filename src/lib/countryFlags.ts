// Map common country names (PL/EN) to ISO 3166-1 alpha-2 codes and emoji flags.
const NAME_TO_ISO: Record<string, string> = {
  poland: 'PL', polska: 'PL', pl: 'PL',
  germany: 'DE', niemcy: 'DE', deutschland: 'DE', de: 'DE',
  'united kingdom': 'GB', uk: 'GB', anglia: 'GB', 'wielka brytania': 'GB', gb: 'GB',
  jersey: 'GB', 'jersey chanel island': 'GB', 'jersey channel island': 'GB', 'channel islands': 'GB',
  'united states': 'US', usa: 'US', 'stany zjednoczone': 'US', us: 'US',
  ireland: 'IE', irlandia: 'IE', éire: 'IE', eire: 'IE',
  netherlands: 'NL', holandia: 'NL', nederland: 'NL', nl: 'NL',
  belgium: 'BE', belgia: 'BE', belgique: 'BE', 'belgië': 'BE', belgie: 'BE', be: 'BE',
  france: 'FR', francja: 'FR', fr: 'FR',
  spain: 'ES', hiszpania: 'ES', 'españa': 'ES', espana: 'ES', es: 'ES',
  italy: 'IT', italia: 'IT', włochy: 'IT', wlochy: 'IT', it: 'IT',
  austria: 'AT', 'österreich': 'AT', osterreich: 'AT', at: 'AT',
  switzerland: 'CH', szwajcaria: 'CH', schweiz: 'CH', suisse: 'CH', svizzera: 'CH', ch: 'CH',
  czechia: 'CZ', czechy: 'CZ', 'česko': 'CZ', cesko: 'CZ', 'česká republika': 'CZ', cz: 'CZ',
  slovakia: 'SK', słowacja: 'SK', slowacja: 'SK', slovensko: 'SK', sk: 'SK',
  ukraine: 'UA', ukraina: 'UA', 'україна': 'UA', ua: 'UA',
  norway: 'NO', norwegia: 'NO', norge: 'NO', noreg: 'NO', no: 'NO',
  sweden: 'SE', szwecja: 'SE', sverige: 'SE', se: 'SE',
  denmark: 'DK', dania: 'DK', danmark: 'DK', dk: 'DK',
  finland: 'FI', finlandia: 'FI', suomi: 'FI', fi: 'FI',
  canada: 'CA', kanada: 'CA', ca: 'CA',
  australia: 'AU', au: 'AU',
  lithuania: 'LT', litwa: 'LT', lietuva: 'LT', lt: 'LT',
  latvia: 'LV', łotwa: 'LV', lotwa: 'LV', latvija: 'LV', lv: 'LV',
  estonia: 'EE', eesti: 'EE', ee: 'EE',
  romania: 'RO', rumunia: 'RO', 'românia': 'RO', ro: 'RO',
  hungary: 'HU', węgry: 'HU', wegry: 'HU', 'magyarország': 'HU', magyarorszag: 'HU', hu: 'HU',
  portugal: 'PT', portugalia: 'PT', pt: 'PT',
  greece: 'GR', grecja: 'GR', 'ελλάδα': 'GR', ellada: 'GR', hellas: 'GR', gr: 'GR',
};

function isoToEmoji(iso: string): string {
  if (!iso || iso.length !== 2) return '🌐';
  const codePoints = iso.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function normalizeCountry(raw?: string | null): { label: string; iso: string | null; flag: string } {
  const s = (raw ?? '').trim();
  if (!s) return { label: 'Nieznane', iso: null, flag: '❓' };
  const key = s.toLowerCase();
  const iso = NAME_TO_ISO[key] ?? (s.length === 2 ? s.toUpperCase() : null);
  return {
    label: s.length === 2 ? (NAME_TO_ISO[key] ? s.toUpperCase() : s) : s.charAt(0).toUpperCase() + s.slice(1),
    iso,
    flag: iso ? isoToEmoji(iso) : '🌐',
  };
}

export function countryFlag(raw?: string | null): string {
  return normalizeCountry(raw).flag;
}
