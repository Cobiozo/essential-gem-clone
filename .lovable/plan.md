

# Plan: Aktualizacja sekcji Hero w szablonie PureLifeCenter2026

## Cel
Zmienić konfigurację bloku hero w szablonie "PureLifeCenter2026" tak, aby wyglądał identycznie jak na screenshocie — ciemne oliwkowe tło, tekst "TESTUJ, NIE ZGADUJ", dwa przyciski CTA, obraz produktu po prawej.

## Zmiany w konfiguracji hero (w bazie danych)

Nowa konfiguracja bloku `plc2026-hero`:

| Pole | Nowa wartość |
|------|-------------|
| `bg_color` | `#3d4a2c` (ciemny oliwkowy z screena) |
| `bg_image_url` | usunięte (brak zdjęcia tła — jednolity kolor) |
| `overlay_opacity` | `0` |
| `headline` | `TESTUJ, NIE ZGADUJ. Twoje zdrowie zasługuje na twarde dane.` |
| `description` | `Suplementacja Omega-3 oparta na teście z laboratorium. Prosty 6-miesięczny proces dla Ciebie i rodziny.` |
| `subheadline` | `9/10 osób ma niedobór omega-3 na bazie setek tysięcy testów.` |
| `cta_primary` | `{ text: "KUP TERAZ | DOŁĄCZ DO NAS", url: "#products" }` |
| `cta_secondary` | `{ text: "Wypełnij ankietę | dobierz opcję", url: "#contact" }` |
| `cta_bg_color` | `#2d6a4f` |
| `hero_image_url` | placeholder obrazu produktu (butelka z olejem + rodzina) |
| `stats` | usunięte (brak paska statystyk na screenie) |

## Implementacja

Jedna migracja SQL z `UPDATE` na rekord `partner_page_template` o nazwie `PureLifeCenter2026` — podmiana konfiguracji bloku hero w `template_data` za pomocą `jsonb_set`.

## Plik do zmiany

| Plik | Opis |
|------|------|
| Nowa migracja SQL | UPDATE template_data — podmiana config bloku hero |

