

# Fix: Brak komunikatu gdy materiał wideo nie ma pliku

## Problem
Materiał "Cichy zabójca — przewlekłe stany zapalne" ma `media_url = null` w bazie. Strona odtwarzacza (`HealthyKnowledgePlayer`) przekazuje `material.media_url!` z non-null assertion do `SecureMedia`, co powoduje crash lub pusty ekran. Brak jakiegokolwiek komunikatu dla użytkownika.

## Zmiany

### 1. `src/pages/HealthyKnowledgePlayer.tsx`
Dodać warunek po sprawdzeniu `!material` — jeśli `material` istnieje, ale `media_url` jest null/pusty, wyświetlić czytelny komunikat:

- Ikona + tekst: "Ten materiał nie zawiera jeszcze pliku wideo/audio. Skontaktuj się z administratorem lub wróć do listy."
- Przycisk "Wróć do listy" → `/zdrowa-wiedza`

### 2. `src/pages/HealthyKnowledge.tsx` (lista materiałów)
Na karcie materiału, gdy `content_type` to `video`/`audio` ale `media_url` jest null — nie pokazywać przycisku Play (lub pokazać z etykietą "Wkrótce"). Zapobiegnie to nawigowaniu do odtwarzacza bez pliku.

