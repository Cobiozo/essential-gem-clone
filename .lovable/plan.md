

# Plan: Aktualizacja sekcji partnera (plc2026-partner) w szablonie PureLifeCenter2026

## Cel
Zmienić wygląd drugiej sekcji szablonu aby odpowiadała screenshotowi: jasne tło, ciemny tekst, nowe treści bullet pointów, subtelne zdjęcie natury w tle.

## Analiza screenshota vs obecna konfiguracja

| Element | Obecna wartość | Docelowa (ze screena) |
|---------|---------------|----------------------|
| `text_color` | `#ffffff` (biały) | usunąć — domyślny ciemny tekst |
| `bg_image_url` | las (unsplash) z opacity 0.15 | pozostawić, ale zmienić overlay na jaśniejszy |
| `items` | 3 ogólne punkty o suplementach | Nowe: "Pomagam ludziom zadbać o zdrowie…", "Sam dbam o zdrowie…", "Jeśli czujesz, że to coś dla Ciebie…" |
| `overlay_opacity` | domyślne 0.15 | `0.12` — subtelniejsze tło |
| Reszta | OK | Bez zmian |

## Implementacja

Jedna migracja SQL — `UPDATE` na `partner_page_template` z `jsonb_set` na bloku `plc2026-partner`:

1. Usunąć `text_color` (lub ustawić na `null`) — tekst będzie ciemny (domyślny foreground)
2. Zaktualizować `items` na treść ze screena
3. Zmienić `overlay_opacity` na `0.12`

## Zmiana w komponencie

`TextImageSection.tsx` — linia 29: zmienić gradient overlay z `from-white/80 to-white/40` na `from-white/90 to-white/60` aby lepiej pasowało do jasnego stylu ze screena.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | Update config bloku plc2026-partner |
| `TextImageSection.tsx` | Jaśniejszy overlay gradient |

