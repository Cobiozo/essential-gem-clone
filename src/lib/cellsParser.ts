/**
 * Bezpieczne parsowanie pola cells z bazy danych.
 * Obsługuje formaty: tablica, obiekt, string JSON, null/undefined.
 * @param cells - dane z bazy danych
 * @returns tablica lub obiekt cells (zachowuje oryginalną strukturę)
 */
export const parseCells = (cells: any): any => {
  if (!cells) return [];
  if (Array.isArray(cells)) return cells;
  if (typeof cells === 'string') {
    try {
      return JSON.parse(cells);
    } catch {
      return [];
    }
  }
  if (typeof cells === 'object') return cells;
  return [];
};

/**
 * Wersja zwracająca zawsze tablicę (dla zgodności z typami ContentCell[]).
 * Jeśli cells jest obiektem, zostanie opakowany w tablicę.
 */
export const parseCellsAsArray = (cells: any): any[] => {
  const parsed = parseCells(cells);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) return [parsed];
  return [];
};
