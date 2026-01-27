
# Plan: Dodanie przełącznika kontrolującego przycisk "Zapisz się"

## Zidentyfikowany problem

Przycisk "Zapisz się" zawsze się wyświetla dla webinarów, mimo że rejestracja odbywa się na zewnętrznej platformie. Przyczyna:

| Komponent | Warunek wyświetlania przycisku |
|-----------|--------------------------------|
| `EventCardCompact.tsx` (linia 461) | `event.requires_registration && isUpcoming && ...` |
| `WebinarForm.tsx` | **Brak przełącznika** - domyślnie `requires_registration: true` |
| `TeamTrainingForm.tsx` (linia 612) | **Ma przełącznik** - "Wymagaj rejestracji uczestników" |

## Rozwiązanie

Dodanie przełącznika "Wymagaj rejestracji uczestników" do formularza webinaru, analogicznie jak w formularzu spotkań zespołowych.

### Zmiana w WebinarForm.tsx

Dodanie nowego przełącznika Switch po sekcji "Przyciski akcji":

```
Przyciski akcji (Collapsible)
└─ EventButtonsEditor

[NOWY] ✅ Wymagaj rejestracji uczestników (wewnętrzny system)
       └─ Wyłącz, gdy rejestracja odbywa się na zewnętrznej platformie

✅ Zezwól na zapraszanie gości
✅ Opublikuj natychmiast
```

### Zachowanie

| `requires_registration` | Efekt |
|------------------------|-------|
| ✅ Włączony (domyślnie) | Przycisk "Zapisz się" widoczny → rejestracja w wewnętrznym systemie |
| ❌ Wyłączony | Przycisk "Zapisz się" ukryty → można używać zewnętrznych przycisków akcji |

## Przepływ użytkownika

Administrator tworzy webinar z zewnętrzną rejestracją:
1. Wypełnia dane webinaru
2. Dodaje przycisk akcji "Przejdź i zapisz się w EQApp" z linkiem zewnętrznym
3. **Wyłącza** przełącznik "Wymagaj rejestracji uczestników"
4. Zapisuje

Użytkownik widzi:
- Przycisk "Przejdź i zapisz się w EQApp" ✅
- Brak przycisku "Zapisz się" ✅

## Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/WebinarForm.tsx` | Dodanie przełącznika `requires_registration` po sekcji "Przyciski akcji" |

## Kod zmiany

```tsx
{/* Po sekcji Collapsible z przyciskami akcji */}

{/* Internal registration toggle */}
<div className="flex items-center gap-3">
  <Switch
    checked={form.requires_registration}
    onCheckedChange={(checked) => setForm({ ...form, requires_registration: checked })}
  />
  <Label className="text-muted-foreground">
    Wymagaj rejestracji uczestników (wewnętrzny system)
  </Label>
</div>

{/* Allow invites toggle - już istnieje */}
```

## Oczekiwany rezultat

1. Administrator może wyłączyć wewnętrzny system rejestracji dla webinarów zewnętrznych
2. Przycisk "Zapisz się" nie będzie wyświetlany gdy `requires_registration = false`
3. Przyciski akcji (np. link do zewnętrznej platformy) będą nadal widoczne
