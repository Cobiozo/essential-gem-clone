

## Diagnoza

Logi Edge Function potwierdzają problem:

```
[self-reset-mfa] Deleted 0/0 TOTP factors for user 7d927c0b-...
```

Reset zwraca `success: true` (bo kod email jest poprawny i nie ma błędu), ale **nie usuwa żadnych faktorów**. `factorsData.totp` zwraca pustą tablicę, mimo że faktor istnieje (błąd "already exists" to potwierdza).

Przyczyna: W nowszych wersjach `supabase-js` Admin API `listFactors` może zwracać faktory w `factorsData.factors` (tablica wszystka typów) zamiast w `factorsData.totp`. Struktura zależy od wersji SDK. Trzeba obsłużyć **oba warianty**.

## Plan naprawy

### 1. Naprawić `self-reset-mfa` Edge Function — obsłużyć oba formaty danych

Zmienić linię pobierania faktorów z:
```ts
const totpFactors = factorsData?.totp ?? [];
```
na:
```ts
const totpFactors = [
  ...(factorsData?.totp ?? []),
  ...(factorsData?.factors?.filter((f: any) => f.factor_type === 'totp') ?? []),
];
```

To gwarantuje, że faktory zostaną znalezione niezależnie od struktury odpowiedzi API. Dodatkowo dodać log diagnostyczny ze strukturą `factorsData` (`Object.keys`), żeby w przyszłości szybko debugować.

### 2. Dodać walidację sukcesu w UI — nie pokazywać "done" jeśli 0 faktorów usunięto

W `MFAEmergencyScreen.tsx`, po odpowiedzi z `self-reset-mfa`:
- Jeśli `data.deleted_factors === 0` i `data.success === true`: wyświetlić ostrzeżenie "Reset przeszedł, ale nie znaleziono faktorów do usunięcia. Spróbuj ponownie lub zgłoś do Support."
- Ewentualnie: traktować `deleted_factors === 0` jako błąd i nie przechodzić do stanu "done".

### 3. Deploy Edge Function

Po zmianie kodu, deploy `self-reset-mfa`.

### Pliki do zmiany
- `supabase/functions/self-reset-mfa/index.ts` — obsługa obu formatów `listFactors`
- `src/components/auth/MFAEmergencyScreen.tsx` — walidacja `deleted_factors > 0`

