
# Plan: Naprawa Zdrowa Wiedza - czas dostępu od pierwszego użycia

## Zdiagnozowane problemy

### Problem 1: Wideo się nie wczytuje
Na zrzucie ekranu widać błąd "Edge Function returned a non-2xx status code" podczas walidacji kodu OTP. Logi pokazują:
```
ERROR Invalid OTP code: { code: "PGRST116", details: "The result contains 0 rows" }
```
Oznacza to, że kod OTP nie został znaleziony w bazie lub został źle wprowadzony. Może to wynikać z:
- Błędnego wpisania kodu (np. zamiana liter)
- Kodu, który już wygasł (timer liczy od generowania, nie od użycia)

### Problem 2: Czas zaczyna się odliczać od wygenerowania kodu
Obecna logika w `generate-hk-otp`:
```typescript
// Linia 126-127: Czas wygaśnięcia ustawiany przy GENEROWANIU
const validityHours = knowledge.otp_validity_hours || 24;
const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
```

A w `validate-hk-otp`:
```typescript
// Linia 89-91: Sesja bierze expires_at z kodu OTP
const otpExpiry = new Date(otpCodeRecord.expires_at);
const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
const expiresAt = otpExpiry < sessionExpiry ? otpExpiry : sessionExpiry;
```

**Oczekiwane zachowanie (jak InfoLink):** Timer zaczyna się od momentu pierwszego użycia kodu, nie od jego wygenerowania.

---

## Rozwiązanie wzorowane na InfoLink

### Krok 1: Rozszerzenie tabeli `hk_otp_codes`

Nowa kolumna do śledzenia pierwszego użycia:

```sql
ALTER TABLE hk_otp_codes 
ADD COLUMN first_used_at TIMESTAMPTZ DEFAULT NULL;
```

### Krok 2: Modyfikacja `generate-hk-otp`

Zmiana logiki - `expires_at` będzie teraz oznaczać **maksymalny termin ważności kodu** (np. 7 dni), a nie czas dostępu do materiału:

```typescript
// PRZED (linia 126-127):
const validityHours = knowledge.otp_validity_hours || 24;
const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

// PO: Kod ma 7 dni na pierwsze użycie
const maxCodeLifetimeDays = 7;
const codeExpiresAt = new Date(Date.now() + maxCodeLifetimeDays * 24 * 60 * 60 * 1000);
```

### Krok 3: Modyfikacja `validate-hk-otp` (kluczowa zmiana)

Wzorując się na `validate-infolink-otp`, timer startuje od momentu użycia:

```typescript
// Pobierz validity_hours z materiału
const validityHours = knowledge.otp_validity_hours || 24;

// Jeśli kod użyty pierwszy raz - ustaw first_used_at i oblicz expires_at
if (!otpCodeRecord.first_used_at) {
  const accessExpiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
  
  // Zaktualizuj rekord OTP - ustaw first_used_at i nowy expires_at
  await supabase
    .from('hk_otp_codes')
    .update({ 
      first_used_at: new Date().toISOString(),
      expires_at: accessExpiresAt.toISOString()
    })
    .eq('id', otpCodeRecord.id);
  
  // Użyj nowego expires_at dla sesji
  otpCodeRecord.expires_at = accessExpiresAt.toISOString();
}

// Teraz oblicz expires_at sesji na podstawie zaktualizowanego OTP
const otpExpiry = new Date(otpCodeRecord.expires_at);
const sessionFromNow = new Date(Date.now() + validityHours * 60 * 60 * 1000);
const expiresAt = sessionFromNow < otpExpiry ? sessionFromNow : otpExpiry;
```

### Krok 4: Aktualizacja komponentów historii

Komponent `MyHkCodesHistory.tsx` powinien pokazywać:
- Przed użyciem: "Oczekuje na użycie" (kod ważny 7 dni)
- Po użyciu: Odliczanie od `first_used_at` + `otp_validity_hours`

---

## Przepływ po zmianach

```text
Partner generuje kod ZW-AB12-CD
        ↓
Kod ma 7 dni na pierwsze użycie (expires_at = +7 dni)
first_used_at = NULL
        ↓
Odbiorca wchodzi i wpisuje kod (dzień 2)
        ↓
validate-hk-otp:
  - Sprawdza czy first_used_at == NULL
  - TAK → ustawia first_used_at = NOW
  - Oblicza expires_at = NOW + 24h (lub otp_validity_hours)
        ↓
Timer zaczyna odliczać: 24:00:00, 23:59:59...
        ↓
Kolejne sesje (ten sam kod) → używają tego samego expires_at
```

---

## Szczegółowe zmiany w plikach

### 1. Migracja bazy danych
- Dodanie kolumny `first_used_at` do `hk_otp_codes`

### 2. `supabase/functions/generate-hk-otp/index.ts`
- Zmiana `expires_at` na 7 dni (czas na pierwsze użycie)
- Dodanie informacji w wiadomości że "kod aktywuje się przy pierwszym użyciu"

### 3. `supabase/functions/validate-hk-otp/index.ts`
- Sprawdzenie `first_used_at` - jeśli NULL to pierwsze użycie
- Aktualizacja `first_used_at` i przeliczenie `expires_at` na podstawie `otp_validity_hours`
- Obliczenie czasu sesji od NOW (jak InfoLink)

### 4. `src/types/healthyKnowledge.ts`
- Dodanie pola `first_used_at` do interfejsu `HkOtpCode`

### 5. `src/components/healthy-knowledge/MyHkCodesHistory.tsx`
- Wyświetlanie statusu "Oczekuje na użycie" lub odliczania
- Pokazanie kiedy kod został użyty pierwszy raz

---

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| `expires_at` przy generowaniu | +24h od generowania | +7 dni (czas na pierwsze użycie) |
| Timer startu | Od wygenerowania kodu | Od pierwszego użycia kodu |
| `first_used_at` | Nie istnieje | Zapisuje moment pierwszego użycia |
| Widok historii | Pokazuje expires_at | Pokazuje "Oczekuje" lub timer od użycia |

---

## Korzyści

1. **Partner może wygenerować kod z wyprzedzeniem** - np. przed spotkaniem
2. **Odbiorca ma pełne 24h od momentu użycia** - nie traci czasu przed otwarciem linku
3. **Spójność z InfoLink** - oba moduły działają tak samo
4. **Lepsza komunikacja** - historia kodów pokazuje kiedy kod został użyty
