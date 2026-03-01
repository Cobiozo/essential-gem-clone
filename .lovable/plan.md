

# Przeniesienie zakładki "Zablokowani" do wnętrza "Moja struktura"

## Problem
Obecnie "Zablokowani" jest osobną zakładką na najwyższym poziomie Panelu Lidera. Użytkownik chce, aby była to pod-zakładka wewnątrz widoku "Moja struktura", obok przełącznika Lista/Graf.

## Zmiany

### 1. Usunięcie zakładki "Zablokowani" z LeaderPanel.tsx
- Usunięcie wpisu `blocked-users` z tablicy `availableTabs` (linia 144)
- Usunięcie case `blocked-users` z `renderTabContent` (linia 190-191)
- Usunięcie importu `LeaderBlockedUsersView` z lazy imports (linia 42)

### 2. Modyfikacja LeaderOrgTreeView.tsx — dodanie pod-zakładki
- Dodanie stanu `subView: 'structure' | 'blocked'` (domyślnie `'structure'`)
- W sekcji "Twoja struktura" (karta z przełącznikiem Lista/Graf) dodanie dwóch przycisków: **Struktura** i **Zablokowani** (z liczbą zablokowanych)
- Gdy `subView === 'blocked'` — renderowanie `LeaderBlockedUsersView` zamiast drzewa/listy
- Gdy `subView === 'structure'` — istniejący widok Lista/Graf bez zmian
- Przycisk blokowania przy każdym członku zespołu pozostaje bez zmian (już działa)

### 3. Modyfikacja LeaderBlockedUsersView.tsx — rozszerzenie danych
- Upewnienie się, że każdy zablokowany użytkownik pokazuje:
  - Imię i nazwisko zablokowanego
  - Kto zablokował (imię i nazwisko lidera)
  - Powód blokady
  - Data i godzina blokady
  - Przycisk "Przywróć"

Dane `blocked_by_first_name`, `blocked_by_last_name`, `reason`, `blocked_at` są już dostępne z tabeli `user_blocks` i hooka `useLeaderBlocks`. Komponent `LeaderBlockedUsersView` już wyświetla te informacje — zostanie jedynie dopracowany wizualnie, aby wyraźnie prezentować kto zablokował.

### Wynik
- Zakładka "Zablokowani" znika z paska głównego Panelu Lidera
- Pojawia się jako pod-widok w "Moja struktura" (przełącznik: Struktura / Zablokowani)
- Przycisk blokowania przy członkach zespołu działa jak dotychczas

