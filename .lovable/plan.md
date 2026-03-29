

## Plan: Poprawka favicon dla Safari i wszystkich przeglądarek

### Problem
1. W `index.html` brak tagu `<link rel="icon">` — Safari nie znajduje faviconu automatycznie
2. Plik `public/favicon.ico` to prawdopodobnie domyślna ikonka Lovable (serduszko), nie logo Pure Life

### Rozwiązanie

**Krok 1**: Użyć istniejącego logo kropli (plik `src/assets/pure-life-droplet-new.png`) jako favicon — skopiować go do `public/favicon.png`

**Krok 2**: Usunąć stary `public/favicon.ico` (serduszko)

**Krok 3**: Dodać w `index.html` (w sekcji `<head>`, przed apple-touch-icon):
```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

### Efekt
- Safari, Chrome, Firefox i inne przeglądarki pokażą złotą kroplę Pure Life zamiast serduszka
- Apple-touch-icon (ikona na ekranie głównym iOS) jest już poprawnie ustawiony na `pwa-192.png`

### Pliki do zmiany
- `index.html` — dodanie tagu `<link rel="icon">`
- `public/favicon.ico` — usunięcie
- `public/favicon.png` — nowy plik (kopia droplet logo)

