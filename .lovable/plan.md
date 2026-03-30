

## Analiza: Potencjalne problemy w rejestracji i powiadomieniach

Po dokładnym przeglądzie kodu zidentyfikowałem **1 krytyczny** i **2 pomniejsze** problemy.

---

### Problem 1 (KRYTYCZNY): Reminder system filtruje po `occurrence_index` zamiast `occurrence_date`/`occurrence_time`

**Plik:** `supabase/functions/send-bulk-webinar-reminders/index.ts` (linie 406-430)

Zapytanie do `event_registrations` pobiera tylko `id, user_id, occurrence_index` — **nie pobiera `occurrence_date` ani `occurrence_time`**. Filtrowanie odbywa się po `occurrence_index`:

```text
relevantUserRegs = relevantUserRegs.filter(r => 
  r.occurrence_index === termOccurrenceIndex || r.occurrence_index === null
);
```

Po migracji nowe rejestracje mają poprawne `occurrence_date`/`occurrence_time`, ale `occurrence_index` może być niedokładny (np. po edycji terminów przez admina). W efekcie:
- Użytkownik zarejestrowany na termin `2026-04-06 20:00` z `occurrence_index=0` nie dostanie przypomnienia, jeśli scheduler wyśle request z `occurrence_index=1` (bo admin dodał nowy termin wcześniej).

**Naprawa:** Zmienić filtrowanie w `send-bulk-webinar-reminders` na `occurrence_date` + `occurrence_time` zamiast `occurrence_index`.

---

### Problem 2 (MNIEJSZY): InviteToEventDialog nie obsługuje wydarzeń cyklicznych

**Plik:** `src/components/team-contacts/InviteToEventDialog.tsx`

Dialog zaproszenia używa `register_event_guest` (tabela `guest_event_registrations`) — ta tabela nie ma pola `occurrence_date`/`occurrence_time`. Nie stanowi to bezpośredniego błędu, bo goście są identyfikowani inaczej, ale:

- `fetchInvitedEvents` sprawdza tylko po `event_id` — dla wydarzenia cyklicznego po zaproszeniu na jeden termin, wszystkie terminy pokazują "Zaproszenie wysłane"
- Brak wyboru konkretnego terminu cyklicznego — gość jest zapraszany na "wydarzenie", nie na konkretną datę

To nie jest bloker, ale warto mieć świadomość ograniczenia.

---

### Problem 3 (MNIEJSZY): `send-webinar-confirmation` — brak eventTime w partner_invite

**Plik:** `src/components/team-contacts/InviteToEventDialog.tsx` (linia 137-152)

Przy zaproszeniu partnera wysyłany jest `eventTime` obliczony z `formatEventDateTime(event.start_time)`. Dla wydarzeń cyklicznych `start_time` wskazuje na pierwszy termin, a nie na faktyczny termin zaproszenia. Nie powoduje to awarii, ale e-mail potwierdzający może zawierać złą datę/godzinę.

---

### Plan naprawy

**Jedyna zmiana kodu:**

1. **`supabase/functions/send-bulk-webinar-reminders/index.ts`** — zmienić SELECT na `id, user_id, occurrence_index, occurrence_date, occurrence_time` i filtrować po `occurrence_date`/`occurrence_time` zamiast `occurrence_index` dla wydarzeń z wieloma terminami. Logika:
   - Jeśli event ma occurrences, wyliczyć datę/czas dla `termOccurrenceIndex` i filtrować rejestracje po `occurrence_date = occ.date AND occurrence_time = occ.time`
   - Zachować fallback na `occurrence_index` dla starych rekordów bez daty
   - Dla single-occurrence → bez filtrowania (jak teraz)

Problemy 2 i 3 dotyczą `InviteToEventDialog` i są ograniczeniami UX — nie powodują błędów funkcjonalnych. Mogą być naprawione osobno.

### Szczegóły techniczne

Zmiana w `send-bulk-webinar-reminders/index.ts` (~15 linii):

```typescript
// Linia 408: dodać pola do SELECT
.select("id, user_id, occurrence_index, occurrence_date, occurrence_time")

// Linie 419-430: zamienić filtrowanie
if (termOccurrenceIndex !== null && event.occurrences) {
  let occCount = Array.isArray(event.occurrences) ? event.occurrences.length : 0;
  
  if (occCount > 1) {
    // Resolve date/time for this occurrence
    const occs = Array.isArray(event.occurrences) ? event.occurrences : [];
    const targetOcc = occs[termOccurrenceIndex];
    if (targetOcc) {
      const targetDate = targetOcc.date;
      const targetTime = targetOcc.time;
      relevantUserRegs = relevantUserRegs.filter(r =>
        // Match by stable date+time snapshot
        (r.occurrence_date === targetDate && r.occurrence_time === targetTime) ||
        // Fallback: legacy index-only match
        (r.occurrence_date === null && r.occurrence_index === termOccurrenceIndex) ||
        // No occurrence info = single event registration
        r.occurrence_index === null
      );
    }
  }
}
```

