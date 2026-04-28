/**
 * Lista popularnych przewoźników i usługodawców pocztowych/kurierskich.
 * Używana w formularzu klienta Bazy testów Omega.
 *
 * Wartość specjalna `__custom__` oznacza opcję "Inny / wpisz ręcznie",
 * po wybraniu której użytkownik wpisuje nazwę przewoźnika samodzielnie.
 */
export const CARRIER_CUSTOM_VALUE = '__custom__';

export const CARRIERS: string[] = [
  // Polska — poczta i kurierzy
  'Poczta Polska',
  'Pocztex',
  'InPost (Paczkomat)',
  'InPost Kurier',
  'Orlen Paczka',
  'DPD',
  'DHL Express',
  'DHL Parcel',
  'GLS',
  'UPS',
  'FedEx',
  'TNT',
  'Geis',
  'Raben',
  'X-press Couriers',
  'Patron Service',

  // Międzynarodowe / zagraniczne
  'Aramex',
  'PostNL',
  'Royal Mail',
  'Deutsche Post',
  'La Poste',
  'Hermes',
  'Yodel',
  'USPS',
  'Canada Post',
  'Australia Post',
].sort((a, b) => a.localeCompare(b, 'pl'));

/**
 * Sprawdza, czy podana wartość znajduje się na predefiniowanej liście.
 */
export const isKnownCarrier = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return CARRIERS.includes(value);
};
