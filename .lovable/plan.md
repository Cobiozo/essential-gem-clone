
# Plan: Naprawa samouczka - tutorial pokazuje się za każdym logowaniem

## Zidentyfikowany problem

W pliku `src/hooks/useOnboardingTour.ts` jest **krytyczny błąd w zapytaniach do bazy danych**:

```typescript
// ❌ BŁĄD - wszystkie 4 miejsca w kodzie:
.eq('id', user.id)
```

### Dlaczego to nie działa?

Tabela `profiles` ma dwie kolumny UUID:
- `id` - wewnętrzny UUID profilu (np. `9824d5ad-6517...`)
- `user_id` - UUID z Supabase Auth (np. `cec4eb76-3114...`)

`user.id` z `useAuth()` zwraca UUID z Auth (`cec4eb76-3114...`), który odpowiada kolumnie `user_id`, NIE kolumnie `id`.

### Rezultat

Wszystkie zapytania UPDATE:
```sql
UPDATE profiles SET tutorial_shown_once = true WHERE id = 'cec4eb76-3114...'
```

Zwracają **0 zmienionych wierszy**, bo nie ma profilu z takim `id`. Flagi nigdy nie są zapisywane, więc samouczek pokazuje się przy każdym logowaniu.

---

## Rozwiązanie

Zmiana `.eq('id', user.id)` na `.eq('user_id', user.id)` w 4 miejscach:

### Miejsce 1 (linia 58) - Oznaczanie że samouczek został pokazany:
```typescript
// PRZED:
.eq('id', user.id);

// PO:
.eq('user_id', user.id);
```

### Miejsce 2 (linia 94) - Pomijanie samouczka:
```typescript
// PRZED:
.eq('id', user.id);

// PO:
.eq('user_id', user.id);
```

### Miejsce 3 (linia 126) - Ukończenie samouczka:
```typescript
// PRZED:
.eq('id', user.id);

// PO:
.eq('user_id', user.id);
```

### Miejsce 4 (linia 146) - Restart samouczka:
```typescript
// PRZED:
.eq('id', user.id);

// PO:
.eq('user_id', user.id);
```

---

## Dodatkowe zabezpieczenie

Dodanie refreshProfile() po zapisie flagi, aby lokalny stan `profile` w AuthContext był zsynchronizowany z bazą danych:

```typescript
// Po zapisie tutorial_shown_once:
await supabase
  .from('profiles')
  .update({ tutorial_shown_once: true })
  .eq('user_id', user.id);

// Dodatkowe zabezpieczenie - refresh lokalnego stanu
// (opcjonalne, ale zapobiega problemom z cache)
```

---

## Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useOnboardingTour.ts` | Zamiana `.eq('id', user.id)` na `.eq('user_id', user.id)` w 4 miejscach (linie 58, 94, 126, 146) |

---

## Oczekiwany rezultat

Po naprawie:
1. Przy pierwszym logowaniu - samouczek pojawia się i `tutorial_shown_once` jest zapisywane w bazie
2. Przy kolejnych logowaniach - samouczek NIE pojawia się automatycznie (bo flaga jest ustawiona)
3. Użytkownik nadal może uruchomić samouczek ręcznie przez ikonkę pomocy

---

## Weryfikacja

Po wdrożeniu można sprawdzić w bazie:
```sql
SELECT first_name, last_name, tutorial_shown_once, tutorial_completed, tutorial_skipped 
FROM profiles 
WHERE tutorial_shown_once = true 
LIMIT 10;
```

Po poprawce ten query powinien zwracać użytkowników którzy widzieli samouczek.
