

# Naprawa systemu tłumaczeń — brakujące klucze i wolne ładowanie

## Diagnoza

### Problem 1: Brakujące klucze (mimo ze istnieja w bazie!)

Funkcja `getTranslation()` w `src/hooks/useTranslations.ts` nie obsługuje namespace'ow z kropkami.

Przyklad: klucz `admin.sidebar.users`
- W bazie: namespace = `admin.sidebar`, key = `users` (poprawnie)
- Wyszukiwanie: namespace = `admin` (pierwszy segment), key = `sidebar.users` (reszta) -- NIE ZNAJDZIE

Dotyczy to **83 namespace'ow z kropkami** w bazie (np. `admin.sidebar`, `admin.dailySignal`, `admin.reflinks`, `admin.knowledge`, `admin.events` itd.), co stanowi ponad 1000 kluczy niedostepnych mimo ze sa w bazie.

Strategy 3 (fallback po ostatniej czesci klucza, np. `users`) jest ryzykowna -- moze zwrocic tlumaczenie z zupelnie innego kontekstu.

### Problem 2: Synchronizacja z kodem nic nie zmienia

Przycisk "Synchronizuj z kodem" uruchamia `migrateFromHardcoded()`, ktora ma zakodowana liste tylko ~90 kluczy (w funkcji `getHardcodedTranslations()`). To zaledwie 3.6% z 2504 kluczy w bazie. Nie skanuje kodu zrodlowego -- po prostu wstawia stala, stara liste.

### Problem 3: Wolne ladowanie (mniejszy priorytet)

Ladowanie 2504 kluczy per jezyk z paginacja po 1000 wymaga 3 zapytan do bazy. Przy localStorage cache (5 min TTL) jest to szybkie po pierwszym ladowaniu, ale cold start moze byc odczuwalny.

## Rozwiazanie

### Zmiana 1: Naprawa `getTranslation()` -- obsluga namespace'ow z kropkami

W `src/hooks/useTranslations.ts`, w funkcji `getTranslation` -> `searchInLang`:

Dodac nowa strategie PRZED obecna Strategy 1 -- probuj wszystkie mozliwe podzialy klucza na namespace + key:

```text
// Nowa Strategy: Try all possible namespace.key splits
// Np. 'admin.sidebar.users' -> proba:
//   1. namespace='admin.sidebar', key='users'
//   2. namespace='admin', key='sidebar.users'
const parts = fullKey.split('.');
for (let i = parts.length - 1; i >= 1; i--) {
  const ns = parts.slice(0, i).join('.');
  const key = parts.slice(i).join('.');
  const value = langCache[ns]?.[key];
  if (value) return value;
}
```

Ta petla probuje od najdluzszego namespace do najkrotszego, wiec `admin.sidebar` zostanie znalezione przed `admin`.

Usunac Strategy 3 (fallback po ostatniej czesci klucza) -- jest niebezpieczna i nie bedzie juz potrzebna.

### Zmiana 2: Uaktualnienie `getHardcodedTranslations()` lub zmiana podejscia "sync"

Opcja A (minimalna): Poprawic `migrateFromHardcoded` aby migracja dzialala prawidlowo z nowymi namespace'ami -- ale to nadal nie rozwiaze problemu brakujacych kluczy w kodzie.

Opcja B (lepsza): Zamiast migracji ze stalej listy, zmieniac opis przycisku na "Odswierz cache tlumaczen" i wywolywac `invalidateTranslationsCache()` + reload -- co faktycznie pomaga po dodaniu tlumaczen w panelu admina.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useTranslations.ts` | Naprawa `getTranslation()` -- petla po wszystkich mozliwych podzialach namespace.key; usuniecie ryzykownej Strategy 3 |
| `src/hooks/useTranslations.ts` | Opcjonalnie: aktualizacja opisu/zachowania `migrateFromHardcoded` |

## Wplyw

- Natychmiastowe naprawienie ~1000+ brakujacych kluczy (admin.sidebar.*, admin.dailySignal.*, admin.reflinks.* itd.)
- Brak ryzyka regresji -- nowa strategia jest bardziej precyzyjna niz obecna
- Ladowanie pozostaje takie samo (dane juz sa w bazie i cache)

