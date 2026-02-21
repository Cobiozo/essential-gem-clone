
# Naprawa bledu wyswietlania blednej klatki wideo przy przelaczaniu lekcji

## Problem

Przy przechodzeniu miedzy lekcjami w module szkoleniowym (Akademia), odtwarzacz wideo przez chwile wyswietla pierwsza klatke INNEJ lekcji niz ta aktualnie wybrana. Na przyklad: uzytkownik wybiera "Kuracja 6 miesieczna" (2:42), ale widzi miniature "Certyfikaty i badania".

## Analiza przyczyn

Zidentyfikowalem dwa wspoldzialajace zrodla problemu:

### 1. Prefetch `<link>` zanieczyszcza cache przegladarki
W `TrainingModule.tsx` (linie 476-511) istnieje mechanizm prefetch, ktory tworzy element `<link rel="prefetch" href={url} as="video">` z surowym `media_url` nastepnej lekcji. To powoduje, ze przegladarka laduje dane wideo nastepnej lekcji do swojej pamieci podrecznej. Gdy uzytkownik przechodzi do kolejnej lekcji, przegladarka moze chwilowo wyswietlic zakeszowana klatke z innego wideo zanim zaladuje poprawny plik.

Problem jest szczegolnie widoczny dla filmow z `purelife.info.pl`, gdzie prefetch uzywa surowego URL (ktory nie dziala bez tokena), ale cache przegladarki moze interferowac z poprawnymi podpisanymi URL-ami.

### 2. Element `<video>` renderuje sie przed zaladowaniem nowego zrodla
Gdy komponent `SecureMedia` montuje sie ponownie (dzieki `key={currentLesson.id}`), `<video>` element jest renderowany natychmiast po rozwiazaniu `signedUrl`. Przegladarka moze przez ulamek sekundy wyswietlic zakeszowana klatke z poprzedniego wideo z tej samej domeny, zanim zaladuje nowe metadane.

## Plan naprawy

### Zmiana 1: Usunac prefetch nastepnej lekcji z TrainingModule.tsx

Usunac caly blok `useEffect` (linie 476-511) odpowiedzialny za tworzenie `<link rel="prefetch">`. Ten mechanizm:
- Nie dziala poprawnie dla chronionych URL-i (purelife.info.pl wymaga tokena)
- Zanieczyszcza cache przegladarki danymi z innej lekcji
- Jest glowna przyczyna wyswietlania blednych klatek

### Zmiana 2: Ukryc element `<video>` do momentu zaladowania danych nowego wideo

W komponencie `SecureMedia.tsx` dodac stan `videoReady` (domyslnie `false`), ktory przechodzi na `true` dopiero po zdarzeniu `loadeddata` na nowym elemencie `<video>`. Do tego momentu element wideo bedzie ukryty (`opacity: 0` / `visibility: hidden`), a w jego miejscu bedzie widoczny placeholder ladowania. Dzieki temu uzytkownik nigdy nie zobaczy starej klatki.

Konkretnie:
- Dodac `const [videoReady, setVideoReady] = useState(false)` obok istniejacych stanow
- Resetowac `videoReady` na `false` przy zmianie `signedUrl`
- Ustawic `videoReady = true` przy zdarzeniu `loadeddata` na elemencie video
- Dodac `style={{ opacity: videoReady ? 1 : 0 }}` na elementach `<video>` (3 sciezki renderowania: secure, restricted, full controls)
- Wyswietlac istniejacy spinner/placeholder gdy `!videoReady`

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/pages/TrainingModule.tsx` | Usunac useEffect prefetch (linie 476-511) |
| `src/components/SecureMedia.tsx` | Dodac stan `videoReady`, ukryc video do momentu `loadeddata` |

## Wplyw na istniejacy kod

- Usuwany prefetch nie wplywat pozytywnie na wydajnosc (nie dzialal dla chronionych URL-i)
- Ukrywanie video do `loadeddata` moze spowodowac minimalne opoznienie (ulamki sekundy) w wyswietlaniu nowego wideo, ale eliminuje wizualny blad
- Nie narusza logiki postepow, zapisywania pozycji ani kontrolek odtwarzacza
- Nie wymaga zmian w bazie danych ani Edge Functions
