## Problem

Trzy oddzielne usterki:

1. **Nie można dodać tego samego pola dwa razy** (np. dwa razy „Imię" lub dwa razy QR). W kodzie `EventTicketTemplatePanel.tsx` pole identyfikowane jest przez `key` (typ pola). `addField` ma guard `if (tpl.fields.some(f => f.key === key)) return;`, a legenda pokazuje „na płótnie" zamiast „+ Dodaj" gdy klucz już występuje. Także drag/select/update operują po `f.key`, więc dwa pola o tym samym kluczu i tak by się ze sobą myliły.

2. **Podgląd PDF pokazuje pustkę** w iframe (widoczne na screenie – znak zakazu w iframe). Przyciski „Otwórz w nowej karcie" i „Pobierz PDF" są aktywne (więc `previewUrl` istnieje), ale `<iframe src={blob:...}>` blokowany przez Edge/Chromium dla wielu konfiguracji (CSP/sandbox sandbox dialog vs blob:). Treść PDF jest poprawna – problem to wyłącznie renderer iframe.

3. **Po anulowaniu i usunięciu rejestracji nie da się zarejestrować ponownie**. Wymaga doprecyzowania który scenariusz (patrz „Pytania kontrolne") – w kodzie back-endu są dwa miejsca, w których sprawdzany jest duplikat:
   - `register-free-event-order` – sprawdza po `email` LUB `user_id` ze statusem `IN (awaiting_email_confirmation, confirmed, paid, completed)`. Pomija `cancelled`, więc po samym anulowaniu powinno działać. Po usunięciu (`admin-delete-event-order` robi `DELETE`) – też.
   - `register_event_guest` (RPC, dla webinarów/wydarzeń z formularzem gościa) – używa unikalnego indeksu `unique_guest_per_event` z `WHERE status <> 'cancelled'`.
   
   Najbardziej prawdopodobne źródło problemu: po stronie **paid_event_orders** anulowanie ustawia `status='cancelled'`, ale w **innej tabeli powiązanej** (`event_registrations` / `event_form_submissions` / `guest_event_registrations`) wpis nie jest cofnięty, więc kolejna próba uderza w stary wpis. Wymaga potwierdzenia od użytkownika.

## Plan zmian

### A. Duplikowanie pól na szablonie biletu — `EventTicketTemplatePanel.tsx`

1. Rozszerzyć `FieldDef` o `id: string` (unikalny instance ID) obok dotychczasowego `key` (typ pola wskazujący do `FIELD_LABELS`/`SAMPLE_VALUES`).
2. **Migracja zgodna wstecznie** w `useEffect` ładującym szablon: dla pól bez `id` ustawić `id = `${key}-${index}`` przy wczytaniu — istniejące szablony działają jak dotąd, a po pierwszym zapisie zyskują stabilne `id`.
3. Wszystkie operacje (`selectedField`, `beginDrag`, `updateField`, `removeField`, `tpl.fields.find/map/filter`, klucz w JSX, drag/resize) zmienić z `f.key` na `f.id`.
4. `addField(typeKey)`:
   - Usunąć guard „już istnieje".
   - Generować `id = crypto.randomUUID()` (lub `${typeKey}-${Date.now()}`).
   - Jeśli istnieje już pole tego typu, przesunąć nową instancję o `+20px` w X i Y, żeby nie nakładała się idealnie.
5. **Legenda** (tabela w `Card` na dole):
   - Zawsze pokazywać przycisk „+ Dodaj" (a nie „na płótnie"), z licznikiem instancji w nawiasie, np. „+ Dodaj (×2)" gdy już są dwie.
6. **Nagłówek karty edycji wybranego pola** (`<CardTitle>` z `FIELD_LABELS[selected.key]`): gdy istnieje >1 instancja danego typu, dopisać numer „(#n)" według kolejności w `tpl.fields`.
7. **Backend (`generate-event-ticket-pdf/index.ts`)**: bez zmian. Funkcja iteruje `template.fields` i renderuje każde pole osobno, używając `f.key` tylko do pobrania wartości — dwa pola z tym samym `key` w różnych miejscach wyrenderują tę samą wartość w dwóch miejscach. To jest dokładnie pożądane zachowanie. JSONB `fields` jest elastyczny i dodatkowe `id` przejdzie bez migracji DB.

### B. Podgląd PDF — `EventTicketTemplatePanel.tsx`

W bloku Dialog → preview:

1. Zamiast surowego `<iframe src={previewUrl}>` użyć **`<object data={previewUrl} type="application/pdf">`** z fallbackiem `<embed>` i komunikatem „Twoja przeglądarka nie obsługuje podglądu PDF — kliknij «Otwórz w nowej karcie»".
2. Dodatkowo, w `preview()`, oprócz `URL.createObjectURL(blob)` zachować również **base64 data URL** (`data:application/pdf;base64,...`) i użyć go w `<object>`/`<embed>` — Edge w wielu przypadkach blokuje `blob:` w iframe, ale akceptuje `data:` w `<object>`. Blob URL pozostaje dla przycisków „Otwórz w nowej karcie" / „Pobierz".
3. Dodać prosty timer (`setTimeout 1500`): jeśli `<object>` nie wyrenderował się (brak natywnego viewer'a), pokazać przyjazny komunikat z przyciskiem CTA do „Otwórz w nowej karcie". Można to wykryć heurystycznie po `onError` na `<object>`.

### C. Ponowna rejestracja po anulowaniu + usunięciu

Po doprecyzowaniu scenariusza (poniżej) — zakładam, że problemem są wpisy „pomocnicze" pozostające po anulowaniu:

1. **`admin-cancel-event-order`** — gdy `paid_event_orders.status` przechodzi w `cancelled`, dodatkowo:
   - Zaktualizować odpowiadające wpisy w `event_registrations` (gdy `user_id` istnieje) i/lub `guest_event_registrations` (gdy gość) ustawiając `status='cancelled', cancelled_at=now()`. Powiązanie po `event_id` + `email`/`user_id` + ewentualnie `slot_time`.
2. **`admin-delete-event-order`** — przed `DELETE` z `paid_event_orders` także skasować/anulować analogiczne wpisy w `event_registrations`/`guest_event_registrations`.
3. **Dup-check w `register-free-event-order`** — pozostawić bez zmian (już jest poprawny).
4. **`register_event_guest` (RPC)** — pozostawić; unikalny indeks już wyklucza `cancelled`. Jeśli okaże się, że błąd dotyczy webinarów (innej ścieżki niż paid_event_orders), zmienić RPC tak, by w bloku `EXCEPTION WHEN unique_violation` najpierw sprawdzała czy istniejący wpis ma `status='cancelled'` i wówczas robiła `UPDATE` (reaktywacja) zamiast zwracać `already_registered`.

### D. Weryfikacja

1. Szablon: dodać dwa razy „Imię" i dwa razy „Kod QR", przeciągnąć w różne miejsca, zapisać. Podgląd PDF powinien pokazać duplikaty.
2. Podgląd PDF: otworzyć w Edge — w `<object>` powinno wyświetlić się PDF; w razie braku natywnego viewer'a pokazać CTA „Otwórz w nowej karcie".
3. Re-rejestracja: anulować + usunąć zamówienie, zarejestrować ponownie tym samym e-mailem — powinna powstać nowa rezerwacja.

## Pytania kontrolne (przed punktem C)

Aby nie zmieniać niewłaściwej ścieżki, potrzebuję 1 szybkiego potwierdzenia:

- W którym dokładnie miejscu kliknąłeś „Anuluj" i „Usuń"? Lista zamówień w `/admin?tab=paid-events` (`paid_event_orders` – panel właściciela wydarzenia), czy lista uczestników po stronie organizatora (`EventRegistrationsManagement`)? I czy rejestracja, której nie można powtórzyć, idzie przez formularz publiczny biletu (free/paid), czy formularz gościa webinarowego?

Jeśli odpowiedź to „panel zamówień + ponowna rejestracja przez publiczny formularz biletu", wystarczy część C.1 + C.2. Jeśli „webinar/formularz gościa", konieczna jest też zmiana RPC C.4.

## Czego nie zmieniam

- Generowania PDF (układ, fonty, skalowanie) — to było rozwiązane wcześniej i działa zgodnie z edytorem.
- Treści maili, SMTP, kodów QR.
- Schematu tabel — tylko dodatki w SQL gdy potrzeba (cancel triggers).
