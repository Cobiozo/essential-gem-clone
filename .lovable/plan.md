

# Pelne pokrycie pauzy wideo na Apple platforms (macOS, iPhone, iPad)

## Obecny stan

Aktualnie mamy dwa eventy:
- `visibilitychange` — dziala na desktop i wiekszosc mobilnych
- `window blur` — fallback dla przelaczania aplikacji

## Problem na iOS/iPadOS

Na urzadzeniach Apple sa dodatkowe scenariusze ktore moga nie wyzwalac powyzszych eventow:

1. **iOS Safari — app switcher (swipe up)**: moze emitowac `pagehide` zamiast `visibilitychange`
2. **iOS PWA (standalone mode)**: przejscie do innej aplikacji czesto wyzwala tylko `pagehide`/`pageshow`
3. **iPad Split View / Slide Over**: zmiana rozmiaru okna bez pelnego ukrycia

## Rozwiazanie

Dodac nasluchiwanie na `pagehide` i `pageshow` jako trzeci fallback, specyficzny dla Safari/iOS:

### Zmiany w `src/components/SecureMedia.tsx`

W useEffect z visibilitychange (linia 1166) dodac:

```text
const handlePageHide = () => {
  if (videoRef.current && !videoRef.current.paused) {
    videoRef.current.pause();
    setIsTabHidden(true);
  }
};

const handlePageShow = (e: PageTransitionEvent) => {
  if (e.persisted) {
    // Strona wraca z bfcache — stan "tab hidden" do zdjecia przez uzytkownika (klik Play)
    setIsTabHidden(true);
  }
};

window.addEventListener('pagehide', handlePageHide);
window.addEventListener('pageshow', handlePageShow);
```

I cleanup:
```text
window.removeEventListener('pagehide', handlePageHide);
window.removeEventListener('pageshow', handlePageShow);
```

## Podsumowanie eventow po zmianach

| Event | Pokrycie |
|-------|----------|
| `visibilitychange` | Desktop (Chrome, Firefox, Safari), Android, iOS Safari (przelaczanie kart) |
| `window blur` | Desktop (przelaczanie okien), czesc mobilnych |
| `pagehide` / `pageshow` | iOS Safari (app switcher), iOS PWA standalone, iPad multitasking |

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodanie `pagehide`/`pageshow` listenerow w useEffect obok istniejacych |

