

## Diagnoza: Dlaczego 12h reminder nie został wysłany

### Problem

Powiadomienie 12h przed TEAM MEETING (20:00 dzisiaj) **nie dotarło**, mimo że DST jest już poprawnie obsługiwane. Przyczyna jest inna.

### Przyczyna: rozbieżność `occurrence_index`

1. Wydarzenie TEAM MEETING kiedyś miało wiele terminów — użytkownicy zapisali się na **termin nr 3** (`occurrence_index = 3`)
2. Później ktoś edytował wydarzenie i zostawił **tylko 1 termin** (`[{date: "2026-03-30", time: "20:00"}]`) — ma on `occurrence_index = 0`
3. Rejestracje nadal wskazują na `occurrence_index = 3`
4. Kod filtruje: `registration.occurrence_index === termOccurrenceIndex` → `3 === 0` → **false**
5. Wynik: zero odbiorców, zero e-maili

Powiadomienie 24h wczoraj zadziałało tylko dlatego, że było wysłane **przed edycją wydarzenia** (stara struktura miała termin na indexie 3).

### Okna czasowe przypomnień (obecna konfiguracja)

| Typ | Okno (min przed) | Opis |
|-----|---|---|
| 24h | 23h–25h | Dzień przed |
| 12h | 11h–13h | Pół dnia przed |
| 2h | 1h45m–2h15m | Krótko przed |
| 1h | 45m–1h15m | Godzinę przed |
| 15min | 5m–25m | Tuż przed |

### Rozwiązanie — 2 naprawy

**Naprawa 1 (natychmiastowa): Poprawić rejestracje w bazie**

Zmienić `occurrence_index` z 3 na 0 dla wszystkich aktywnych rejestracji na to wydarzenie:
```sql
UPDATE event_registrations 
SET occurrence_index = 0 
WHERE event_id = 'e3363eaf-...' 
AND status = 'registered' 
AND occurrence_index = 3;
```

**Naprawa 2 (systemowa): Zabezpieczyć kod przed tym problemem**

W `send-bulk-webinar-reminders/index.ts` zmienić logikę filtrowania, żeby:
- Jeśli wydarzenie ma **dokładnie 1 occurrence**, wysyłać do WSZYSTKICH zapisanych użytkowników bez filtrowania po `occurrence_index`
- Dzięki temu edycja harmonogramu nie „popsuje" przypomnień

Zmiana w pliku `supabase/functions/send-bulk-webinar-reminders/index.ts` (linie 416-422):
```typescript
// Jeśli wydarzenie ma tylko 1 occurrence, nie filtruj po indeksie
let relevantUserRegs = userRegs || [];
if (termOccurrenceIndex !== null && event.occurrences) {
  let occCount = 0;
  if (Array.isArray(event.occurrences)) occCount = event.occurrences.length;
  
  if (occCount > 1) {
    // Multi-occurrence: filtruj ściśle po indeksie
    relevantUserRegs = relevantUserRegs.filter(r => 
      r.occurrence_index === termOccurrenceIndex || r.occurrence_index === null
    );
  }
  // Single occurrence: bierz wszystkich zapisanych (bez filtrowania)
}
```

### Dodatkowe usprawnienie: automatyczna aktualizacja indeksów przy edycji wydarzenia

W frontendzie (hook edycji wydarzeń) dodać logikę: gdy liczba occurrences się zmniejsza, automatycznie zaktualizować `occurrence_index` w rejestracji, żeby odpowiadał nowemu harmonogramowi (lub ustawić na 0 jeśli zostaje jeden termin).

### Pliki do zmiany

1. **Migracja SQL** — natychmiastowa naprawa `occurrence_index` dla TEAM MEETING
2. **`supabase/functions/send-bulk-webinar-reminders/index.ts`** — tolerancja na single-occurrence
3. Opcjonalnie: hook edycji wydarzeń we frontendzie — auto-korekta indeksów

### Po naprawie

Po poprawie indeksów, kolejne powiadomienia (2h, 1h, 15min) powinny zadziałać poprawnie dla dzisiejszego wydarzenia.

