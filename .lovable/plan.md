

# Zmiany w zakladkach i wyglad listy liderow

## 1. Zmiana nazwy zakladki "Kierunki komunikacji" na "Zarzadzanie czatem"

**Plik:** `src/components/admin/AdminSidebar.tsx` (linia 249)

Zmiana w `hardcodedLabels`:
```
chatPermissions: 'Kierunki komunikacji'  -->  chatPermissions: 'Zarządzanie czatem'
```

Dodatkowo zmiana tytulu karty w `src/components/admin/ChatPermissionsManagement.tsx` (linia 121):
```
Kierunki komunikacji  -->  Zarządzanie czatem
```

## 2. Zmiana nazwy zakladki "Powiadomienia" na "Powiadomienia systemowe"

**Plik:** `src/components/admin/AdminSidebar.tsx`

Dodanie klucza `notifications` do `hardcodedLabels`:
```
notifications: 'Powiadomienia systemowe'
```

## 3. Przebudowa listy liderow - zwijana sekcja

**Plik:** `src/components/admin/BroadcastLeadersCard.tsx`

Aktualna lista to pelna tabela ze wszystkimi partnerami widoczna od razu - przy 200+ uzytkownikach jest nieuzyteczna.

Nowy uklad:
- Pasek wyszukiwania **zawsze widoczny** na gorze
- Lista partnerow **domyslnie zwinięta** (schowana)
- Po wpisaniu frazy w wyszukiwarkę lista **automatycznie się rozwija** i pokazuje przefiltrowane wyniki
- Mozliwosc recznego rozwijania/zwijania klikajac przycisk "Pokaz liste" / "Ukryj liste"
- Uzycie komponentu `Collapsible` z Radix UI (juz zainstalowany w projekcie)
- Licznik aktywnych liderow widoczny obok tytulu (np. "3 liderow aktywnych")

### Szczegoly techniczne

- Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` z `@radix-ui/react-collapsible`
- Stan `isOpen` domyslnie `false`
- Efekt: gdy `searchQuery.length > 0` to `setIsOpen(true)`
- Tabela renderuje sie wewnatrz `CollapsibleContent`
- Przycisk rozwijania pod wyszukiwarka z ikona chevron i tekstem informacyjnym

