

# Naprawa wyswietlania kluczy zamiast polskich nazw w menu bocznym

## Problem

W `DashboardSidebar.tsx` na liniach renderowania menu uzyto wzorca:
```
tf(item.labelKey, item.labelKey)
```

Gdy tlumaczenie nie istnieje w bazie, `tf()` poprawnie zwraca fallback - ale fallbackiem jest **sam klucz** (np. `dashboard.menu.healthyKnowledge`), a nie polski tekst. Dlatego w menu widac surowe klucze tlumaczen.

## Rozwiazanie

Dodac mape fallbackow wewnatrz komponentu, ktora mapuje kazdy klucz na polski tekst. Nastepnie zamienic `tf(item.labelKey, item.labelKey)` na `tf(item.labelKey, menuLabelFallbacks[item.labelKey] || item.labelKey)`.

```typescript
const menuLabelFallbacks: Record<string, string> = {
  'dashboard.menu.dashboard': 'Dashboard',
  'dashboard.menu.academy': 'Akademia',
  'dashboard.menu.healthyKnowledge': 'Zdrowa Wiedza',
  'dashboard.menu.resources': 'Biblioteka',
  'dashboard.menu.pureContacts': 'Pure-Kontakty',
  'dashboard.menu.privateContacts': 'Kontakty prywatne',
  'dashboard.menu.teamContacts': 'Kontakty zespolu',
  'dashboard.menu.searchSpecialist': 'Szukaj specjalisty',
  'dashboard.menu.news': 'Aktualnosci',
  'dashboard.menu.events': 'Eventy',
  'dashboard.menu.webinars': 'Webinary',
  'dashboard.menu.teamMeetings': 'Spotkania zespolu',
  'dashboard.menu.individualMeetings': 'Spotkania indywidualne',
  'dashboard.menu.paidEvents': 'Eventy platne',
  'dashboard.menu.individualMeeting': 'Spotkanie indywidualne',
  'dashboard.menu.setupTripartiteMeeting': 'Ustaw spotkanie trojstronne',
  'dashboard.menu.setupPartnerConsultation': 'Ustaw konsultacje dla partnerow',
  'dashboard.menu.chat': 'Chat',
  'dashboard.menu.support': 'Wsparcie i pomoc',
  'dashboard.pureLinki': 'PureLinki',
  'dashboard.menu.infolinks': 'PureLinki',
  'dashboard.menu.community': 'Spolecznosc',
  'dashboard.menu.settings': 'Ustawienia',
  'dashboard.menu.calculator': 'Kalkulator',
  'dashboard.menu.forInfluencers': 'Dla Influenserow',
  'dashboard.menu.forSpecialists': 'Dla Specjalistow',
  'dashboard.menu.admin': 'CMS Panel',
};
```

Nastepnie helper `getLabel`:
```typescript
const getLabel = (key: string) => tf(key, menuLabelFallbacks[key] || key);
```

I zamienic wszystkie `tf(item.labelKey, item.labelKey)` na `getLabel(item.labelKey)` oraz `tf(subItem.labelKey, subItem.labelKey)` na `getLabel(subItem.labelKey)` (tylko dla nie-dynamicznych itemow).

## Dotyczy miejsc w pliku (linie)

- Linia 671: tooltip dla submenu parent
- Linia 676: label dla submenu parent  
- Linia 690: title dla submenu item
- Linia 704: label dla submenu item
- Linia 720: label na mobile
- Oraz dalsze linie z tym samym wzorcem (desktop tooltip render)

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/DashboardSidebar.tsx` | Dodac mape fallbackow + helper `getLabel()`, zamienic ~8 miejsc `tf(x, x)` na `getLabel(x)` |

