## Problem

Podgląd w edytorze (`EventEditorPreview.tsx`) renderuje WŁASNE karty biletów (`<Card>` z `Ticket` ikoną, badge "Goście/Zalogowani", `formatPrice(price_pln)` itd.), które wyglądają zupełnie inaczej niż prawdziwa strona publiczna (`PaidEventSidebar`). Stąd rozbieżność: na podglądzie są dwa pionowe kafelki z benefitami, a na realnej stronie jest jeden box `Rejestracja` z licznikiem, wyborem biletu, sekcją „Cena zawiera" i przyciskiem „Zapisz się".

Dodatkowo:
- Brakuje przełącznika „Widok partnera" (zalogowany użytkownik).
- Filtr `audience` w publicznej stronie ma niuans: `guest_only` widoczne tylko gdy w URL jest `?ref=...` (link partnerski). W podglądzie symulujemy to jako „gość = zalogowany niezalogowany z linku partnerskiego" — czyli widzi `all` + `guest_only`. Partner widzi `all` + `logged_in`.

## Fix (tylko UI podglądu)

**Plik:** `src/components/admin/paid-events/editor/EventEditorPreview.tsx`

1. Dodać tryb `'partner'` do `EditorPreviewMode` w `PaidEventEditorLayout.tsx` i trzeci `ToggleGroupItem` „Widok partnera" (ikonka `User`).

2. W `EventEditorPreview.tsx`:
   - Usunąć własne renderowanie kart biletów z prawej kolumny.
   - Zamiast tego użyć tego samego komponentu co publiczna strona: `PaidEventSidebar` (z `@/components/paid-events/public/PaidEventSidebar`), zmapować bilety do jego kształtu (`id, name, price = price_pln/100, description, benefits, highlightText, isFeatured, available, isFree`).
   - Filtr `audience` per tryb:
     - `admin` → wszystkie bilety (z małymi badge'ami audience nad sidebar, żeby admin wiedział kto co widzi).
     - `guest` → `audience IN ('all','guest_only')`.
     - `partner` → `audience IN ('all','logged_in')`.
   - `onPurchase` w podglądzie = no-op (lub toast „Podgląd — akcja niedostępna").
   - Komunikat gdy 0 biletów po filtrze: dla gościa „Niezalogowany gość nie zobaczy żadnego biletu", dla partnera „Zalogowany użytkownik nie zobaczy żadnego biletu", dla admina „Brak biletów. Dodaj pierwszy w zakładce Bilety".

3. Sekcje CMS i bloki (opis/prelegenci/bilety):
   - Filtry `guests_show_*` i `visible_to_guests` działają **tylko** w trybie `guest`. W trybach `admin` i `partner` pokazujemy wszystko (partner to zalogowany użytkownik — widzi pełną treść).

4. Banner u góry podglądu:
   - `admin` → „Podgląd strony wydarzenia — /events/{slug}"
   - `guest` → „Podgląd: niezalogowany gość…"
   - `partner` → „Podgląd: zalogowany partner — widzi pełną treść strony"

## Co NIE zmieniamy

- Bez zmian w `PaidEventSidebar`, `PaidEventPage`, edge functions, DB.
- Bez zmian w `EventTicketsPanel`.

## Efekt

Podgląd 1:1 odpowiada temu, co realnie zobaczy gość / partner na `/events/{slug}` — ten sam komponent sidebar, ten sam układ, ten sam format cen, ten sam CTA. Admin może przełączać trzy widoki: edytora (wszystko), gościa, partnera.
