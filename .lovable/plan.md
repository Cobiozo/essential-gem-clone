

# Usunięcie skaczących strzałek z PWAInstallBanner

## Co zostanie usunięte
Cała funkcja `renderArrowIndicator()` (linie 229-349) oraz jej wywołanie `{renderArrowIndicator()}` (linia 353). To jest animowany element `animate-bounce` ze strzałkami wskazującymi na różne miejsca w przeglądarce (iOS Safari, iOS Chrome, Samsung Internet, Chrome Android, Edge, Chrome desktop, Opera, Safari macOS).

## Co pozostaje bez zmian
Baner z instrukcją instalacji (Alert z ikoną Download, tekstem i przyciskami) — linie 355-382 — działa dalej dokładnie tak samo.

## Zakres zmian

| Plik | Zmiana |
|------|--------|
| `src/components/pwa/PWAInstallBanner.tsx` | Usunięcie `indicatorStyle`, `renderArrowIndicator()` i jej wywołania. Usunięcie nieużywanych importów (`ArrowUp`, `ArrowDown`, `ArrowDownRight`, `MoreVertical`, `Menu`, `LayoutGrid`). Uproszczenie JSX return do samego baneru. |

## Szczegóły techniczne
- Usunięcie linii 227 (`indicatorStyle`)
- Usunięcie linii 229-349 (`renderArrowIndicator`)
- Usunięcie linii 353 (`{renderArrowIndicator()}`) i opakowujących fragmentów `<>...</>`
- Czyszczenie importów z lucide-react: usunięcie `ArrowUp`, `ArrowDown`, `ArrowDownRight`, `MoreVertical`, `Menu`, `LayoutGrid`

