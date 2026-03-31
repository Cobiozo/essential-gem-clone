

# Naprawa widoku kontaktów prywatnych na mobile — pozostałe problemy

## Problemy widoczne na screenshocie (390px)

### 1. Sub-taby prywatne — za długi tekst w przyciskach
Przyciski jak "Z zaproszeń na Business Opportunity" czy "Z zaproszeń na Health Conversation" są za długie na 390px. Mimo `flex-wrap` każdy przycisk zajmuje pełną szerokość i tekst jest zbyt długi.

**Rozwiązanie:** Skrócić tekst na mobile — użyć `<span className="hidden sm:inline">` / `<span className="sm:hidden">` pattern:
- "Moja lista kontaktów" → "Moja lista"
- "Z zaproszeń na Business Opportunity" → "BO"  
- "Z zaproszeń na Health Conversation" → "HC"
- "Z zaproszeń na webinary ogólne" → "Webinary"
- "Z Mojej Strony Partnera" → "Strona"
- "Usunięte" → bez zmian (krótkie)

### 2. Header — przyciski akcji (Filtry, Eksport, Dodaj kontakt)
Na mobile 4 przyciski + view toggle próbują zmieścić się w jednym rzędzie. `flex-wrap` pomaga ale wygląda chaotycznie.

**Rozwiązanie:** 
- Na mobile ukryć tekst w przyciskach "Filtry" i "Eksport" — zostawić tylko ikony
- "Dodaj kontakt" skrócić do ikony `+` na mobile
- Użyć `<span className="hidden sm:inline ml-2">` dla etykiet

### 3. Tytuł kardy "Kontakty prywatne" + opis
Na 390px tytuł i opis zajmują za dużo miejsca obok przycisków.

**Rozwiązanie:** Zmienić `flex items-center justify-between` na `flex flex-col sm:flex-row` w CardHeader — na mobile stos pionowy.

## Plik do edycji

`src/components/team-contacts/TeamContactsTab.tsx`:
- Linie 274-328: Header z tytułem i przyciskami → mobile-first layout
- Linie 341-395: Sub-taby → skrócone etykiety na mobile

