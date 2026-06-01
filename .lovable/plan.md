## Cel

Dwie zmiany w panelu admina → Eventy:

### 1. Podgląd PDF biletu w małym oknie (modal)

Obecnie przycisk „Podgląd PDF" w edytorze szablonu biletu (`EventTicketTemplatePanel.tsx`) otwiera PDF w nowej karcie przeglądarki. Zmiana: po kliknięciu ma pojawić się **modal (Dialog) z podglądem PDF** dokładnie tak, jak bilet zostanie wysłany do uczestników, którzy potwierdzili e-mail.

**Zmiany:**
- `src/components/admin/paid-events/editor/EventTicketTemplatePanel.tsx`:
  - Usunąć logikę `window.open` i pobierania PDF jako nowej karty.
  - Dodać stan `previewPdfUrl` + `previewOpen`.
  - Po wywołaniu `generate-event-ticket-pdf` (z `preview: true, eventId`) blob trzymać w `URL.createObjectURL` i otwierać `<Dialog>` z wbudowanym `<iframe src={previewPdfUrl}>` (rozmiar ok. 900×640, responsywny).
  - Modal pokazuje **dokładnie ten sam PDF** który będzie wysyłany (ta sama funkcja edge `generate-event-ticket-pdf`, której używa `_shared/free-event-ticket.ts` przy wysyłce do uczestników po potwierdzeniu maila).
  - Przyciski w stopce modala: „Pobierz PDF" i „Zamknij". Revoke object URL przy zamknięciu.

### 2. Weryfikacja — wybór wydarzenia + lista uczestników z check-inem

Obecnie zakładka **Weryfikacja** (`TicketVerification.tsx`) ma tylko pole na kod biletu i skaner. Brak kontekstu wydarzenia i listy uczestników.

**Nowy układ zakładki Weryfikacja:**

```text
┌─────────────────────────────────────────────────┐
│ Weryfikacja biletów                             │
│ [Wybierz wydarzenie ▼]   ← select               │
└─────────────────────────────────────────────────┘
(po wybraniu wydarzenia pojawia się reszta)
┌─────────────────────────────────────────────────┐
│ Kod biletu  [_______________]  [Sprawdź]        │
│ [📷 Skanuj aparatem telefonu]                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ Lista uczestników (X zarejestrowanych /         │
│                    Y po check-in)               │
│ [🔎 szukaj imię / email / kod]                  │
│ ─────────────────────────────────────────────── │
│ ✅ Jan Kowalski   jan@... DHHF47B43VX7  10:23   │
│ ⬜ Anna Nowak     anna@... A1B2C3D4...  —       │
│   ...                                            │
└─────────────────────────────────────────────────┘
```

**Zachowanie:**
- Select wydarzeń: pobiera aktywne wydarzenia (`paid_events` widoczne dla admina, sortowane wg `event_date` malejąco).
- Lista uczestników: dla wybranego eventu pokazuje wszystkie zamówienia ze statusem potwierdzenia (`status` aktywny + `email_confirmed_at IS NOT NULL` lub bilet wystawiony) — re-używa istniejącej funkcji `admin-list-event-orders` (już zwraca `ticket_code`, `checked_in`, `checked_in_at`, dane uczestnika).
- Każdy wiersz: status (ikona ✅ jeśli `checked_in`), imię/nazwisko, e-mail, kod biletu, godzina check-inu.
- Po udanym check-in (wpis ręczny lub skan QR) wiersz odpowiadającego kodu **natychmiast** aktualizuje się na liście (✅ + godzina). Realizacja: po sukcesie `verify-event-ticket` z `markAsCheckedIn=true` odświeżamy listę lub lokalnie patchujemy stan po `ticket_code`.
- Wyszukiwarka (klient-side) po imieniu/e-mailu/kodzie.
- Licznik na górze: „X zarejestrowanych • Y po check-in".
- Opcjonalnie: cofnięcie check-inu — **NIE dodawać** (pomijam, nie było w prośbie).

**Zmiany w plikach:**
- `src/components/admin/paid-events/TicketVerification.tsx` — przebudowa:
  - Dodać select wydarzenia (hook pobierający `paid_events`).
  - Dodać panel listy uczestników (nowy podkomponent `EventAttendeesList` w tym samym pliku lub nowym `EventAttendeesList.tsx`).
  - Pobieranie przez `supabase.functions.invoke('admin-list-event-orders', { body: { event_id } })`.
  - Po check-in (`verify-event-ticket`) wołać refetch listy.
- Skaner i ręczne wpisanie kodu działają jak dotychczas; dodatkowo, jeśli zeskanowany bilet **nie należy do wybranego wydarzenia**, pokazujemy ostrzeżenie w toaście.

### Czego NIE zmieniam
- Logiki generowania PDF (`generate-event-ticket-pdf`) — pozostaje bez zmian.
- Mailingu biletów (`_shared/free-event-ticket.ts`) — bez zmian.
- Endpointu `verify-event-ticket` — bez zmian (już zwraca komplet danych).
- Pozostałych zakładek (Wydarzenia, Formularze, Zamówienia, Ustawienia).

## Notatki techniczne

- Modal podglądu PDF: `<Dialog>` z `<DialogContent className="max-w-4xl h-[80vh]">` + `<iframe className="w-full h-full" src={previewPdfUrl} />`. Na mobile fallback do pobierania (iframe PDF nie zawsze działa na iOS — wtedy link „Otwórz w nowej karcie").
- Lista uczestników: `useEffect` zależny od `selectedEventId`. Lokalny patch po check-in po `ticket_code`:
  ```ts
  setOrders(prev => prev.map(o => o.ticket_code === code ? { ...o, checked_in: true, checked_in_at: new Date().toISOString() } : o));
  ```
- Edge function `admin-list-event-orders` już istnieje i zwraca wszystko, czego potrzeba — bez zmian.
