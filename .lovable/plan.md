

# Zmiany w WebinarInviteWidget

## Widoczność
Aktualnie widżet jest ukryty tylko dla `client` (linia 292). Nie ma mechanizmu zarządzania przez admina — widoczność jest hardcoded. Plan: zostawić obecną logikę (partner, specjalista, admin widzą), bo admin zarządza konfiguracją auto-webinarów (`is_enabled`, `visible_to_*`) w CMS — jeśli wyłączy auto-webinar, kolumna się nie renderuje (`if (!config?.is_enabled) return null`). Dodatkowy mechanizm nie jest potrzebny.

## Zmiany UI

### 1. Większy napis tytułowy
Zmiana `text-base` → `text-xl` dla nagłówka "Zaproś Swojego Gościa na Live Webinar".

### 2. Pulsująca kropka + LIVE + nazwa webinara w triggerze kategorii
Zmiana kolejności elementów w `CollapsibleTrigger`:
- Pulsująca czerwona kropka (zawsze widoczna, nie tylko gdy live)
- Badge "LIVE" (zawsze widoczny)
- Nazwa kategorii ("Business Opportunity" / "Health Conversation")

Aktualna kolejność: kropka → nazwa → LIVE badge (tylko gdy live slot).
Nowa kolejność: kropka (pulsująca) → "LIVE" badge → nazwa kategorii — **zawsze widoczne**, nie tylko podczas live slotu.

## Plik do edycji
- `src/components/dashboard/widgets/WebinarInviteWidget.tsx` (linie 188-201, 301-306)

