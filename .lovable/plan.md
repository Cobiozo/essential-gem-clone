
# Zamiana hardcoded polskich tekstow w menu bocznym i tooltipach

## Problem

Menu boczne (`DashboardSidebar.tsx`) zawiera wiele hardcoded polskich tekstow:
- **Etykiety menu**: "Zdrowa Wiedza", "Eventy", "Spotkanie indywidualne", "Kalkulator", "Dla Influenserow", "Dla Specjalistow", "Ustaw spotkanie trojstronne", "Ustaw konsultacje dla partnerow"
- **Tooltipy**: Caly obiekt `menuTooltipDescriptions` (17 opisow) jest po polsku bez uzycia `t()`
- Wiekszość pozycji menu juz uzywa kluczy `t()` (np. `dashboard.menu.dashboard`), ale kilka zostalo pominiete

## Zakres zmian

### 1. DashboardSidebar.tsx - etykiety menu (labelKey)

| Obecna wartosc PL | Nowy klucz t() |
|-------------------|----------------|
| `'Zdrowa Wiedza'` | `'dashboard.menu.healthyKnowledge'` |
| `'Eventy'` | `'dashboard.menu.paidEvents'` |
| `'Spotkanie indywidualne'` | `'dashboard.menu.individualMeeting'` |
| `'Ustaw spotkanie trojstronne'` | `'dashboard.menu.setupTripartiteMeeting'` |
| `'Ustaw konsultacje dla partnerow'` | `'dashboard.menu.setupPartnerConsultation'` |
| `'Kalkulator'` | `'dashboard.menu.calculator'` |
| `'Dla Influenserow'` | `'dashboard.menu.forInfluencers'` |
| `'Dla Specjalistow'` | `'dashboard.menu.forSpecialists'` |

### 2. DashboardSidebar.tsx - tooltipDescriptions

Zamienic statyczny obiekt `menuTooltipDescriptions` na funkcje uzywajaca `t()`:

```text
Przed: dashboard: 'Twoja strona glowna z podgladem...'
Po:    dashboard: t('tooltip.dashboard') || 'Twoja strona glowna z podgladem...'
```

Poniewaz obiekt jest zdefiniowany poza komponentem, trzeba go przeniesc do wnetrza komponentu (zeby miec dostep do `t()`) lub zamienic na funkcje.

### 3. Dodatkowe pliki z hardcoded polskimi tekstami

| Plik | Tekst PL | Klucz t() |
|------|----------|-----------|
| `CacheManagementWidget.tsx` | "Anuluj" | `t('common.cancel')` |
| `CacheManagementDialog.tsx` | "Anuluj", "Potwierdz", "Tak, wyczysc wszystko" | `t('common.cancel')`, `t('common.confirm')`, `t('common.clearAll')` |
| `loading-spinner.tsx` | "Ladowanie..." (domyslny text) | Parametryczne - bez zmian lub `t('common.loading')` |
| `Disclaimer.tsx` (kalkulator) | Caly paragraf po polsku | `t('calculator.disclaimer')` |

## Podejscie techniczne

- `labelKey` w menuItems: zamiana hardcoded stringow na klucze `t()` - system juz automatycznie wywoluje `t(item.labelKey)` przy renderowaniu, wiec wystarczy uzyc kluczy
- `menuTooltipDescriptions`: przeniesienie do wnetrza komponentu i owijka `t()` z fallbackiem
- Fallbacki `|| 'tekst PL'` zapewnia dzialanie nawet bez kluczy w bazie

## Pliki do zmiany

| Plik | Zakres zmian |
|------|-------------|
| `src/components/dashboard/DashboardSidebar.tsx` | 8 labelKey + 17 tooltipow -> t() |
| `src/components/dashboard/CacheManagementDialog.tsx` | ~6 hardcoded stringow -> t() |
| `src/components/dashboard/widgets/CacheManagementWidget.tsx` | 1 hardcoded string -> t() |
| `src/components/specialist-calculator/Disclaimer.tsx` | 1 paragraf -> t() |
