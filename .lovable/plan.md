

# Naprawa edytora "Wsparcie i pomoc" - natychmiastowa propagacja zmian

## Problem

Plik `SupportSettingsManagement.tsx` zawiera **wlasne lokalne komponenty** (`EditableText`, `EditableFormField`, `SortableInfoCard`), ktore przekazuja zmiany do rodzica (`onChange`) **tylko po kliknieciu "Zastosuj"**. Auto-save (debounce) dziala poprawnie, ale nigdy nie jest wyzwalany, poniewaz stan `settings` nie zmienia sie az do klikniecia "Zastosuj".

## Rozwiazanie

Zmodyfikowac **3 lokalne komponenty** w `SupportSettingsManagement.tsx` aby propagowaly zmiany natychmiast (na kazdym keystroke). Przycisk "Zastosuj" pozostaje jako sposob zamkniecia popovera.

## Plik do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/admin/SupportSettingsManagement.tsx` | Zmiany w 3 komponentach: `EditableText`, `EditableFormField`, `SortableInfoCard` |

## Szczegoly techniczne

### 1. EditableText (linie 254-330)

Dodac natychmiastowe propagowanie zmian:

```typescript
// Przed (linia 264-267):
const handleApply = () => {
  onChange(editValue);
  setIsOpen(false);
};

// Po:
const handleChange = (newValue: string) => {
  setEditValue(newValue);
  onChange(newValue);
};

const handleApply = () => {
  setIsOpen(false);
};
```

Zmienic handlery w Input/Textarea z `setEditValue(e.target.value)` na `handleChange(e.target.value)`.

### 2. EditableFormField (linie 341-407)

Dodac natychmiastowe propagowanie:

```typescript
// Przed (linia 352-356):
const handleApply = () => {
  onLabelChange(editLabel);
  onPlaceholderChange(editPlaceholder);
  setIsOpen(false);
};

// Po:
const handleLabelChange = (newValue: string) => {
  setEditLabel(newValue);
  onLabelChange(newValue);
};

const handlePlaceholderChange = (newValue: string) => {
  setEditPlaceholder(newValue);
  onPlaceholderChange(newValue);
};

const handleApply = () => {
  setIsOpen(false);
};
```

### 3. SortableInfoCard (linie 95-243)

Dodac natychmiastowe propagowanie na kazdym keystroke:

```typescript
// Przed (linia 123-131):
const handleApply = () => {
  onUpdate({ iconName, label, value, labelVisible });
  setIsOpen(false);
};

// Po - propagowac przy kazdej zmianie:
const handleFieldChange = (field: string, newValue: any) => {
  // aktualizuj lokalny stan
  // wywolaj onUpdate z aktualnymi wartosciami
};

const handleApply = () => {
  setIsOpen(false);
};
```

### Lancuch dzialania po zmianach:

1. Uzytkownik wpisuje tekst w popover
2. `handleChange` aktualizuje lokalny stan + wywoluje `onChange`/`onUpdate`
3. Rodzic aktualizuje `settings` przez `updateField`
4. `useEffect` z debounce wykrywa zmiane `settings`
5. Po 1 sekundzie auto-save zapisuje do bazy
6. Podglad aktualizuje sie natychmiast

