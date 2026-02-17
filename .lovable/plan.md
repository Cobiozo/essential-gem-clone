

# Naprawa tlumaczen AI i poprawka wygladu panelu

## Problem 1: Tlumaczenia AI nie dzialaja

Blad w logach edge function:
```
ReferenceError: processTrainingJob is not defined
ReferenceError: processKnowledgeJob is not defined
```

**Przyczyna**: W pliku `background-translate/index.ts` funkcja `translateBatch` (linia 758) nie ma zamykajacego nawiasu `}`. Przez to funkcje `processTrainingJob`, `processKnowledgeJob`, `processHealthyKnowledgeJob` i `translateGenericBatch` sa zdefiniowane WEWNATRZ `translateBatch` i sa niewidoczne na poziomie modulu. Na koncu pliku (linie 1030-1034) sa nadmiarowe nawiasy zamykajace.

**Naprawa**: Dodac brakujacy `}` po linii 848, usunac nadmiarowe linie 1030-1034.

## Problem 2: Wyglad panelu "Tresci dynamiczne"

Panel wyswietla 180 zasobow jako plaska lista kart — kazda z 3 polami edycji, co daje ogromna ilosc przewijania. Brak struktury, podsumowania statusu, stronicowania.

**Naprawa**:
- Dodac zwijane sekcje (Accordion) zamiast wyswietlania wszystkich elementow naraz
- Pokazac badge ze statusem tlumaczenia obok kazdego elementu (przetlumaczony / brak)
- Ograniczyc widoczne elementy do np. 20 na strone z przyciskami "Pokaz wiecej"
- Dodac wyszukiwanie po tytule
- Poprawic uklad: lepszy odstep, kompaktowe karty, ikony statusu
- Dodac pasek postepu tlumaczenia AI (z useTranslationJobs) widoczny w gornej czesci

## Szczegoly techniczne

### Plik: `supabase/functions/background-translate/index.ts`

Naprawa struktury nawiasow:

```text
// Linia 848: dodac zamykajacy nawias funkcji translateBatch
    }
  }
}   // <-- brakujacy nawias zamykajacy translateBatch

// ============ TRAINING JOB ============
async function processTrainingJob(...)
```

Usuniecie nadmiarowych linii 1030-1034:
```text
// TE LINIE DO USUNIECIA:
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
}
```

### Plik: `src/components/admin/DynamicContentTranslation.tsx`

Przepisanie komponentu z:
- Wyszukiwarke tekstowa filtrujaca elementy po tytule
- Elementy pokazywane po 20 z przyciskiem "Pokaz wiecej"
- Kompaktowy widok: tytul + badge statusu (zielony jesli przetlumaczony, szary jesli nie)
- Rozwijanie edytora po kliknieciu w element (zamiast pokazywania wszystkich pol naraz)
- Pasek postepu z useTranslationJobs w gornej czesci gdy zadanie jest aktywne
- Licznik: "Przetlumaczono X z Y elementow"

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/background-translate/index.ts` | Naprawa brakujacego `}` i usuniecie nadmiarowych linii |
| `src/components/admin/DynamicContentTranslation.tsx` | Przeprojektowanie UI: wyszukiwanie, paginacja, zwijane karty, status badge, pasek postepu |

