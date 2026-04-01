

# Poprawki Auto-Webinar: sortowanie listy + dostęp widżetu

## Problem 1: Użytkownik z dostępem nie widzi widżetu
Baza danych jest poprawna — Sebastian ma `can_access_auto_webinar: true`, RLS pozwala mu czytać swój wiersz. Sprawdzenie kodu wykazało, że linia 314 w `WebinarInviteWidget.tsx` blokuje dostęp dla **specjalistów** (tylko `isPartner` jest sprawdzane). Choć Sebastian jest partnerem, warto rozszerzyć sprawdzanie na wszystkie role. Dodatkowo dodam logowanie do konsoli aby zdiagnozować ewentualne problemy z kolejnością ładowania stanów.

**Zmiana**: W `WebinarInviteWidget.tsx` — rozszerzyć warunek dostępu z `!isPartner` na `!isPartner && !isSpecjalista`, aby specjaliści też mogli mieć dostęp. Dodatkowo upewnić się, że `null` (stan ładowania) nie powoduje ukrycia widżetu przedwcześnie.

## Problem 2: Sortowanie — użytkownicy z dostępem na górze
W `AutoWebinarAccessManagement.tsx` — posortować listę partnerów tak, aby ci z `can_access_auto_webinar === true` byli na górze, a reszta alfabetycznie po nazwisku.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/WebinarInviteWidget.tsx` | Rozszerzyć warunek o `isSpecjalista`, poprawić obsługę stanu ładowania |
| `src/components/admin/AutoWebinarAccessManagement.tsx` | Sortować: `can_access_auto_webinar=true` na górze, reszta alfabetycznie |

