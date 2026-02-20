
# Przebudowa TeamTrainingProgressView na widok rozwijany (wzorzec z panelu admina)

## Co się zmieni

Obecny widok to zwykła tabela, gdzie WSZYSTKIE moduły każdej osoby są widoczne jednocześnie w wierszu — przez co tabela jest bardzo wysoka i trudna do czytania.

Nowy widok będzie identyczny jak w panelu admina (zakładka "Postęp użytkowników"):
- Każda osoba = karta z avatarem, imieniem, EQ ID i ogólnym % postępu
- Kliknięcie karty → rozwija listę modułów danej osoby (Collapsible)
- Każdy moduł = osobna sekcja z paskiem postępu i liczbą lekcji (bez przycisku reset/zatwierdź — lider tylko ogląda)
- Siatka 2 kolumn na desktop, 1 kolumna na mobile (identycznie jak w adminie)

## Wzorzec z panelu admina (linii 1671-1883 TrainingManagement.tsx)

```text
┌────────────────────────────────────────────────────────┐
│  [Avatar] Jan Kowalski                        23% ▼   │
│           EQ: 12345678                                 │
└────────────────────────────────────────────────────────┘
  ▼ (po kliknięciu rozwinięte):
  ┌──────────────────────────────────────────────────────┐
  │  SPRZEDAŻOWE                              82%        │
  │  ████████████████░░░░░░░░  3/4 lekcji               │
  │                                                      │
  │  TECHNICZNE                                0%        │
  │  ░░░░░░░░░░░░░░░░░░░░░░░░  0/6 lekcji               │
  └──────────────────────────────────────────────────────┘
```

## Szczegóły implementacji

### Struktura komponentu (jeden plik: TeamTrainingProgressView.tsx)

1. **Stan expandedUsers** — `Set<string>` z user_id aktualnie rozwiniętych kart (identycznie jak `expandedUsers` w TrainingManagement)

2. **Funkcja toggleUserExpanded** — przełącza danego użytkownika w/out zestawu

3. **Layout** — `grid grid-cols-1 md:grid-cols-2 gap-4` zamiast tabeli

4. **Collapsible trigger** — karta osoby z:
   - Avatar z inicjałami (tak jak w adminie — `Avatar` + `AvatarFallback`)
   - Imię i nazwisko + EQ ID
   - Badge z ogólnym % (kolor: żółty gdy w trakcie, zielony gdy 100%)
   - Ikona `ChevronDown` z rotacją przy otwarciu
   - Rola i poziom jako małe badge'e pod nazwiskiem

5. **CollapsibleContent** — lista modułów z:
   - Nazwa modułu + % jako Badge
   - `x/y lekcji` informacja
   - Pasek postępu (Progress component)
   - Brak przycisków admin (reset/zatwierdź) — lider tylko przegląda

6. **Filtr modułów** — Select pozostaje, ale filtruje karty (gdy filtr aktywny → ukryj moduły nienależące do filtru w rozwiniętych kartach)

7. **Wyszukiwarka** — zostaje bez zmian

8. **Karty statystyk (stats)** — zostają na górze bez zmian

### Import wymagany do dodania
- `Avatar, AvatarFallback` z `@/components/ui/avatar`  
- `Collapsible, CollapsibleContent, CollapsibleTrigger` z `@/components/ui/collapsible`
- `ChevronDown` z `lucide-react`

### Usunięcie
- Całość `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` — nie potrzebne
- Warunkowe renderowanie `moduleFilter === 'all'` w tabeli — logika uproszczona

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/training/TeamTrainingProgressView.tsx` | Podmiana tabeli na siatka Collapsible kart — identyczny wzorzec jak w TrainingManagement.tsx linie 1671-1883 |

## Efekt końcowy

Widok będzie identyczny jak w panelu admina — karty z avatarami, rozwijane po kliknięciu, z listą modułów i paskami postępu wewnątrz.
