

# Plan: Rozszerzenie Service Workera o cache API i poprawe wydajnosci platformy

## Obecny stan

- **Service Worker (`sw-push.js`)**: Obsluguje tylko push notifications i cachuje 3 pliki statyczne (manifest, ikony PWA). Nie cachuje zadnych zasobow aplikacji ani odpowiedzi API.
- **Cookie Consent (`useCookieConsent.ts`)**: Przy kazdym ladowaniu strony wykonuje 3 zapytania do Supabase (`cookie_consent_settings`, `cookie_banner_settings`, `cookie_categories`), nawet jesli uzytkownik juz wyrazil zgode.
- **Aplikacja**: Brak cache'owania odpowiedzi API, brak offline fallback, brak precache zasobow Vite.

## Zmiany

### 1. Rozszerzenie Service Workera (`public/sw-push.js`)

Dodanie trzech nowych strategii cache'owania do istniejacego fetch handlera:

**a) Cache zasobow Vite (JS/CSS z hashem)**
- Pliki typu `/assets/index-abc123.js` sa immutable (hash w nazwie = nowa wersja = nowa nazwa)
- Strategia: cache-first — raz pobrany, serwowany z cache na zawsze
- Wzorzec: `url.pathname.startsWith('/assets/') && url.pathname.match(/\.[a-f0-9]{8,}\./)`

**b) Cache odpowiedzi Supabase API dla cookie consent**
- Endpointy: `rest/v1/cookie_consent_settings`, `rest/v1/cookie_banner_settings`, `rest/v1/cookie_categories`
- Strategia: stale-while-revalidate — natychmiast zwraca wersje z cache, w tle pobiera swiezą
- Cache name: `purelife-api-v1` (oddzielny od statycznego)
- TTL: 24h (cookie settings zmieniaja sie rzadko)

**c) Cache czcionek Google Fonts**
- Pliki z `fonts.googleapis.com` i `fonts.gstatic.com`
- Strategia: cache-first z TTL 30 dni
- Cache name: `purelife-fonts-v1`

**d) Czyszczenie starych cache'ow**
- W `activate` event: usuwanie cache'ow o nieaktualnych nazwach (juz istnieje, rozszerzenie o nowe nazwy)

### 2. Optymalizacja hooka cookie (`src/hooks/useCookieConsent.ts`)

**Dodanie warstwy cache w localStorage:**
- Zapisywac pobrane `settings`, `bannerSettings` i `categories` w localStorage z timestampem
- Przy starcie: ladowac natychmiast z localStorage (brak blysku/opoznienia), potem w tle odswiezac z Supabase
- Jesli dane w localStorage sa mlodsze niz 1h — nie pytac Supabase w ogole
- Efekt: banner cookie pojawia sie natychmiast, bez czekania na 3 zapytania API

Schemat:
```text
PRZED:
  Mount -> 3x fetch Supabase -> render banner (opoznienie 200-500ms)

PO:
  Mount -> localStorage (natychmiastowy) -> render banner
         -> w tle: fetch Supabase -> porownaj -> aktualizuj jesli zmienione
```

### 3. Rejestracja Service Workera przy starcie aplikacji (`src/main.tsx`)

Obecnie SW jest rejestrowany tylko gdy uzytkownik wlacza push notifications (`usePushNotifications.ts`). Przeniesienie rejestracji do `main.tsx` tak, aby SW dzialal od razu:
- Rejestracja warunkowa: tylko w przegladarce (nie SSR)
- Nie blokuje renderowania aplikacji (asynchroniczna)
- Obsluga aktualizacji: `SKIP_WAITING` dla nowych wersji SW

### 4. Precache rozszerzony (`public/sw-push.js`)

Rozszerzenie listy `STATIC_ASSETS` o dodatkowe zasoby:
- `/favicon.ico`
- `/pwa-maskable-512.png`

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `public/sw-push.js` | Rozszerzenie fetch handlera o cache JS/CSS, API cookie, fonty |
| `src/hooks/useCookieConsent.ts` | Dodanie warstwy localStorage cache dla ustawien cookie |
| `src/main.tsx` | Dodanie automatycznej rejestracji SW przy starcie aplikacji |

## Oczekiwany efekt

- **Cookie banner**: Pojawia sie natychmiast (z localStorage) zamiast po 200-500ms (po 3 zapytaniach API)
- **Powtorne wizyty**: Zasoby JS/CSS ladowane z cache SW — szybsze ladowanie o 50-70%
- **Fonty**: Ladowane z cache — eliminacja FOUT (Flash of Unstyled Text)
- **Mniejsze obciazenie Supabase**: Cookie settings pobierane max raz na godzine zamiast przy kazdym ladowaniu
- **PWA**: SW aktywny od startu, nie tylko po wlaczeniu push notifications

