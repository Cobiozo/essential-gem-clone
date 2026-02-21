

# Auto-zapis ustawien "Wsparcie i pomoc"

## Problem

Obecnie po edycji pola w edytorze "Wsparcie i pomoc" trzeba recznie kliknac przycisk "Zapisz zmiany". Uzytkownik oczekuje, ze zmiany beda zapisywane automatycznie po kazdej edycji (dynamicznie).

## Rozwiazanie

Dodac mechanizm auto-zapisu (debounced) - po kazdej zmianie w `settings` automatycznie zapisywac do bazy danych z opoznieniem 1 sekundy (debounce), aby uniknac nadmiernej liczby zapytan.

Dodatkowo dodac weryfikacje zapisu (`.select()`) aby wykryc ciche bledy RLS.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/SupportSettingsManagement.tsx` | Dodac `useEffect` z debounce na `settings`, ktory automatycznie wywoluje zapis po kazdej zmianie. Dodac `.select().maybeSingle()` do zapytania update dla weryfikacji. Opcjonalnie ukryc przycisk "Zapisz zmiany" lub zamienic na wskaznik statusu auto-zapisu. |

## Szczegoly techniczne

1. Dodac ref `isInitialLoad` aby nie zapisywac przy pierwszym zaladowaniu danych
2. Dodac `useRef` z timeoutem (debounce 1000ms) na zmiane `settings`
3. W `useEffect` obserwujacym `settings` - po opoznieniu wywolac `handleSave`
4. Zmodyfikowac `handleSave` aby uzywal `.select().maybeSingle()` i weryfikowal zwrocone dane
5. Zamienic przycisk "Zapisz zmiany" na wskaznik statusu: "Zapisano" / "Zapisywanie..." / "Blad zapisu"

```typescript
// Debounced auto-save
const isInitialLoad = useRef(true);
const saveTimeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  if (isInitialLoad.current) {
    isInitialLoad.current = false;
    return;
  }
  if (!settings) return;

  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(() => {
    handleSave();
  }, 1000);

  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [settings]);
```

Weryfikacja zapisu:
```typescript
const { data, error } = await supabase
  .from('support_settings')
  .update({ ... })
  .eq('id', settings.id)
  .select()
  .maybeSingle();

if (error) throw error;
if (!data) {
  toast.error('Nie udalo sie zapisac. Sprawdz uprawnienia.');
  return;
}
```

Wskaznik statusu zamiast przycisku:
- Ikona zielonego znacznika z tekstem "Zapisano" po udanym zapisie
- Animacja ladowania z tekstem "Zapisywanie..." podczas zapisu
- Czerwony komunikat bledu jezeli zapis sie nie powiodl

