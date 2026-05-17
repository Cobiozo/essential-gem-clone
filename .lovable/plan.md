## Cel

1. Przenieść panel "Dolny pasek nawigacji (mobile)" z zakładki **Statystyki użytkowników** do zakładki **System** w panelu admina.
2. Wybór ikony — zamiast wpisywania nazwy, **lista rozwijana** (Select) z popularnych ikon `lucide-react` + podgląd.
3. Wybór ścieżki — zamiast wpisywania, **wizualny picker**: mini-mockup aplikacji (pulpit/sidebar) na którym admin klika obszar, a system przypisuje odpowiednią ścieżkę do ikony.

## 1. Przeniesienie do zakładki System

`src/components/admin/AdminSidebar.tsx` (lista `system.items`, ok. linia 208–219) — dopisać:
```
{ value: 'mobile-bottom-nav', labelKey: 'mobileBottomNav', icon: Smartphone },
```
i dodać tłumaczenie w `hardcodedLabels`: `mobileBottomNav: 'Dolny pasek (mobile)'`.

`src/pages/Admin.tsx` (sekcja `<TabsContent>` ok. linii 4783) — dodać:
```tsx
<TabsContent value="mobile-bottom-nav">
  <MobileBottomNavSettings />
</TabsContent>
```
i import komponentu.

`src/components/admin/UserStatistics.tsx` — usunąć render `<MobileBottomNavSettings />` (zostaje tylko w System).

## 2. Wybór ikony – dropdown

W `MobileBottomNavSettings.tsx` zamienić `<Input>` na `<Select>` z kuratorską listą ~60 ikon `lucide-react` (Home, LayoutDashboard, MessageCircle, Mail, Calendar, CalendarDays, GraduationCap, BookOpen, Users, User, Settings, Bell, Heart, Activity, Map, MapPin, Phone, FileText, Folder, Search, Star, ShoppingBag, Briefcase, Compass, Video, Mic, Image, BarChart, PieChart, Trophy, Award, Gift, ClipboardList, CheckSquare, HelpCircle, Shield, Globe, Building2, Newspaper, Package, Wallet, CreditCard, Tag, Bookmark, Flag, Zap, Sparkles, Sun, Moon, Cloud, Plus, Menu, Grid, List, Box, Layers, Send, Link, Smartphone, Headphones).

Każda opcja w dropdownie renderuje ikonę + nazwę. Wartość zapisywana jako `icon_name` (PascalCase) — kompatybilne z istniejącym renderem `(Icons as any)[icon_name]`.

## 3. Wybór ścieżki – wizualny mockup

Nowy komponent `src/components/admin/MobileNavPathPicker.tsx`:
- Modal/Popover ze stylizowanym schematem aplikacji: lista klikalnych „stref" (każda = nazwa + docelowa ścieżka).
- Po kliknięciu w strefę → `onChange(path)` i zamknięcie.

Lista stref (statyczny rejestr, można rozbudować — odpowiada realnym routom aplikacji):

```text
Pulpit                /dashboard
Wiadomości            /messages
Eventy                /events
Akademia              /academy
Profil                /profile
Mój zespół            /team
Powiadomienia         /notifications
Wyszukiwarka          /search
Spotkania 1:1         /individual-meetings
Spotkania zespołowe   /team-meetings
PureBox / Omega       /purebox
Baza wiedzy           /zdrowa-wiedza
Kalkulator            /calculator
Moja strona partnera  /moja-strona
Webinary              /webinars
Panel lidera          /leader-panel
Ustawienia            /settings
```

Layout: siatka 3-kol kafelków z ikoną + nazwą + ścieżką, podświetlone obecnie wybrane. Pole "Ścieżka własna" (advanced) zostaje jako fallback poniżej (collapsed accordion) – pozwala wpisać dowolną ścieżkę gdy admin doda nową stronę.

W `MobileBottomNavSettings.tsx` w wierszu pozycji zamiast `<Input target_path>` przycisk:
```
[Ikona docelowego miejsca] Pulpit  ·  /dashboard   [Zmień]
```
otwierający `MobileNavPathPicker` (Dialog). Po wyborze: `update(id, { target_path })`.

## Zakres techniczny

**Edytowane pliki:**
- `src/components/admin/AdminSidebar.tsx` – dopisanie pozycji w `system.items` + label
- `src/pages/Admin.tsx` – nowy `TabsContent value="mobile-bottom-nav"` + import
- `src/components/admin/UserStatistics.tsx` – usunięcie sekcji `MobileBottomNavSettings`
- `src/components/admin/MobileBottomNavSettings.tsx` – Select ikon + przycisk otwierający picker ścieżki

**Nowe pliki:**
- `src/components/admin/MobileNavPathPicker.tsx` – Dialog z siatką klikalnych stref i fallback "ścieżka własna"
- `src/components/admin/mobileNavRegistry.ts` – statyczna tablica `{ label, path, iconName }[]` (źródło prawdy dla pickera; łatwa do rozszerzenia w przyszłości)

**Bez zmian:** tabela `mobile_bottom_nav_items`, hook `useMobileBottomNav`, komponent `MobileBottomNav.tsx` (frontend mobile) — pole `target_path` dalej jest stringiem, picker tylko wygodnie je ustawia.

## Pytania doprecyzowujące

1. Czy obecna lista stref (17 pozycji powyżej) jest OK, czy chcesz inny zestaw? Mogę też wygenerować ją automatycznie z `KNOWN_APP_ROUTES`.
2. Czy picker ścieżki ma być prostą siatką kafelków (szybsze), czy chcesz realistyczny mini-podgląd ekranu aplikacji ze strzałkami wskazującymi obszary (ładniej, ale więcej pracy)? Sugeruję siatkę — jest jasna i nie myli się jak miniatura.
