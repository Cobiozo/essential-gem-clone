## Cel
Naprawić dwa problemy w panelu admina (Płatne wydarzenia → Weryfikacja biletów / Edytor szablonu):

1. Skanowanie aparatem od razu pokazuje „Bilet nieprawidłowy / Check-in not yet available", choć bilet jest poprawny — dopiero ręczne „Sprawdź" pokazuje prawidłowy.
2. Nie działa „Podgląd PDF" w edytorze szablonu biletu.

---

### 1) Skaner aparatem — natychmiastowa walidacja

**Przyczyna**
W `TicketVerification.tsx` po zeskanowaniu wywoływane jest `verifyTicket(code, true)` z `markAsCheckedIn=true`. Backend (`verify-event-ticket`) tylko wtedy egzekwuje okno czasowe i zwraca `valid:false, code:TOO_EARLY`, gdy do startu wydarzenia pozostało więcej niż 2 godz. Stąd „nieprawidłowy" po skanie, a „prawidłowy" po ręcznym kliknięciu (które idzie z `false`).

**Zmiana (frontend, `src/components/admin/paid-events/TicketVerification.tsx`)**
- W callbacku skanera zmienić wywołanie na `verifyTicket(code, false)` — czyli najpierw tylko walidacja kodu (bez check-in).
- Po pomyślnej walidacji wyświetlana jest karta „Bilet prawidłowy" z danymi uczestnika i przyciskiem „Wykonaj check-in" (już istnieje). Admin klika check-in świadomie, gdy wydarzenie się rozpocznie.
- Dialog skanera zamykany jak dotąd; treść opisu w dialogu zaktualizować: „Po zeskanowaniu zobaczysz dane uczestnika. Check-in wykonasz osobnym przyciskiem."
- Zaktualizować dolną instrukcję („Aparat telefonu: …") aby odzwierciedlała nowy przepływ.

To gwarantuje, że po prawidłowym skanie od razu pojawia się zielona karta „Bilet prawidłowy" z imieniem/nazwiskiem/eventem, niezależnie od tego, ile czasu pozostało do startu.

---

### 2) Podgląd PDF biletu

**Diagnostyka**
- Bezpośrednie wywołanie funkcji `generate-event-ticket-pdf` z `{preview:true, eventId}` zwraca poprawny PDF (200, `application/pdf`, ~24KB). Funkcja serwerowa działa.
- Problem leży po stronie frontu (`EventTicketTemplatePanel.tsx`, fn `preview()`):
  - `await save()` jest wywoływane przed otwarciem PDF — jeśli zapis się nie powiedzie, `preview()` rzuca błąd zanim w ogóle dojdzie do żądania PDF (i `window.open` po await także bywa blokowane przez przeglądarki jako pop-up, bo traci kontekst „user gesture").
  - Nagłówki używają tylko `VITE_SUPABASE_PUBLISHABLE_KEY` zamiast tokena sesji admina — większość edge funkcji w tym projekcie weryfikuje JWT.

**Zmiana (frontend, `EventTicketTemplatePanel.tsx`, funkcja `preview`)**
- Otworzyć nowe okno SYNCHRONICZNIE na początku funkcji: `const win = window.open('', '_blank')` (gest użytkownika), później do niego załadować Blob URL — eliminuje blokowanie pop-up.
- Wywołać `save()` PRZED otwarciem okna lub niezależnie; jeśli save padnie, nie blokować podglądu (tylko ostrzec toastem) — szablon i tak istnieje w bazie z poprzedniego zapisu, więc podgląd nadal powinien działać.
- Użyć tokena sesji admina w nagłówku `Authorization`:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? VITE_SUPABASE_PUBLISHABLE_KEY}`,
    'apikey': VITE_SUPABASE_PUBLISHABLE_KEY,
  }
  ```
- Po otrzymaniu blob: `win.location.href = URL.createObjectURL(blob)` (zamiast `window.open` po awaitcie). Jeśli `win` był `null` (blokada), fallback: utworzyć link `<a download>` i kliknąć programowo.
- Lepsze komunikaty błędów: pokazać status HTTP i fragment treści odpowiedzi w toaście.

---

### Pliki do edycji
- `src/components/admin/paid-events/TicketVerification.tsx` — skaner woła `verifyTicket(code, false)`; aktualizacja opisów.
- `src/components/admin/paid-events/editor/EventTicketTemplatePanel.tsx` — przebudowa `preview()`: synchroniczne `window.open`, token sesji w Authorization, odporność na błąd `save()`.

Brak zmian w edge funkcjach i bazie danych.