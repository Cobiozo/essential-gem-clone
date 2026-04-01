// Shared language-to-country mapping and flag URL utility
// Used by LanguageSelector, InvitationLanguageSelect, ContentLanguageSelector

export const languageToCountry: Record<string, string> = {
  'pl': 'pl',
  'en': 'gb',
  'de': 'de',
  'it': 'it',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt',
  'no': 'no',
};

export const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};
