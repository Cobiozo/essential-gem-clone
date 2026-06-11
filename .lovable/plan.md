# Formularz rejestracji — prefiks telefonu z flagą + przeniesienie CTA

Zmiany dotyczą publicznego formularza rejestracji na wydarzenie (`src/pages/EventFormPublicPage.tsx`) — ten sam ekran, który jest na zrzucie ("Rejestracja na Business Opportunity Meeting w Łodzi").

## 1. Pole „Telefon" z prefiksem kraju + flagą

Obecnie to zwykły `<Input type="tel">` z placeholderem `+48...`. Podmienimy go na istniejący w projekcie komponent `PhoneInputWithPrefix` (`src/components/ui/phone-input-prefix.tsx`), który jest już używany m.in. w `EventGuestRegistration.tsx` i pokazuje:
- selektor kraju z małą flagą i prefiksem (np. 🇵🇱 +48),
- pole na pozostałe cyfry numeru,
- pełną listę krajów (Europa + reszta świata) z odpowiednimi prefiksami E.164,
- domyślnie Polska (+48).

Wartość zapisywana do bazy pozostaje w formacie E.164 (`+48555777888`) — czyli kompatybilna z dotychczasową kolumną telefonu i z walidacją po stronie edge function `submit-event-form` (`_phone`).

## 2. Przeniesienie przycisku „Dowiedz się więcej na temat wydarzenia"

Obecnie przycisk jest na samym dole, pod „Rezerwuję miejsce". Przeniesiemy go do góry karty formularza, w blok z tytułem i datą:

```text
Tytuł formularza (Rejestracja na BOM w Łodzi)
📅 Data (04 lipca 2026 12:00)
📍 Lokalizacja (jeśli jest)
[ Dowiedz się więcej na temat wydarzenia ]   ← tu, jako outline button
— opis wydarzenia —
```

Warunek wyświetlania bez zmian (`event?.slug` musi istnieć). Przycisk znika z dołu formularza. Styl bez zmian (`variant="outline"`, pełna szerokość).

## Pliki do zmiany

- `src/pages/EventFormPublicPage.tsx`
  - import `PhoneInputWithPrefix`
  - podmiana `<Input type="tel" ...>` na `<PhoneInputWithPrefix value={phone} onChange={setPhone} />`
  - przeniesienie bloku `{event?.slug && <Button>Dowiedz się więcej…</Button>}` z końca formularza pod blok daty/lokalizacji, przed `{form.description && <p>...}`.

Brak zmian w backendzie, schemacie ani innych formularzach.
