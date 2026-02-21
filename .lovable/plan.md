

# Natychmiastowa edycja w "Wsparcie i pomoc"

## Problem

Komponent `EditableTextElement` uzywa lokalnego stanu `editValue` i przekazuje zmiany do rodzica (`onChange`) **tylko po kliknieciu "Zastosuj"**. Uzytkownik oczekuje, ze tekst bedzie sie aktualizowal w podgladzie natychmiast podczas wpisywania, a zapis do bazy nastapi automatycznie (debounce juz dziala).

## Rozwiazanie

Zmodyfikowac `EditableTextElement` aby wywolywalo `onChange` przy kazdej zmianie tekstu (na kazdym keystroke), nie tylko po kliknieciu "Zastosuj". Przycisk "Zastosuj" zamknie popover (potwierdzenie edycji).

## Plik do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/support-editor/EditableTextElement.tsx` | Wywolywac `onChange` na kazdym keystroke zamiast tylko na "Zastosuj". Przycisk "Zastosuj" zamknie popover. |

## Szczegoly techniczne

W `EditableTextElement.tsx`:

1. Zmienic handler `onChange` w `Input`/`Textarea` aby od razu propagowal wartosc do rodzica:

```typescript
const handleChange = (newValue: string) => {
  setEditValue(newValue);
  onChange(newValue); // propaguj natychmiast
};
```

2. Przycisk "Zastosuj" zostaje jako sposob zamkniecia popovera (potwierdzenie zakonczenia edycji).

3. Dzieki temu lancuch dziala:
   - Uzytkownik wpisuje tekst -> `onChange` aktualizuje `settings` w rodzicu -> podglad sie aktualizuje natychmiast
   - Po 1 sekundzie od ostatniej zmiany -> debounced auto-save zapisuje do bazy

