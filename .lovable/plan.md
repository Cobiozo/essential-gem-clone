

# Plan: Dodanie przełącznika szablonów w podglądzie

## Problem
Po skopiowaniu sekcji w podglądzie szablonu nie ma sposobu, żeby przejść do innego szablonu — podgląd otwiera się w nowej karcie i przycisk „Wróć" robi `navigate(-1)`, co nie prowadzi do listy szablonów.

## Rozwiązanie
Dodać dropdown w top barze podglądu, który pozwala szybko przełączyć się na inny szablon (bez opuszczania widoku podglądu).

## Zmiany w `src/pages/TemplatePreviewPage.tsx`

1. **Pobranie listy szablonów** — dodać zapytanie do `partner_page_template` po `id, name` w `useEffect` (obok istniejącego fetcha).

2. **Dropdown w top barze** — obok nazwy aktualnego szablonu dodać `Select` z listą wszystkich szablonów. Wybranie innego szablonu nawiguje do `/admin/template-preview/:id`.

3. **Poprawka przycisku „Wróć"** — zmienić `navigate(-1)` na `navigate('/admin?tab=partner-pages')`, żeby zawsze wracał do listy szablonów.

### Schemat UI top bara:
```text
[← Wróć do edytora]  Podgląd szablonu: [▼ Select: nazwa szablonu]     [Zapisz zmiany]
```

### Zakres zmian
| Plik | Zmiana |
|------|--------|
| `TemplatePreviewPage.tsx` | Fetch listy szablonów, dropdown w top barze, poprawka nawigacji „Wróć" |

