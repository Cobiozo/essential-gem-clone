## Problem 1 — Banner rozciągnięty na całą szerokość

Na publicznej stronie eventu (`/events/:slug`) sekcja `PaidEventHero` używa `w-full` (full bleed), więc baner ciągnie się od krawędzi do krawędzi okna. Treść poniżej jest zamknięta w `container mx-auto px-4`, więc baner wizualnie wystaje poza tekst.

### Fix
W `src/components/paid-events/public/PaidEventHero.tsx` zawinąć kafelek z banerem w ten sam wrapper kontenera, którego używa reszta strony, oraz zaokrąglić rogi:

```text
<section> 
  └── <div className="container mx-auto px-4 pt-6">
      └── <div className="relative w-full aspect-… rounded-2xl overflow-hidden …">
          ├── <img …/>
          ├── gradient overlay
          ├── back-button overlay (pozycjonowany absolutnie wewnątrz banera)
          └── bottom content overlay (tytuł, data, lokalizacja)
```

Zmiany:
1. Owinąć blok banera (linie 109–173 obecnego pliku) w `<div className="container mx-auto px-4 pt-6 md:pt-8">`.
2. Dodać do wewnętrznego kafelka klasy `rounded-2xl shadow-sm` aby wizualnie pasował do reszty layoutu.
3. Dla wariantu „bez baneru" pozostawić obecny układ z `container` (już jest ok).

Efekt: lewa i prawa krawędź banera będą równe z lewą/prawą krawędzią tekstu w sekcjach poniżej.

---

## Problem 2 — Linki potwierdzenia / anulowania w mailu prowadzą do logowania

### Diagnoza
Sprawdziłem wersję produkcyjną pod `https://purelife.lovable.app/event-form/cancel/<token>`: zwraca **stronę logowania**, a nie kreator potwierdzenia. Powód: produkcja nie ma jeszcze wgranych ostatnich zmian, w tym:

- Wpisu `/event-form/` w `PUBLIC_PATHS` w `ProfileCompletionGuard.tsx` (dodanego w naprawie sprzed kilku iteracji).
- Wpisów `verify_jwt = false` dla `confirm-event-form-email`, `cancel-event-form-submission`, `send-event-form-confirmation` w `supabase/config.toml`.
- Tras `/event-form/confirm/:token` i `/event-form/cancel/:token` w `App.tsx` (jeśli były dodane po ostatniej publikacji).

W rezultacie nieautoryzowany gość, który klika link w mailu, trafia do `ProfileCompletionGuard`, który (w starej wersji bez `/event-form/`) traktuje ścieżkę jako chronioną i przekierowuje na `/auth`.

W środowisku **preview** (najnowszy kod) trasy działają poprawnie — funkcje edge zwracają `200 OK` i mają wpis `verify_jwt = false`.

### Fix
1. Zweryfikować, że w `App.tsx` istnieją oba routy: `/event-form/confirm/:token` i `/event-form/cancel/:token` (są — linie 417–418).
2. Zweryfikować, że `ProfileCompletionGuard.tsx` ma `/event-form/` w `PUBLIC_PATHS` (jest — linia 30).
3. Zweryfikować `supabase/config.toml` — wpisy są (linie 285–292).
4. **Opublikować projekt** (Publish) — bez tego produkcja nie zobaczy żadnej z tych zmian. Po publikacji link z maila otworzy stronę potwierdzenia/anulowania zamiast loginu.
5. Po publikacji ponownie wysłać sobie testowy mail (lub poprosić Jana o ponowne kliknięcie linku anulującego) i sprawdzić, że:
   - `/event-form/confirm/<token>` → ekran „Twoje dane i rejestracja zostały poprawnie potwierdzone".
   - `/event-form/cancel/<token>` → ekran z przyciskiem „Tak, anuluj rejestrację" → po kliknięciu komunikat sukcesu i automatyczne powiadomienie do admina + partnera (kod edge-funkcji już to robi).

### Dodatkowe wzmocnienie (zapobieganie)
Aby ten sam problem nie powtarzał się przy każdej kolejnej publikacji ścieżek publicznych, dopisać krótki komentarz w `ProfileCompletionGuard.tsx` przy `PUBLIC_PATHS`: „Pamiętaj o publikacji po dodaniu ścieżki publicznej — w przeciwnym razie produkcja przekieruje na /auth.".

---

## Pliki

- `src/components/paid-events/public/PaidEventHero.tsx` — zawinięcie banera w `container mx-auto px-4`, dodanie `rounded-2xl shadow-sm`.
- `src/components/profile/ProfileCompletionGuard.tsx` — komentarz przy `PUBLIC_PATHS`.
- (Brak zmian w edge-funkcjach i `config.toml` — są poprawne, wymagana tylko publikacja.)

## Po wdrożeniu — akcja użytkownika

Po zatwierdzeniu i wgraniu zmian: **opublikuj projekt** (przycisk Publish), następnie wykonaj test linku z maila. Bez publikacji druga część poprawki (cancel/confirm na produkcji) nie zacznie działać.