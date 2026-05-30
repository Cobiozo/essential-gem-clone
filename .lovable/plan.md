# Plan: Dokończenie systemu płatności PayU + biletów PDF

## Zakres pozostały do realizacji

### 1. `src/pages/TicketPage.tsx` (publiczna strona biletu)
- Route: `/ticket/:code` (publiczna, bez auth)
- Pobiera dane zamówienia + uczestników po `access_code`
- Pokazuje: status płatności, dane wydarzenia, listę uczestników z linkami do PDF
- Dla statusu `pending_transfer`: instrukcje przelewu (nr konta, tytuł, kwota)
- Dla statusu `paid`: przyciski "Pobierz bilet PDF" (signed URL z bucketu)
- Dla statusu `failed/cancelled`: komunikat + link do ponowienia
- Auto-refresh co 10s gdy `processing` (PayU polling)

### 2. `src/components/admin/events/EventTicketTemplatePanel.tsx`
- Tab w panelu edycji eventu (`/admin/events/:id`)
- Upload PNG/JPG do `event-tickets/templates/{eventId}/bg.{ext}` (max 5MB)
- Canvas z tłem + drag&drop pól: Imię, Nazwisko, Numer biletu, QR, Data, Lokalizacja, Tytuł, Miejsce
- Per pole: x, y, fontSize, color, textAlign, fontWeight (QR tylko x/y/size)
- Wybór formatu: A4, A5, custom (mm)
- Zapis JSON do `event_ticket_templates.fields` + `background_url`
- Przycisk "Wygeneruj testowy bilet" → wywołuje `generate-event-ticket-pdf` z `test=true`

### 3. Routing & Guards (`src/App.tsx`)
- Dodanie publicznych ścieżek: `/ticket/:code`, `/checkout/:orderId`
- Dodanie `/checkout/:orderId` do `PUBLIC_PATHS` (lub jako auth-aware: działa dla guestów i zalogowanych)
- `/admin/payments` → tylko `admin` role
- Dodanie `/ticket/:code` do `KNOWN_APP_ROUTES`
- `ProfileCompletionGuard` pomija `/ticket/*`, `/checkout/*`, `/admin/payments`

### 4. Refactor `PurchaseDrawer.tsx`
- Usunięcie wyboru metody płatności z drawera
- Drawer zbiera tylko: buyer (imię, nazwisko, email, telefon) + attendees (lista) + zgody
- Submit → wywołuje `create-event-order` → otrzymuje `orderId` → `navigate('/checkout/'+orderId)`
- Loading state + obsługa błędów (slot full, registration closed, duplicate)

### 5. Patch `payu-webhook/index.ts`
- Po update statusu na `COMPLETED` → wywołanie `generate-event-ticket-pdf` (service role) dla każdego attendee
- Po wygenerowaniu PDF → wywołanie `send-event-ticket-email`
- Idempotencja: sprawdza czy PDFy już istnieją (`ticket_pdf_url IS NOT NULL`)

### 6. Patch `admin-mark-event-payment/index.ts`
- Po oznaczeniu przelewu jako opłacony → te same kroki co webhook (PDF + email)
- Idempotencja jw.

### 7. Nowa funkcja `send-event-ticket-email/index.ts`
- Input: `{ orderId }`
- Pobiera order + attendees + event
- Per uczestnik: email z załączonym PDF (lub linkiem signed URL 7 dni) + linkiem do `/ticket/:code`
- Buyer: osobny email "podsumowanie zamówienia" z listą uczestników i linkiem
- Branding wg `email-system-technical-governance` (SMTP, szablon)

### 8. Drobne poprawki
- `src/pages/EventDetailPage.tsx` / komponent z PurchaseDrawer: ścieżka po sukcesie zmieniona na `/checkout/:orderId`
- Dodanie linku "Płatności PayU" w sidebar admina (`AdminSidebar.tsx`)
- Hook `useTicketTemplate(eventId)` do pobierania templatu (cache)

## Szczegóły techniczne

### Format `event_ticket_templates.fields` (JSONB)
```json
{
  "format": "A4",
  "width_mm": 210,
  "height_mm": 297,
  "fields": [
    { "key": "first_name", "x": 50, "y": 100, "fontSize": 24, "color": "#000", "align": "left", "weight": "bold" },
    { "key": "last_name", "x": 50, "y": 130, "fontSize": 24, "color": "#000" },
    { "key": "ticket_number", "x": 50, "y": 200, "fontSize": 14 },
    { "key": "qr", "x": 400, "y": 100, "size": 100 },
    { "key": "event_date", "x": 50, "y": 250, "fontSize": 16 },
    { "key": "location", "x": 50, "y": 280, "fontSize": 14 },
    { "key": "event_title", "x": 50, "y": 70, "fontSize": 28, "weight": "bold" }
  ]
}
```

### Przepływ statusów zamówienia
```text
created → (PayU redirect) → processing → COMPLETED → paid → [PDF gen + email]
created → (BLIK 6-cyfr) → processing → COMPLETED → paid → [PDF gen + email]
created → (przelew) → pending_transfer → [admin oznacza] → paid → [PDF gen + email]
```

### Bezpieczeństwo
- `/ticket/:code` używa `access_code` (32-znakowy, gen_random_uuid w bazie) — nie da się zgadnąć
- Signed URL do PDF: 7 dni TTL
- `generate-event-ticket-pdf`: tylko service_role (wywoływane przez webhook/admin)
- `send-event-ticket-email`: tylko service_role

## Pliki do utworzenia (8)
- `src/pages/TicketPage.tsx`
- `src/components/admin/events/EventTicketTemplatePanel.tsx`
- `src/hooks/useTicketTemplate.ts`
- `supabase/functions/send-event-ticket-email/index.ts`

## Pliki do edycji (5)
- `src/App.tsx` (routing + PUBLIC_PATHS + KNOWN_APP_ROUTES)
- `src/components/events/PurchaseDrawer.tsx` (usunięcie wyboru metody, redirect)
- `src/components/admin/AdminSidebar.tsx` (link Płatności PayU)
- `supabase/functions/payu-webhook/index.ts` (trigger PDF + email)
- `supabase/functions/admin-mark-event-payment/index.ts` (trigger PDF + email)

Po akceptacji wykonam wszystko w jednym przebiegu i zweryfikuję buildem.
