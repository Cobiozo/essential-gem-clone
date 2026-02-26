
## Problem

Obecnie formularze `WebinarForm` i `TeamTrainingForm` blokuja zapis gdy wykryja kolizje czasowa z innym wydarzeniem. Lider nie moze dodac wydarzenia pomimo swiadomej decyzji. System powinien jedynie ostrzegac i pozwalac liderowi zdecydowac.

## Rozwiazanie: Ostrzezenie zamiast blokady

Zmiana logiki walidacji konfliktow w obu formularzach z "blokuj zapis" na "pokaz ostrzezenie z mozliwoscia potwierdzenia".

### Jak to bedzie dzialac

1. Lider tworzy wydarzenie (webinar/szkolenie) - system sprawdza kolizje jak dotychczas
2. Jesli wykryje kolizje - wyswietla **Alert Dialog** z informacja:
   - Tytul kolidujacego wydarzenia
   - Typ wydarzenia
   - Przyciski: "Anuluj" i "Zapisz mimo kolizji"
3. Lider klika "Zapisz mimo kolizji" - wydarzenie zostaje zapisane normalnie
4. Jesli brak kolizji - zapis bez dodatkowego dialogu

```text
+------------------------------------------+
|  Wykryto kolizje czasowa                  |
|                                           |
|  W tym samym czasie odbywa sie:           |
|  "Webinar o produktach" (Webinar)         |
|                                           |
|  Czy mimo to chcesz zapisac wydarzenie?   |
|                                           |
|  [Anuluj]          [Zapisz mimo kolizji]  |
+------------------------------------------+
```

### Zmiany techniczne

**Modyfikowane pliki:**

1. **`src/components/admin/WebinarForm.tsx`** (linie ~199-217)
   - Zamiast `return` po wykryciu konfliktu, zapisz dane konfliktu w stanie
   - Dodaj stan `conflictData` i `showConflictDialog`
   - Dodaj `AlertDialog` z Radix UI (juz zainstalowany)
   - Po potwierdzeniu przez uzytkownika - kontynuuj zapis

2. **`src/components/admin/TeamTrainingForm.tsx`** (linie ~199-217)
   - Identyczna zmiana jak w WebinarForm

**Logika w obu plikach:**

```
// Nowe stany:
const [conflictData, setConflictData] = useState(null);
const [pendingSaveData, setPendingSaveData] = useState(null);

// W handleSave:
if (conflictingEvents?.length > 0) {
  setConflictData(conflictingEvents);
  setPendingSaveData(/* dane do zapisu */);
  setSaving(false);
  return; // Pokaz dialog zamiast blokowac
}

// Nowa funkcja confirmSaveWithConflict:
// Kontynuuje zapis z pendingSaveData
```

**Bez zmian:** Logika RLS, zapytania do bazy, reszta formularzy.
