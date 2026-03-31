

# Audyt: Powiadomienia dla gości — analiza i znalezione problemy

## Przepływ powiadomień dla gości

Goście otrzymują następujące e-maile w cyklu życia rejestracji:

```text
1. CONFIRMATION — natychmiast po rejestracji
   → send-webinar-confirmation (wywoływany z UI)
   
2. REMINDERS (24h, 12h, 2h, 1h, 15min przed wydarzeniem)
   → process-pending-notifications (CRON co 5min)
     → send-bulk-webinar-reminders (per termin)
   
3. POST-EVENT (do 2h po zakończeniu)
   → process-pending-notifications
     → send-post-event-thank-you
```

---

## ZNALEZIONE PROBLEMY

### ❌ PROBLEM 1 (KRYTYCZNY): Goście standardowych webinarów NIE mają `occurrence_index`

**Stan bazy danych:** Tabela `guest_event_registrations` posiada kolumnę `occurrence_index`, ale RPC `register_event_guest` **nigdy jej nie ustawia** — INSERT zawiera tylko: `event_id, email, first_name, last_name, phone, invited_by, source, registration_attempts, slot_time`. `occurrence_index` pozostaje `NULL`.

**Skutek w `send-bulk-webinar-reminders` (linia 403-412):**
```typescript
if (termOccurrenceIndex !== null && event.occurrences) {
  if (occs.length > 1) {
    guests = guests.filter(g =>
      g.occurrence_index === termOccurrenceIndex // ← ZAWSZE null!
    );
  }
}
```
Po ostatniej poprawce usunęliśmy fallback `g.occurrence_index === null`, co jest poprawne — ale teraz goście z `occurrence_index = null` są **ZAWSZE filtrowani** i **NIGDY nie dostaną żadnych przypomnień** dla wydarzeń cyklicznych z wieloma terminami.

**Dla auto-webinarów** ten problem nie istnieje, bo auto-webinary nie używają `occurrences` tablicy — mają własny system slotów.

**Dla standardowych webinarów z wieloma terminami** (np. "Prezentacja możliwości biznesowych" z kilkoma datami w `occurrences`) — goście tracą WSZYSTKIE przypomnienia.

### ❌ PROBLEM 2: `InviteToEventDialog` nie przekazuje informacji o terminie

Gdy partner zaprasza gościa na wydarzenie cykliczne (linia 177-186), RPC jest wywoływany z `p_slot_time: null`. Nie ma żadnego mechanizmu wyboru konkretnego terminu — gość jest zapisywany na "wydarzenie jako całość", bez wskazania konkretnej daty.

### ❌ PROBLEM 3: `EventGuestRegistration` (formularz publiczny) — brak obsługi `occurrences`

Formularz publiczny rejestracji gościa (linia 341-350) przekazuje `p_slot_time` tylko dla auto-webinarów. Dla standardowych webinarów z wieloma terminami nie ma UI do wyboru terminu, więc `occurrence_index` i informacja o konkretnym terminie nie jest zapisywana.

### ❌ PROBLEM 4: Potwierdzenie e-mail zawiera datę bazowego `start_time`, nie wybranego terminu

`send-webinar-confirmation` otrzymuje `eventDate: event.start_time` (linia 372). Dla wydarzeń cyklicznych z wieloma terminami, gość dostaje e-mail z datą PIERWSZEGO terminu, nie tego na który się zarejestrował.

### ❌ PROBLEM 5: Post-event thank-you — brak filtrowania po terminie

`process-pending-notifications` (linia 980-1004) szuka wydarzeń, które się skończyły w ciągu 2h i wysyła do WSZYSTKICH gości niezależnie od terminu. Dla wydarzeń cyklicznych to oznacza, że goście zapisani na przyszły termin mogą dostać "dziękujemy za udział" po pierwszym terminie.

### ⚠️ PROBLEM 6: Confirmation email w `send-webinar-confirmation` — natychmiastowy reminder

Linia 742-806: Jeśli rejestracja jest < 60 min przed startem, system wysyła natychmiastowe przypomnienie z linkiem Zoom i oznacza WSZYSTKIE flagi reminderów jako wysłane. Ale `start_time` bazowe jest użyte — nie termin z `occurrences`. Dla wydarzeń cyklicznych to może triggerować fałszywe natychmiastowe przypomnienie.

### ✅ PROBLEM 7 (NAPRAWIONY): Legacy fallback `occurrence_index === null`
Już naprawiony w ostatniej edycji — usunięcie fallbacku `g.occurrence_index === null` i `r.occurrence_index === null`.

---

## PLAN NAPRAWY

### Zmiana 1: Dodać kolumnę `occurrence_date` i `occurrence_time` do `guest_event_registrations`
Analogicznie do `event_registrations` — stabilne snapshoty daty i godziny konkretnego terminu.

### Zmiana 2: Zaktualizować RPC `register_event_guest`
Dodać parametry `p_occurrence_date` i `p_occurrence_time` (opcjonalne). Ustawiane przy rejestracji na konkretny termin.

### Zmiana 3: Fix filtrowania gości w `send-bulk-webinar-reminders`
Zamiast filtrować po `occurrence_index` (który jest zawsze null), filtrować po `occurrence_date` + `occurrence_time` — tak jak dla użytkowników:
```typescript
guests = guests.filter(g =>
  (g.occurrence_date === targetDate && g.occurrence_time === targetTime) ||
  (g.occurrence_date === null && g.occurrence_index === termOccurrenceIndex)
);
```

### Zmiana 4: Fix potwierdzenia e-mail
W `EventGuestRegistration.tsx` i `InviteToEventDialog.tsx` — przekazywać datę konkretnego terminu (nie `event.start_time`) jako `eventDate`.

### Zmiana 5: Fix post-event thank-you
W `process-pending-notifications` — dla wydarzeń cyklicznych sprawdzać `end_time` per-occurrence (nie bazowe `end_time`), i filtrować gości po `occurrence_date`/`occurrence_time`.

### Zmiana 6: UI wyboru terminu
Dla standardowych webinarów cyklicznych — dodać wybór konkretnego terminu w formularzu rejestracji gościa i w dialogu zaproszenia partnera.

### Zmiana 7: Redeploy edge functions
Po wszystkich zmianach: `send-bulk-webinar-reminders`, `process-pending-notifications`, `send-webinar-confirmation`.

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migration SQL | Dodanie `occurrence_date`, `occurrence_time` do `guest_event_registrations`, update RPC |
| `supabase/functions/send-bulk-webinar-reminders/index.ts` | Pobranie i filtrowanie gości po `occurrence_date`/`occurrence_time` |
| `supabase/functions/process-pending-notifications/index.ts` | Fix post-event per-occurrence |
| `supabase/functions/send-webinar-confirmation/index.ts` | Przyjmowanie i używanie daty konkretnego terminu |
| `src/pages/EventGuestRegistration.tsx` | Przekazywanie daty terminu, UI wyboru terminu |
| `src/components/team-contacts/InviteToEventDialog.tsx` | Wybór terminu, przekazywanie `occurrence_date`/`occurrence_time` |

---

## Priorytet
Zmiany 1-3 i 7 są krytyczne — bez nich goście standardowych webinarów cyklicznych **nie dostają żadnych przypomnień**. Zmiany 4-6 to poprawki UX i spójności danych.

