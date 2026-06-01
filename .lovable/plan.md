## Cel
Zamiast otwierać `/ticket/{kod}` w nowej karcie, przycisk „Otwórz bilet (QR)" ma otwierać prosty modal pokazujący wyłącznie:
- kod QR przypisany do tego biletu (`qrCode` = `attendee.ticket_code` lub `order.ticket_code`)
- numer biletu (ten sam kod jako tekst pod QR)

Bez żadnych dodatkowych informacji (bez tytułu wydarzenia, daty, danych uczestnika, przycisków pobierania itp.).

## Zmiana
Plik: `src/components/paid-events/MyEventTicketsInline.tsx`

1. Dodać lokalny stan `qrDialogCode: string | null`.
2. Przycisk „Otwórz bilet (QR)" (linie 305–314) — zamiast `window.open(...)` ustawia `setQrDialogCode(qrCode)`.
3. Na końcu komponentu wyrenderować jeden `<Dialog>` (shadcn) sterowany przez `qrDialogCode`:
   - `DialogContent` w stylu spójnym z resztą aplikacji (tło `bg-background`, ramka `border-border`),
   - środek: białe tło + `QRCodeSVG` (z `qrcode.react`, używane już w `ReflinkQRCode`) o rozmiarze ~256, `level="H"`, `includeMargin`,
   - pod QR: monospaced numer biletu (`qrDialogCode`) — `font-mono`, `tracking-wider`, do skopiowania,
   - brak innych elementów (tytuł dialogu ukryty wizualnie dla a11y: `<DialogTitle className="sr-only">Bilet</DialogTitle>`).

## Co pozostaje bez zmian
- Strona `/ticket/:code` (`TicketPage.tsx`) nie jest usuwana — nadal działa jako pełny widok bilet/skan dla weryfikatorów.
- Logika QR/`qrCode` i warunek `canShowQR` bez zmian.
- Żadne edge functions, RLS ani schemat DB nie są ruszane.
