
# Dodanie brakujacych sekcji tekstowych do renderera strony partnerskiej

## Problem
Szablon w bazie danych zawiera juz wszystkie teksty ze screenow (welcome_section, order_section, contact_section_static, footer_branding), ale renderer (`PartnerPage.tsx`) ich nie wyswietla — obsluguje tylko `hero_banner` i `about_heading`.

## Co zostanie zmienione

### Plik: `src/pages/PartnerPage.tsx`

Dodanie renderowania 4 brakujacych sekcji szablonu, zachowujac obecny design:

1. **Welcome section** (po hero banerze) — wyswietlenie tresci HTML z szablonu ("Witaj w swojej podrozy po zdrowie!" + 3 akapity) jako centowany blok tekstowy

2. **Order section** (po produktach) — sekcja "Zamowienie" renderowana jako rozwijany akordeon (Collapsible z Radix UI), poniewaz szablon ma `display: "accordion"`. Zawiera instrukcje zamawiania w kolorze czerwonym, info o e-booku i instrukcje krok po kroku

3. **Contact section static** (po zamowieniu) — sekcja "Badz z nami w kontakcie!" rowniez jako akordeon. Zawiera zaproszenie do grupy FB "Twoja omega-3" z przyciskiem

4. **Footer branding** (zamiana obecnej prostej stopki) — "w Eqology zmieniamy zdrowie i zycie ludzi na lepsze", "Pozdrawiamy", "zespol Pure Life"

### Szczegoly techniczne

- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` z `@/components/ui/collapsible`
- Import `ChevronDown` z lucide-react dla ikony akordeonu
- Sekcje `order_section` i `contact_section_static` maja w szablonie pole `display: "accordion"` i `title` — renderer uzyje ich do stworzenia rozwijanych kart
- Sekcja `welcome_section` renderowana przez `dangerouslySetInnerHTML` (tak jak hero_banner)
- Sekcja `footer_branding` zastapi obecny prosty tekst "Pure Life Center" w stopce
- Brak zmian w kolorystyce, layoutcie ani pozostalych sekcjach
