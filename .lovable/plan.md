

# Poprawka kolejności norweskiego + uzupełnienie brakujących tłumaczeń

## Problem 1: Norweski na pierwszym miejscu listy
Norweski ma `position: 0` w tabeli `i18n_languages` — taki sam jak polski. Trzeba ustawić `position: 8` (za portugalskim).

## Problem 2: Brakujące tłumaczenia norweskie
Norweski ma tylko **89 kluczy** vs **2585** dla polskiego. Brakuje 1631 kluczy. System `scheduled-translate-sync` automatycznie je uzupełni po wywołaniu, ale trzeba go uruchomić.

## Problem 3: Hardkodowane locale w 14+ plikach user-facing
Nadal 14 plików używa `language === 'pl' ? pl : enUS` zamiast `getAppDateLocale(language)`, a kolejne ~10 user-facing plików ma twarde `locale: pl`.

## Problem 4: ThemeSelector z hardkodowanymi polskimi stringami
"Jasny", "Ciemny", "Dostosowany do urządzenia" — bez tłumaczeń.

---

## Plan

### 1. Migracja SQL — pozycja norweskiego
```sql
UPDATE public.i18n_languages SET position = 8 WHERE code = 'no';
```

### 2. Zamiana `language === 'pl' ? pl : enUS` → `getAppDateLocale(language)` (14 plików)

Pliki user-facing:
- `WelcomeWidget.tsx`, `QuickStatsWidget.tsx`, `CalendarWidget.tsx`, `NotificationsWidget.tsx`, `MyMeetingsWidget.tsx`
- `BookMeetingDialog.tsx`, `EventCardCompact.tsx`, `EventCard.tsx`, `PaidEventCard.tsx`
- `ConversationList.tsx`, `PrivateChatThreadView.tsx`, `PrivateChatThreadList.tsx`

Pliki admin (też poprawić dla spójności):
- `WebinarList.tsx`, `TeamTrainingList.tsx`, `OtpCodesManagement.tsx`, `EventsManagement.tsx`, `WebinarForm.tsx`

### 3. ThemeSelector — dodanie `tf()` z fallbackami
```tsx
tf('theme.light', 'Jasny')
tf('theme.dark', 'Ciemny')  
tf('theme.system', 'Dostosowany do urządzenia')
tf('theme.toggle', 'Przełącz motyw')
```

### 4. Dodanie kluczy theme.* do migracji SQL
4 klucze × 4 języki (pl, en, de, no).

### 5. Wywołanie scheduled-translate-sync
Uruchomić edge function aby automatycznie wygenerować brakujące ~1631 norweskich tłumaczeń.

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | `position = 8` dla NO + klucze theme.* |
| `ThemeSelector.tsx` | Dodanie `useLanguage` + `tf()` |
| `WelcomeWidget.tsx` | `getAppDateLocale(language)` |
| `QuickStatsWidget.tsx` | `getAppDateLocale(language)` |
| `CalendarWidget.tsx` | `getAppDateLocale(language)` |
| `NotificationsWidget.tsx` | `getAppDateLocale(language)` |
| `MyMeetingsWidget.tsx` | `getAppDateLocale(language)` |
| `BookMeetingDialog.tsx` | `getAppDateLocale(language)` |
| `EventCardCompact.tsx` | `getAppDateLocale(language)` |
| `EventCard.tsx` | `getAppDateLocale(language)` |
| `PaidEventCard.tsx` | `getAppDateLocale(language)` |
| `ConversationList.tsx` | `getAppDateLocale(language)` |
| `PrivateChatThreadView.tsx` | `getAppDateLocale(language)` + `useLanguage` |
| `PrivateChatThreadList.tsx` | `getAppDateLocale(language)` + `useLanguage` |
| `WebinarList.tsx` | `getAppDateLocale(language)` |
| `TeamTrainingList.tsx` | `getAppDateLocale(language)` |
| `OtpCodesManagement.tsx` | `getAppDateLocale(language)` |
| `EventsManagement.tsx` | `getAppDateLocale(language)` |
| `WebinarForm.tsx` | `getAppDateLocale(language)` |
| Edge function trigger | `scheduled-translate-sync` dla NO |

