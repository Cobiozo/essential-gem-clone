

# Redesign: Panel Lidera — zarządzanie uprawnieniami

## Problem

Obecny widok to płaska lista **wszystkich partnerów** (nawet tych bez żadnych uprawnień), każdy z badge "0/22". Admin musi klikać w każdego, żeby sprawdzić co ma włączone. Brak podziału na aktywnych liderów vs. resztę. Brak szybkiego przeglądu "kto ma co".

## Proponowane rozwiązanie

### 1. Podział na dwie sekcje (jak w Auto-Webinar)

```text
┌──────────────────────────┐  ┌──────────────────────────┐
│ 👑 Aktywni liderzy (5)   │  │ 👤 Bez uprawnień (87)    │
│                          │  │                          │
│ ┌──────────────────────┐ │  │ Szukaj...                │
│ │ Jan Kowalski   18/22 │ │  │                          │
│ │ Spotkania, Szkolenia,│ │  │ Ewa Nowak         [+]    │
│ │ Struktura, ...       │ │  │ Adam Wiśniewski   [+]    │
│ │        [Edytuj]      │ │  │ ...                      │
│ └──────────────────────┘ │  │                          │
│ ┌──────────────────────┐ │  │                          │
│ │ Anna Nowak     12/22 │ │  │                          │
│ │ ...                  │ │  │                          │
│ └──────────────────────┘ │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

- **Lewa kolumna**: Partnerzy z ≥1 uprawnieniem — od razu widać jakie mają (lista badge'ów z nazwami aktywnych uprawnień)
- **Prawa kolumna**: Partnerzy bez żadnych uprawnień — kompaktowa lista z przyciskiem "Nadaj uprawnienia"

### 2. Karty aktywnych liderów z widocznymi uprawnieniami

Każdy aktywny lider jako karta z:
- Imię, nazwisko, email
- **Badge'e aktywnych uprawnień** (np. `Spotkania` `Szkolenia` `Struktura`) — widoczne od razu bez rozwijania
- Licznik X/22
- Przycisk "Edytuj" otwierający rozwijany panel z pełną listą switchy (jak teraz)
- Przyciski "Włącz/Wyłącz wszystko"

### 3. Szybkie filtry / widok uprawnień

Nad listą aktywnych liderów — filtr po uprawnieniu:
- Dropdown/chips: "Pokaż liderów z uprawnieniem: Spotkania / Szkolenia / Auto-Webinar / ..."
- Pozwala adminowi szybko sprawdzić "kto ma dostęp do X"

### 4. Przycisk "Nadaj uprawnienia" w prawej kolumnie

Kliknięcie przenosi partnera do edycji (otwiera panel switchy), po zapisaniu partner przesuwa się do lewej kolumny.

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/LeaderPanelManagement.tsx` | Przebudowa layoutu na 2 kolumny, dodanie badge'ów uprawnień, filtrów |

## Szczegóły techniczne

- Logika danych i zapytania Supabase **bez zmian** — przebudowa dotyczy tylko warstwy UI
- Podział `filtered` na `withPerms = filtered.filter(p => countActive(p) > 0)` i `withoutPerms`
- Badge'e uprawnień: mapowanie `columns.filter(col => partner[col.key]).map(col => col.label)`
- Filtr po uprawnieniu: stan `selectedPermFilter: string | null`, dodatkowe filtrowanie `withPerms`
- Collapsible z edycją switchy pozostaje wewnątrz kart aktywnych liderów
- Layout: `grid grid-cols-1 lg:grid-cols-2` (jak w AutoWebinarAccessManagement)

