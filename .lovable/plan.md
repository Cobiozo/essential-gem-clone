

# Plan: Dodanie edytora przycisków akcji do formularza webinaru

## Cel

Dodać możliwość tworzenia niestandardowych przycisków w wydarzeniach typu webinar, które prowadzą do zewnętrznych formularzy rejestracji lub platform.

## Obecny stan

| Element | Status |
|---------|--------|
| Pole `buttons` w bazie danych | Istnieje (JSON array) |
| Typ `EventButton` (label, url, style) | Zdefiniowany w `src/types/events.ts` |
| Renderowanie przycisków w `EventCardCompact` | Działa (linie 428-443) |
| Edytor przycisków w `WebinarForm` | Brak |
| Link Zoom ukrywany gdy pusty | Działa (linia 445: `if (event.zoom_link && ...`) |

## Rozwiązanie

### Zmiana 1: Nowy komponent `EventButtonsEditor`

Stworzenie uproszczonego edytora przycisków dla wydarzeń:

```
src/components/admin/EventButtonsEditor.tsx
├── Dodawanie przycisków (etykieta + URL)
├── Wybór stylu (primary/secondary/outline)
├── Usuwanie przycisków
└── Podgląd listy przycisków
```

Interfejs prostszy niż `ActionButtonsEditor` z lekcji - tylko:
- Label (nazwa przycisku)
- URL (link zewnętrzny)
- Style (primary/secondary/outline)

### Zmiana 2: Integracja z WebinarForm.tsx

Dodanie sekcji "Przyciski akcji" w formularzu webinaru:

```
Przyciski akcji (Sekcja Collapsible)
├── [+ Dodaj przycisk]
├── Przycisk 1: [Etykieta] [URL] [Styl] [🗑]
├── Przycisk 2: [Etykieta] [URL] [Styl] [🗑]
└── ...
```

Lokalizacja: po sekcji "Link do webinaru (Zoom/Teams)", przed przełącznikiem "Zezwól na zapraszanie gości".

### Przykład użycia

Administrator tworzy webinar na zewnętrznej platformie:
1. Pozostawia pole "Link do webinaru (Zoom/Teams)" puste
2. Dodaje przycisk:
   - Etykieta: "Zapisz się na webinar"
   - URL: "https://external-platform.com/register/webinar-123"
   - Styl: Primary
3. Zapisuje wydarzenie

Użytkownik widzi:
- Kartę wydarzenia z opisem
- Przycisk "Zapisz się na webinar" prowadzący do zewnętrznej strony
- Brak przycisku "Dołącz" (bo zoom_link jest pusty)

## Szczegóły techniczne

### Plik 1: `src/components/admin/EventButtonsEditor.tsx` (nowy)

```
interface EventButtonsEditorProps {
  buttons: EventButton[];
  onChange: (buttons: EventButton[]) => void;
}
```

Funkcjonalności:
- Dodawanie nowego przycisku z domyślnymi wartościami
- Edycja etykiety i URL inline
- Wybór stylu z dropdown (Primary/Secondary/Outline)
- Usuwanie przycisku z potwierdzeniem
- Limit do 5 przycisków (opcjonalnie)

### Plik 2: `src/components/admin/WebinarForm.tsx` (modyfikacja)

Dodanie importu i sekcji:

```tsx
import { EventButtonsEditor } from './EventButtonsEditor';

// W JSX, po sekcji Zoom Link:
<Collapsible>
  <CollapsibleTrigger>
    <ExternalLink className="h-4 w-4" />
    <span>Przyciski akcji</span>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <EventButtonsEditor
      buttons={form.buttons}
      onChange={(buttons) => setForm({ ...form, buttons })}
    />
  </CollapsibleContent>
</Collapsible>
```

## Przepływ danych

```text
WebinarForm (form.buttons state)
     ↓
EventButtonsEditor (edycja)
     ↓
handleSave() → buttonsJson = form.buttons.map(...)
     ↓
Supabase: events.buttons (JSON)
     ↓
EventCardCompact.renderButtons()
     ↓
Użytkownik widzi przyciski
```

## Pliki do modyfikacji

| Plik | Operacja |
|------|----------|
| `src/components/admin/EventButtonsEditor.tsx` | Nowy plik |
| `src/components/admin/WebinarForm.tsx` | Dodanie sekcji Collapsible z edytorem |

## Oczekiwany rezultat

1. Administrator może dodać dowolne przyciski do webinaru (np. "Zapisz się", "Więcej informacji")
2. Każdy przycisk prowadzi do zewnętrznego URL
3. Jeśli zoom_link jest pusty, przycisk "Dołącz" się nie wyświetla (już działa)
4. Przyciski są widoczne na karcie wydarzenia w sekcji akcji

