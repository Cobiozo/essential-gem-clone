

# Naprawa emaili auto-webinarowych + publiczny dostęp do pokoju

## Problemy

1. **Email**: Gdy `minutesToNextSlot > 15`, auto-webinar używa generycznego szablonu BEZ linku do pokoju. Zamiast tego pokazuje "Pokój otworzy się 5 minut przed" bez żadnego przycisku. Przy jeszcze większych czasach — może użyć szablonu DB z tekstem "wyślemy powiadomienie 24h i 1h przed", co nie ma sensu dla auto-webinarów.

2. **Brak publicznej strony oglądania**: Link w emailu prowadzi do `/e/{slug}`, co jest resolverem → redirect do formularza rejestracji. Gość, który się już zarejestrował, nie ma jak dołączyć do webinaru. Trasa `/auto-webinar` wymaga logowania (DashboardLayout).

## Rozwiązanie

### 1. Edge function `send-webinar-confirmation` — zawsze link dla auto-webinarów

Zmienić logikę: dla auto-webinarów ZAWSZE (niezależnie od `minutesToNextSlot`) wysyłać email z przyciskiem "Dołącz teraz" i linkiem do publicznej strony pokoju. Różnicować jedynie tekst: "za X minut" vs "w wyznaczonym terminie".

### 2. Nowa publiczna strona: `/auto-webinar/watch/:slug`

Utworzyć publiczną stronę (bez DashboardLayout, bez wymaganego logowania) wyświetlającą `AutoWebinarEmbed`. Gość po kliknięciu "Dołącz teraz" w emailu trafia na tę stronę i ogląda webinar.

### 3. Redirect w `/e/:slug` dla zarejestrowanych gości

Zmodyfikować `EventRegistrationBySlug` — jeśli event to `auto_webinar` i nie ma parametru `ref` (nie jest to link zaproszeniowy), przekierować na publiczną stronę oglądania zamiast na formularz rejestracji.

### 4. Aktualizacja linku w emailu

Zmienić `roomLink` w `EventGuestRegistration.tsx` z `/e/{slug}` na `/auto-webinar/watch/{slug}`.

## Pliki do zmiany/utworzenia

| Plik | Zmiana |
|---|---|
| `supabase/functions/send-webinar-confirmation/index.ts` | Zawsze dołączaj link do pokoju dla auto-webinarów, nie tylko ≤15 min |
| `src/pages/AutoWebinarPublicPage.tsx` | **NOWY** — publiczna strona z playerem auto-webinaru |
| `src/App.tsx` | Dodaj trasę `/auto-webinar/watch/:slug` |
| `src/components/profile/ProfileCompletionGuard.tsx` | Dodaj `/auto-webinar/watch/` do PUBLIC_PATHS i KNOWN_APP_ROUTES |
| `src/pages/EventGuestRegistration.tsx` | Zmień `roomLink` na `/auto-webinar/watch/{slug}` |
| `src/pages/EventRegistrationBySlug.tsx` | Dla auto-webinarów bez `ref` → redirect do strony oglądania |

## Szczegóły techniczne

### Publiczna strona (`AutoWebinarPublicPage`)
- Odczytuje slug → pobiera event → pobiera config i wideo z `auto_webinar_config` / `auto_webinar_videos`
- Renderuje `AutoWebinarEmbed` w minimalnym layoucie (logo + player)
- Nie wymaga logowania — RLS na tabelach auto_webinar jest publiczny (read)
- Jeśli nie trwa żadna sesja — pokazuje countdown do następnego slotu

### Logika emaila (uproszczona)
```
if (isAutoWebinar && roomLink) {
  // ZAWSZE wysyłaj email z przyciskiem "Dołącz teraz"
  // Różnicuj tekst: ≤15 min = "za chwilę!", >15 min = "w wyznaczonym terminie"
}
```

