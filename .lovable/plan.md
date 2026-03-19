

# Plan: Edycja inline na podglądzie strony partnera

## Problem
Obecnie podgląd strony partnera (`/:alias`) jest w pełni read-only. Komponent `PartnerPageInlineEditor` istnieje tylko w dashboardzie jako karta z formularzem — nie jest zintegrowany z podglądem strony. Kliknięcie elementu na podglądzie nic nie robi.

## Rozwiązanie
Dodać tryb edycji na żywo w podglądzie strony partnera. Gdy zalogowany partner otwiera swoją stronę, edytowalne elementy (oznaczone przez admina w `editable_fields`) będą miały widoczne nakładki z ikoną ✏️. Kliknięcie otwiera popover/inline editor do zmiany treści.

## Zmiany

### 1. `src/pages/PartnerPage.tsx` — wykrycie właściciela + tryb edycji
- Sprawdzić czy `auth.uid() === page.user_id`
- Jeśli tak — wyświetlić floating toolbar "Tryb edycji" z przyciskiem Zapisz
- Załadować `custom_data` jako edytowalny stan
- Przekazać kontekst edycji do sekcji

### 2. Nowy wrapper `src/components/partner-page/EditableWrapper.tsx`
- Opakowuje każdą sekcję na podglądzie
- Skanuje `config.editable_fields` — jeśli są pola, dodaje nakładkę hover z ikoną ✏️
- Kliknięcie otwiera popover z polami do edycji (Input/Textarea)
- Po zatwierdzeniu aktualizuje `custom_data` w stanie rodzica

### 3. Aktualizacja sekcji renderujących
W `PartnerPage.tsx` owinąć każdą sekcję w `EditableWrapper`:
```tsx
// Było:
<HeroSection key={el.id} config={cfg} />

// Będzie (gdy właściciel):
<EditableWrapper
  elementId={el.id}
  config={baseCfg}
  overrides={customData[el.id]}
  onSave={(fieldName, value) => updateField(el.id, fieldName, value)}
  isEditing={isOwner}
>
  <HeroSection config={cfg} />
</EditableWrapper>
```

### 4. Zapis zmian
- Floating toolbar z przyciskiem "Zapisz zmiany" — zapisuje `custom_data` do `partner_pages` w Supabase
- Auto-save nie jest potrzebny — partner klika "Zapisz" gdy skończy edycję

## Pliki do zmiany/utworzenia

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/EditableWrapper.tsx` | **Nowy** — wrapper z nakładką edycji i popoverem |
| `src/pages/PartnerPage.tsx` | Dodać detekcję właściciela, stan edycji, floating toolbar, owinięcie sekcji |

## Efekt
- Partner otwiera podgląd swojej strony → widzi swoją stronę z delikatnymi nakładkami na edytowalnych polach
- Kliknięcie nakładki → popover z polem tekstowym do edycji
- Przycisk "Zapisz" → zapis do bazy
- Osoby postronne widzą stronę bez nakładek (read-only)

