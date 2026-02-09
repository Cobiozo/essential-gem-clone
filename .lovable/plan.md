

# Plan: Przeniesienie przełącznika "Lider (broadcast)" do zakładki Czat

## Problem

Przełącznik `can_broadcast` (nadanie roli Lidera) jest obecnie w zakładce "Spotkania indywidualne", ale dotyczy czatu - powinien być w zakładce "Uprawnienia czatu" (`chat-permissions`).

## Rozwiązanie

Najprościej i bez komplikowania zależności: **przenieść kolumnę "Lider (broadcast)" z `IndividualMeetingsManagement` do `ChatPermissionsManagement`** jako osobną kartę (Card) z listą partnerów i przełącznikami.

Obie funkcje korzystają z tej samej tabeli `leader_permissions` - nie trzeba tworzyć nowej tabeli ani duplikować danych. Spotkania indywidualne czytają swoje kolumny, czat czyta `can_broadcast`.

## Zakres zmian

### 1. `src/components/admin/ChatPermissionsManagement.tsx`

Dodanie nowej karty **"Liderzy - kanały jednokierunkowe"** (pod istniejącymi kartami "Widoczność sidebar" i "Kierunki komunikacji"):
- Lista partnerów z wyszukiwarką (jak w IndividualMeetingsManagement)
- Przełącznik `can_broadcast` przy każdym partnerze
- Pobieranie danych z `profiles` + `user_roles` (filtr partner) + `leader_permissions`
- Zapis do `leader_permissions.can_broadcast`

### 2. `src/components/admin/IndividualMeetingsManagement.tsx`

Usunięcie kolumny "Lider (broadcast)" z tabeli - zostają tylko kolumny dotyczące spotkań (tripartite, partner consultation).

## Efekt

- Zakładka **"Spotkania indywidualne"**: tylko uprawnienia do spotkań
- Zakładka **"Uprawnienia czatu"**: widoczność sidebar + kierunki komunikacji + nadawanie roli Lidera (broadcast)
- Baza danych: bez zmian - ta sama tabela `leader_permissions`, te same kolumny

