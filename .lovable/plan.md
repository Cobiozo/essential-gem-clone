

# Naprawa instalacji PWA na Chrome / Android

## Zidentyfikowany problem

Plik `manifest.json` zawiera pusta tablice `screenshots: []`. Od Chrome 118+ na Androidzie, pusta tablica screenshots moze blokowac prompt instalacji PWA ("beforeinstallprompt" event nie jest emitowany). Chrome traktuje to jako niekompletna konfiguracje.

## Rozwiazanie

### 1. Dodac screenshoty do manifest.json

Dodac co najmniej 1 screenshot w formacie 1080x1920 (portrait) dla mobilnych i opcjonalnie 1920x1080 (landscape) dla desktopowych. Screenshoty powinny byc zapisane w folderze `public/`.

```text
Przed:
"screenshots": []

Po:
"screenshots": [
  {
    "src": "/screenshot-mobile.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "Pure Life Center - Dashboard"
  },
  {
    "src": "/screenshot-desktop.png",
    "sizes": "1920x1080",
    "type": "image/png",
    "form_factor": "wide",
    "label": "Pure Life Center - Strona glowna"
  }
]
```

### 2. Alternatywa minimalna - usunac puste pole

Jesli screenshoty nie sa gotowe, wystarczy calkowicie usunac pole `screenshots` z manifestu zamiast trzymac pusta tablice:

```text
Usunac linie: "screenshots": [],
```

To odblokuje standardowy (mniej ozdobny) prompt instalacji na Chrome/Android.

## Rekomendacja

Najszybsze rozwiazanie to **usunac puste pole `screenshots`** (opcja 2). Pozniej mozna dodac prawdziwe screenshoty dla ladniejszego promptu instalacji.

## Zmiany techniczne

| Plik | Zmiana |
|------|--------|
| `public/manifest.json` | Usunac `"screenshots": []` lub zastapic prawdziwymi screenshotami |

## Wazne

Po wdrozeniu zmiany trzeba:
1. Opublikowac nowa wersje (Publish)
2. Wdrozyc na produkcje (Cyberfolks - nowy dist/)
3. Wyczyscic cache przegladarki lub otworzyc w trybie incognito, zeby przetestowac prompt instalacji
