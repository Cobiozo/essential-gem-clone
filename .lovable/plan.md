

# Fikcyjni uczestnicy + czat na auto-webinarze

## Zakres

Dwa nowe elementy widoczne dla uczestników podczas transmisji:

1. **Licznik uczestników** (prawy gorny rog) — fikcyjna liczba z zakresu ustawionego przez admina, zmieniajaca sie co 10-20 sekund
2. **Panel czatu** (wysuwany z prawej, styl Zoom) — uczestnik moze pisac wiadomosci, a fikcyjne wiadomosci pojawiaja sie automatycznie wg harmonogramu admina

## Zmiany w bazie danych

### Nowe kolumny w `auto_webinar_config`:
- `fake_participants_min` INTEGER DEFAULT 45
- `fake_participants_max` INTEGER DEFAULT 120
- `fake_participants_enabled` BOOLEAN DEFAULT true
- `fake_chat_enabled` BOOLEAN DEFAULT true

### Nowa tabela `auto_webinar_fake_messages`:
```sql
CREATE TABLE auto_webinar_fake_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES auto_webinar_config(id) ON DELETE CASCADE,
  appear_at_minute INTEGER NOT NULL,  -- minuta od startu slotu
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
RLS: SELECT dla anon+authenticated, INSERT/UPDATE/DELETE dla authenticated (admin sprawdzany w UI).

Seed ~40 domyslnych wiadomosci (poczatkowe: "Dzien dobry!", "Witam serdecznie", "Pozdrowienia z Lodzi"; srodkowe: "Swietna prezentacja", "Bardzo ciekawe"; koncowe: "Dziekuje za spotkanie", "Na pewno sie odezwe do partnera", "Do zobaczenia").

## Nowe komponenty

### `AutoWebinarParticipantCount.tsx`
- Wyswietla ikonke Users + liczbe w prawym gornym rogu overlaya wideo
- Hook `useFakeParticipantCount(min, max)` — co 10-20s losuje nowa liczbe z zakresu, plynna zmiana
- Widoczny tylko podczas odtwarzania

### `AutoWebinarFakeChat.tsx`
- Przycisk "Czat" w prawym dolnym rogu (ikona MessageSquare)
- Klikniecie wysuwa panel z prawej (overlay, nie zmienia layoutu wideo)
- Lista wiadomosci: fikcyjne pojawiaja sie automatycznie wg `appear_at_minute` vs aktualny `startOffset`
- Pole tekstowe na dole — uczestnik moze pisac (wiadomosci widoczne tylko lokalnie, nie zapisywane)
- Styl: ciemne tlo, awatary z inicjalami, dymki — jak Zoom chat

### Hook `useAutoWebinarFakeChat.ts`
- Pobiera wiadomosci z `auto_webinar_fake_messages` dla danego config_id
- Na podstawie `startOffset` (czas w sekundach od poczatku slotu) filtruje ktore wiadomosci juz powinny byc widoczne
- Co sekunde sprawdza czy nowa wiadomosc powinna sie pojawic (efekt "ktos pisze")

## Admin UI — nowe sekcje w "Wyglad pokoju"

### Sekcja "Fikcyjni uczestnicy"
- Switch wl/wyl
- Dwa inputy: min i max (np. 45–120)

### Sekcja "Czat fikcyjny"  
- Switch wl/wyl
- Tabela wiadomosci: minuta | autor | tresc | akcje (edytuj/usun)
- Przycisk "Dodaj wiadomosc"
- Przycisk "Zaladuj domyslne" — wstawia ~40 predefiniowanych wiadomosci

## Zmiany w istniejacych plikach

| Plik | Zmiana |
|---|---|
| Migration SQL | Nowe kolumny + nowa tabela + seed |
| `src/types/autoWebinar.ts` | Nowe pola w `AutoWebinarConfig`, nowy typ `AutoWebinarFakeMessage` |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Dodanie `AutoWebinarParticipantCount` na overlay wideo + przycisk/panel czatu |
| `src/components/auto-webinar/AutoWebinarParticipantCount.tsx` | Nowy komponent |
| `src/components/auto-webinar/AutoWebinarFakeChat.tsx` | Nowy komponent |
| `src/hooks/useAutoWebinarFakeChat.ts` | Nowy hook |
| `src/components/admin/AutoWebinarManagement.tsx` | Nowe sekcje konfiguracji |
| `src/integrations/supabase/types.ts` | Aktualizacja typow |

## UX uczestnika

```text
┌─────────────────────────────────────────────┐
│ Logo  Szansa biznesowa          👥 87  LIVE │
│─────────────────────────────────────────────│
│                                             │
│              [WIDEO]                   💬   │
│                                             │
│─────────────────────────────────────────────│
│ Po spotkaniu skontaktuj sie...              │
└─────────────────────────────────────────────┘

Po kliknieciu 💬:
┌──────────────────────┬──────────────────────┐
│                      │ Czat spotkania    ✕  │
│      [WIDEO]         │ AK: Dzien dobry!     │
│                      │ MW: Witam wszystkich  │
│                      │ ...                   │
│                      │ [Napisz wiadomosc...] │
└──────────────────────┴──────────────────────┘
```

