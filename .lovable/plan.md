

# Podzakładki BO / HC w admin Auto-Webinary

## Problem
Komponent `AutoWebinarManagement` ładuje jedną konfigurację (`limit(1).maybeSingle()`). Brak podzakładek Business Opportunity / Health Conversation w panelu admina.

## Rozwiązanie
Owinąć `AutoWebinarManagement` w komponent-wrapper z zakładkami BO/HC. Każda zakładka ładuje osobną konfigurację z `auto_webinar_config` filtrowaną po kolumnie `category`.

## Zmiany

### 1. `AutoWebinarManagement.tsx` — dodać prop `category`
- Dodać prop `category: 'business_opportunity' | 'health_conversation'`
- Zmienić `loadData`: zamiast `.limit(1).maybeSingle()` użyć `.eq('category', category).maybeSingle()`
- Zmienić `ensureConfig`: przy insercie dodać `category` do obiektu

### 2. `EventsManagement.tsx` — zamienić `<AutoWebinarManagement />` na wrapper z Tabs
- W `TabsContent value="auto-webinar"` dodać wewnętrzne `Tabs` z dwoma zakładkami:
  - **Business Opportunity** → `<AutoWebinarManagement category="business_opportunity" />`
  - **Health Conversation** → `<AutoWebinarManagement category="health_conversation" />`

### Pliki do edycji
| Plik | Zmiana |
|---|---|
| `src/components/admin/AutoWebinarManagement.tsx` | Dodać prop `category`, filtrować config po `category` |
| `src/components/admin/EventsManagement.tsx` | Wrapper z pod-zakładkami BO/HC |

