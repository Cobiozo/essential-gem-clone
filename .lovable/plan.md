

# Naprawa brakujących przypisań do modułów szkoleniowych

## Diagnoza

Znalazłem **trzy problemy** blokujące Marikę i wielu innych użytkowników:

### Problem 1: Brakujące przypisanie do PRODUKTOWE - EQOLOGY (unlock_order: 6)
Marika ma ukończone moduły 1-5, ale **nie ma przypisania do modułu nr 6** (PRODUKTOWE - EQOLOGY). Bez ukończenia modułu 6, moduł 7 (NIEZBĘDNIK KLIENTA) jest zablokowany przez logikę sekwencyjnego odblokowywania.

**Skala problemu**: **109 użytkowników** nie ma przypisania do PRODUKTOWE - EQOLOGY, w tym **48 partnerów** z językiem PL. Dodatkowe braki: SPRZEDAŻOWE (6), TECHNICZNE S (7), TECHNICZNE K (1).

**Przyczyna**: Moduł PRODUKTOWE - EQOLOGY został utworzony 2026-02-18. Trigger `assign_training_module_to_users` powinien był przypisać go automatycznie, ale najwyraźniej nie zadziałał poprawnie dla wszystkich użytkowników.

### Problem 2: NIEZBĘDNIK KLIENTA ma `visible_to_partners: false`
Marika jest partnerem, a moduł NIEZBĘDNIK KLIENTA ma wyłączoną widoczność dla partnerów. Nawet gdyby ukończyła moduł 6, nadal nie zobaczy modułu 7.

### Problem 3: Trigger przypisania nie obsługuje UPDATE
Trigger `trigger_assign_new_module` odpala się tylko na INSERT do `training_modules`. Gdy administrator zmieni widoczność modułu (np. włączy `visible_to_partners`), przypisania nie zostaną utworzone automatycznie.

## Plan naprawy

### Krok 1: Napraw dane — bulk INSERT brakujących przypisań
Jednorazowe zapytanie SQL, które doda brakujące przypisania dla WSZYSTKICH użytkowników i WSZYSTKICH modułów, do których powinni mieć dostęp na podstawie swojej roli.

### Krok 2: Zmień widoczność NIEZBĘDNIK KLIENTA
UPDATE `visible_to_partners = true` na module NIEZBĘDNIK KLIENTA (jeśli to zamierzone — z screenshota widać, że admin przypisał ten moduł Marice, więc powinien być widoczny dla partnerów).

### Krok 3: Rozszerz trigger o obsługę UPDATE
Dodanie migracji zmieniającej trigger `trigger_assign_new_module` tak, aby odpalał się również na UPDATE tabeli `training_modules`. Dzięki temu zmiana widoczności modułu automatycznie utworzy brakujące przypisania.

## Pliki do zmiany
1. **Migracja SQL** — rozszerzenie triggera o UPDATE + naprawa widoczności NIEZBĘDNIK KLIENTA
2. **Jednorazowy INSERT** — uzupełnienie brakujących przypisań dla wszystkich użytkowników

## Oczekiwany rezultat
- Marika (i 108 innych) dostanie przypisanie do PRODUKTOWE - EQOLOGY
- Po ukończeniu PRODUKTOWE - EQOLOGY, NIEZBĘDNIK KLIENTA się odblokuje
- Przyszłe zmiany widoczności modułów automatycznie utworzą przypisania

