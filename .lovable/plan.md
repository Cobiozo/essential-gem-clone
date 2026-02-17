

# Naprawa wyswietlania kluczy tlumaczen zamiast tekstu

## Problem

Funkcja `t()` zwraca sam klucz (np. `"dashboard.menu.healthyKnowledge"`) gdy tlumaczenie nie istnieje w bazie. Poniewaz jest to truthy string, wzorzec `t('key') || 'fallback'` **nigdy nie uzywa fallbacka** - zamiast tego wyswietla surowy klucz.

Klucze takie jak `dashboard.menu.healthyKnowledge`, `tooltip.*`, `common.*`, `cache.*` **nie istnieja** w tabeli `i18n_translations`.

## Rozwiazanie

Dwuetapowe podejscie:

### 1. Naprawic `t()` w LanguageContext - dodac polskie fallbacki jako mape

Zamiast zwracac klucz gdy brak tlumaczenia, system powinien zwracac polski tekst z wbudowanej mapy fallbackow. To rozwiaze problem globalnie.

Ale to duza zmiana. Prostsze rozwiazanie:

### 2. Zamienic wzorzec `||` na helper ktory sprawdza czy t() zwrocil klucz

Dodac globalna funkcje pomocnicza `tf()` (translate with fallback) ktora:
- Wywoluje `t(key)`
- Sprawdza czy wynik === key (czyli brak tlumaczenia)
- Jesli tak, zwraca podany fallback

```typescript
// W LanguageContext.tsx - dodac do kontekstu
const tf = useCallback((key: string, fallback: string): string => {
  const translated = t(key);
  return translated !== key ? translated : fallback;
}, [t]);
```

### 3. Zastosowac we wszystkich zmienionych plikach

**DashboardSidebar.tsx** - menu labelKeys:
Problem: `t('dashboard.menu.healthyKnowledge')` zwraca klucz.
Rozwiazanie: Wrocic do hardcoded PL w `labelKey` i dodac mapowanie klucz->polski w osobnym obiekcie, lub uzyc `tf()`.

Najlepsze rozwiazanie dla sidebar: **Wrocic do polskich stringow w labelKey**, ale dodac mapowanie na klucze i18n w renderowaniu:

```typescript
// Mapa polskich fallbackow dla kluczy menu
const menuFallbacks: Record<string, string> = {
  'dashboard.menu.healthyKnowledge': 'Zdrowa Wiedza',
  'dashboard.menu.paidEvents': 'Eventy',
  'dashboard.menu.individualMeeting': 'Spotkanie indywidualne',
  'dashboard.menu.setupTripartiteMeeting': 'Ustaw spotkanie trójstronne',
  'dashboard.menu.setupPartnerConsultation': 'Ustaw konsultacje dla partnerów',
  'dashboard.menu.calculator': 'Kalkulator',
  'dashboard.menu.forInfluencers': 'Dla Influenserów',
  'dashboard.menu.forSpecialists': 'Dla Specjalistów',
  // ... inne klucze
};

// Renderowanie:
<span>{tf(item.labelKey, menuFallbacks[item.labelKey] || item.labelKey)}</span>
```

**Tooltipy** - analogicznie, juz maja fallbacki ale wzorzec `||` nie dziala. Zamienic na `tf()`.

**CacheManagementDialog.tsx i CacheManagementWidget.tsx** - analogicznie zamienic `t('cache.xxx') || 'fallback'` na `tf('cache.xxx', 'fallback')`.

**Disclaimer.tsx** - zamienic `t('calculator.disclaimer') || '...'` na `tf('calculator.disclaimer', '...')`.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Dodac funkcje `tf()` do kontekstu |
| `src/components/dashboard/DashboardSidebar.tsx` | Uzyc `tf()` dla labelKeys i tooltipow |
| `src/components/dashboard/CacheManagementDialog.tsx` | Zamienic `t() \|\|` na `tf()` |
| `src/components/dashboard/widgets/CacheManagementWidget.tsx` | Zamienic `t() \|\|` na `tf()` |
| `src/components/specialist-calculator/Disclaimer.tsx` | Zamienic `t() \|\|` na `tf()` |
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Helper `ft()` juz poprawnie sprawdza `!== key`, OK |

## Wazne

Komponent `DashboardFooterSection.tsx` juz ma poprawna logike (helper `ft()` sprawdza `translated !== translationKey`), wiec nie wymaga zmian.

Glowny problem to wzorzec `t('key') || 'fallback'` - klucz jest truthy stringiem, wiec `||` nigdy nie odpala fallbacka. Funkcja `tf()` to naprawi globalnie.
