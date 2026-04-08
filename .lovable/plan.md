

# Audyt modułu "Kontakty prywatne" — problemy i plan uporządkowania

## Obecna architektura

Moduł "Kontakty prywatne" to zakładka w Pure-kontakty z 6 pod-zakładkami:
1. **Moja lista kontaktów** — ręcznie dodane + przeniesione z zaproszeń (`moved_to_own_list`)
2. **Z zaproszeń na Business Opportunity** — kontakty z eventów BO
3. **Z zaproszeń na Health Conversation** — kontakty z eventów HC
4. **Z zaproszeń na webinary ogólne** — kontakty z eventów bez kategorii
5. **Z Mojej Strony Partnera** — kontakty z `contact_source = 'Strona partnerska'`
6. **Usunięte** — soft-deleted (30 dni retencji)

Kontakty tworzą się automatycznie w edge function `send-webinar-confirmation` przy rejestracji gościa i ręcznie przez formularz.

---

## Zidentyfikowane problemy

### 1. Kontakt ze "Strony partnerskiej" pojawia się podwójnie
Kontakt z `contact_source = 'Strona partnerska'` wyświetla się jednocześnie w **"Moja lista kontaktów"** (bo nie ma rejestracji eventowej) ORAZ w **"Z Mojej Strony Partnera"** (bo filtr sprawdza tylko `contact_source`). Użytkownik widzi tego samego kontakta w dwóch miejscach.

### 2. Brak deduplikacji kontaktów z tego samego emaila
Baza danych pokazuje duplikaty: ten sam email pojawia się wielokrotnie z różnych źródeł (np. `test@example.com` — 3x Strona partnerska, `sebastiansnopek87@gmail.com` — 2x Strona partnerska). Edge function **zawsze tworzy nowy kontakt** bez sprawdzania czy już istnieje na "Mojej liście". To generuje bałagan.

### 3. Niespójność filtru "Moja lista kontaktów"
Filtr `ownContacts` to: `privateContacts.filter(c => !eventContactIds.has(c.id) || moved_to_own_list)`. Ale kontakty ze Strony partnerskiej nie mają rejestracji eventowej — więc automatycznie wpadają do "Mojej listy", mimo że powinny być widoczne tylko w dedykowanej zakładce, dopóki użytkownik ich nie przeniesie.

### 4. "Przenieś do Mojej listy" — niejasna logika
Akcja `moveToOwnList` ustawia flagę `moved_to_own_list: true` — ale kontakt nadal ma tę samą `contact_source`. Nie jest jasne co się dzieje z historią, przypomnieniami i statusem relacji po przeniesieniu.

### 5. Filtr `contactType` działa globalnie na fetch
Gdy aktywna jest zakładka "private", hook `useTeamContacts` ustawia `filters.contactType = 'private'` co ogranicza query do `contact_type = 'private'`. To poprawne, ale powoduje że zmiana na zakładkę "team" triggeruje pełny refetch zamiast używać danych już w pamięci.

### 6. Limit 100 kontaktów — potencjalnie obcina dane
Query ma `.limit(100)`. Partnerzy z wieloma rejestracjami mogą mieć >100 kontaktów prywatnych, tracąc widoczność najstarszych.

### 7. Brak wyraźnego statusu "skąd przyszedł kontakt" w UI
Kontakty na "Mojej liście" nie pokazują źródła (auto-webinar, strona partnerska, ręczny). Użytkownik nie wie skąd wziął się dany kontakt po przeniesieniu.

---

## Plan uporządkowania

### Krok 1: Wyeliminować podwójne wyświetlanie kontaktów ze Strony partnerskiej
W `TeamContactsTab.tsx` zmienić filtr `ownContacts` aby wykluczać kontakty z `contact_source = 'Strona partnerska'` (chyba że mają `moved_to_own_list = true`):
```
const ownContacts = privateContacts.filter(c =>
  (!eventContactIds.has(c.id) || c.moved_to_own_list) &&
  (c.contact_source !== 'Strona partnerska' || c.moved_to_own_list)
);
```

### Krok 2: Dodać "Przenieś do Mojej listy" na zakładce Strona partnerska
Komponent wyświetlający kontakty ze strony partnerskiej powinien mieć taką samą akcję przenoszenia jak zakładki eventowe (BO/HC/ogólne).

### Krok 3: Pokazać źródło kontaktu na "Mojej liście"
Po przeniesieniu kontaktu — wyświetlić badge z oryginalnym źródłem (np. "Auto-webinar 08.04", "Strona partnerska") w widoku accordion/tabela.

### Krok 4: Deduplikacja przy tworzeniu ze Strony partnerskiej
W edge function/komponencie tworzącym kontakty ze Strony partnerskiej — sprawdzić czy kontakt z tym emailem już istnieje u danego partnera. Jeśli tak — aktualizować notatki/datę zamiast tworzyć duplikat.

### Krok 5: Zwiększyć limit lub usunąć go
Zmienić `.limit(100)` na `.limit(500)` lub usunąć limit, dodając paginację jeśli wydajność spadnie.

### Krok 6: Usprawnić filtry pod-zakładek (refaktor drobny)
Zamiast aktualnego systemu z wieloma `Set<string>` (eventContactIds, eventContactIdsBO, eventContactIdsHC, eventContactIdsGeneral), rozważyć pojedynczą mapę `contactId → category[]` co uprości logikę i zapobiegnie "wypadaniu" kontaktów między zakładkami.

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/TeamContactsTab.tsx` | Filtr ownContacts, badge źródła, akcja przenoszenia na zakładce Strona partnerska |
| `src/hooks/useTeamContacts.ts` | Limit, uproszczenie kategoryzacji |
| `src/components/team-contacts/EventGroupedContacts.tsx` | Ewentualny reuse dla kontaktów ze Strony partnerskiej |
| Edge function (opcjonalnie) | Deduplikacja kontaktów ze Strony partnerskiej |

