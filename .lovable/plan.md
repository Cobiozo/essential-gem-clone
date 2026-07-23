## Cel
Pasek nawigacyjny (V1 `Header`) ma być widoczny wyłącznie na publicznej stronie głównej V2 — w edytorze admina go nie renderujemy.

## Zmiana
`src/components/landing-v2/LandingV2.tsx`:
- Linia 193: renderuj `<Header ... />` warunkowo — tylko gdy `editable === false` (tryb publiczny).
- W trybie edytora (`editable === true`) nagłówek pomijamy, żeby nie zasłaniał kanwy i nie mylił z paskiem edytora.
- Bez zmian w źródłach danych (`useSystemTexts`, `usePublishedPages`) — pozostają jak są, żeby publiczna wersja działała identycznie.

## Poza zakresem
- Brak zmian w edytorze, Inspectorze, widżetach ani w V1.
