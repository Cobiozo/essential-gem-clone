

# Poprawki wskaznika instalacji PWA

## Problemy widoczne na zrzutach

1. **Nachodzenie**: Baner i strzalka oba sa w `top-2 right-4`, nachodza na siebie
2. **Edge**: Strzalka wskazuje "Menu -> Zainstaluj", ale w Edge ikona instalacji to trzy kwadraciki z plusem w pasku adresowym (po lewej stronie ikon rozszerzen)
3. **Opera**: Nie pokazuje strzalki - warunek `canInstall && (isChrome || isEdge || isOpera)` moze nie dzialac, bo Opera moze nie emitowac `beforeinstallprompt`
4. **Styl**: Uzytkownik chce zloty kolor strzalki z czarnym tlem i mniejszy tekst

## Zmiany w `src/components/pwa/PWAInstallBanner.tsx`

### 1. Nowy styl wskaznika (zloty z czarnym tlem)

Zmiana `indicatorStyle` z `bg-primary text-primary-foreground` na:
```
bg-black text-amber-400 border-amber-500/50
```
Mniejszy tekst: `text-xs` zamiast `text-sm`.

### 2. Przesuniecie banera w lewo

Baner na desktopie: zmiana z `right-4 max-w-sm` na `right-20 max-w-sm` lub `right-[120px]`, aby nie nachodzil na strzalke w prawym gornym rogu.

### 3. Poprawka pozycji dla Edge

Edge ma ikone instalacji (trzy kwadraciki z plusem) w pasku adresowym, po prawej stronie URL ale przed ikonami rozszerzen. Strzalka powinna celowac bardziej w lewo niz obecne `right-12`. Zmiana na `right-[200px]` lub podobne, z tekstem "Kliknij ikonke instalacji" zamiast "Menu -> Zainstaluj".

Rozdzielenie warunkow Chrome i Edge:
- **Edge** (`isEdge && !isAndroid`): `fixed top-2 right-[140px]` - celuje w ikone w pasku adresowym, tekst: "Zainstaluj z paska adresu"
- **Chrome** (`isChrome && !isAndroid`): `fixed top-2 right-12` - celuje w ikone instalacji przy rozszerzeniach

### 4. Dodanie wariantu Opera bez `canInstall`

Dodanie fallbacku dla Opery desktopowej gdy `canInstall` jest `false`:
```
if (isOpera && !isAndroid && !canInstall) {
  // Strzalka do menu Opery (top-right)
  return indicator z tekstem "Menu → Zainstaluj"
}
```

### 5. Kolejnosc warunkow w `renderArrowIndicator()`

```
1. iOS Safari -> top-2 right-2
2. Samsung Internet -> bottom-16 right-4  
3. Android Chrome (no prompt) -> top-2 right-2
4. Edge desktop (canInstall) -> top-2 right-[140px], tekst "Zainstaluj z paska"
5. Chrome desktop (canInstall) -> top-2 right-12
6. Opera desktop (canInstall) -> top-2 right-12
7. Edge desktop (no canInstall) -> top-2 right-[140px]
8. Chrome desktop (no canInstall) -> top-2 right-4
9. Opera desktop (no canInstall) -> top-2 right-4
10. Safari macOS -> top-2 right-24
11. Fallback -> null
```

### Pliki do edycji

- `src/components/pwa/PWAInstallBanner.tsx` - styl, pozycjonowanie, rozdzielenie Edge/Chrome/Opera

