

# Plan: Poprawki formularza Zdrowa Wiedza

## Zidentyfikowane problemy

1. **Brak legendy zmiennych** - lista zmiennych jest widoczna, ale brak opisu co każda oznacza
2. **Bezużyteczne pola "Imię odbiorcy" i "Email"** - w dialogu udostępniania są pola, które nie mają zastosowania w szablonie wiadomości
3. **Błędna logika "Tylko Admin"** - obecnie włączenie tej opcji automatycznie wyłącza wszystkie inne role, a powinno być możliwe łączenie Admin + inne role

## Proponowane zmiany

### 1. Legenda zmiennych szablonu

**Lokalizacja:** `src/components/admin/HealthyKnowledgeManagement.tsx` linia 976-978

**Przed:**
```text
💡 Dostępne zmienne: {title}, {description}, {share_url}, {otp_code}, {validity_hours}, {partner_name}
```

**Po:**
```text
┌──────────────────────────────────────────────────────────────┐
│ 💡 Legenda zmiennych:                                        │
│                                                              │
│ {title}          - Tytuł materiału                           │
│ {description}    - Opis materiału                            │
│ {share_url}      - Link do materiału                         │
│ {otp_code}       - Wygenerowany kod OTP                      │
│ {validity_hours} - Czas ważności kodu (w godzinach)          │
│ {partner_name}   - Imię i nazwisko partnera udostępniającego │
└──────────────────────────────────────────────────────────────┘
```

Implementacja jako lista z formatowaniem:
```tsx
<div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
  <p className="font-medium">💡 Legenda zmiennych:</p>
  <ul className="grid grid-cols-1 gap-0.5 font-mono text-[11px]">
    <li><span className="text-primary">{'{title}'}</span> — Tytuł materiału</li>
    <li><span className="text-primary">{'{description}'}</span> — Opis materiału</li>
    <li><span className="text-primary">{'{share_url}'}</span> — Link do materiału</li>
    <li><span className="text-primary">{'{otp_code}'}</span> — Wygenerowany kod OTP</li>
    <li><span className="text-primary">{'{validity_hours}'}</span> — Czas ważności kodu (godziny)</li>
    <li><span className="text-primary">{'{partner_name}'}</span> — Imię i nazwisko partnera</li>
  </ul>
</div>
```

### 2. Usunięcie pól "Imię odbiorcy" i "Email"

**Lokalizacja:** `src/pages/HealthyKnowledge.tsx`

**Elementy do usunięcia:**
- Stan: `recipientName`, `setRecipientName` (linia 44)
- Stan: `recipientEmail`, `setRecipientEmail` (linia 45)
- Cały grid z polami input (linie 377-395)

**Dialog przed:**
```text
┌─────────────────────────────────────┐
│ Udostępnij materiał                 │
├─────────────────────────────────────┤
│ [Tytuł materiału]                   │
│ Kod ważny przez 24 godzin           │
│                                     │
│ Imię odbiorcy     Email odbiorcy    │ ← USUNĄĆ
│ [           ]     [              ]  │ ← USUNĄĆ
│                                     │
│ Podgląd wiadomości                  │
│ [────────────────────────────────]  │
│ [Cześć! Mam dla Ciebie...]         │
│ [────────────────────────────────]  │
│                                     │
│            [Anuluj] [Generuj]       │
└─────────────────────────────────────┘
```

**Dialog po:**
```text
┌─────────────────────────────────────┐
│ Udostępnij materiał                 │
├─────────────────────────────────────┤
│ [Tytuł materiału]                   │
│ Kod ważny przez 24 godzin           │
│                                     │
│ Podgląd wiadomości                  │
│ [────────────────────────────────]  │
│ [Cześć! Mam dla Ciebie...]         │
│ [────────────────────────────────]  │
│                                     │
│            [Anuluj] [Generuj]       │
└─────────────────────────────────────┘
```

### 3. Zmiana logiki widoczności "Tylko Admin"

**Lokalizacja:** `src/components/admin/HealthyKnowledgeManagement.tsx` linie 816-848

**Przed (błędna logika):**
- Włączenie "Tylko Admin" → wyłącza wszystkie inne role
- Wyłączenie "Tylko Admin" → włącza "Wszyscy zalogowani"

**Po (poprawna logika):**
- Przycisk "Tylko Admin" staje się zwykłym przełącznikiem `visible_to_admin`
- Można łączyć: Admin + Partner, Admin + Klient, itp.
- Etykieta zmienia się na "Administratorzy"
- Usunięcie automatycznego wyłączania innych ról

**Nowa implementacja:**
```tsx
{/* Admin Toggle - teraz jako zwykła rola */}
<div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
  <div className="flex items-center gap-2">
    <Star className="w-4 h-4 text-yellow-500" />
    <Label className="font-medium">Administratorzy</Label>
  </div>
  <Switch
    checked={editingMaterial.visible_to_admin || false}
    onCheckedChange={(v) => setEditingMaterial({
      ...editingMaterial,
      visible_to_admin: v,
    })}
  />
</div>
```

**Aktualizacja komunikatu pomocniczego:**
```tsx
<p className="text-xs text-muted-foreground">
  💡 Wybierz role, które mają widzieć materiał. Możesz wybrać wiele ról jednocześnie.
</p>
```

### 4. Aktualizacja badge'a w tabeli

**Lokalizacja:** `src/components/admin/HealthyKnowledgeManagement.tsx` linie 415-430

Zmiana warunku wyświetlania badge "Admin" - teraz pokazuje się zawsze gdy `visible_to_admin = true`:

```tsx
{material.visible_to_admin && (
  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
    <Star className="w-3 h-3 mr-1" />
    Admin
  </Badge>
)}
```

## Pliki do edycji

| Plik | Zmiany |
|------|--------|
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Legenda zmiennych + logika "Admin" + badge |
| `src/pages/HealthyKnowledge.tsx` | Usunięcie pól recipientName/recipientEmail |

## Sekcja techniczna

### Zmiany w HealthyKnowledgeManagement.tsx

**1. Legenda zmiennych (linie 976-978)**

Zamiana:
```tsx
<p className="text-xs text-muted-foreground">
  💡 Dostępne zmienne: {'{title}'}, {'{description}'}, {'{share_url}'}, {'{otp_code}'}, {'{validity_hours}'}, {'{partner_name}'}
</p>
```

Na:
```tsx
<div className="text-xs text-muted-foreground space-y-1.5 p-3 bg-muted/50 rounded-lg border">
  <p className="font-medium mb-2">💡 Legenda zmiennych:</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 font-mono text-[11px]">
    <div><span className="text-primary">{'{title}'}</span> — Tytuł materiału</div>
    <div><span className="text-primary">{'{description}'}</span> — Opis materiału</div>
    <div><span className="text-primary">{'{share_url}'}</span> — Link do materiału</div>
    <div><span className="text-primary">{'{otp_code}'}</span> — Kod dostępu OTP</div>
    <div><span className="text-primary">{'{validity_hours}'}</span> — Czas ważności (godz.)</div>
    <div><span className="text-primary">{'{partner_name}'}</span> — Imię partnera</div>
  </div>
</div>
```

**2. Logika widoczności Admin (linie 816-848)**

Zamiana złożonej logiki na prostą:
```tsx
<div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
  <div className="flex items-center gap-2">
    <Star className="w-4 h-4 text-yellow-500" />
    <Label className="font-medium">Administratorzy</Label>
  </div>
  <Switch
    checked={editingMaterial.visible_to_admin || false}
    onCheckedChange={(v) => setEditingMaterial({
      ...editingMaterial,
      visible_to_admin: v,
    })}
  />
</div>
```

**3. Komunikat pomocniczy (linia 891-893)**

Zamiana:
```tsx
<p className="text-xs text-muted-foreground">
  💡 "Tylko Admin" ukrywa materiał przed wszystkimi innymi rolami.
</p>
```

Na:
```tsx
<p className="text-xs text-muted-foreground">
  💡 Wybierz role, które mają widzieć materiał. Można wybrać wiele ról jednocześnie.
</p>
```

**4. Badge w tabeli (około linia 415-430)**

Zmiana warunku z:
```tsx
{material.visible_to_admin && 
 !material.visible_to_everyone && 
 !material.visible_to_partner && 
 !material.visible_to_client && 
 !material.visible_to_specjalista && (
```

Na:
```tsx
{material.visible_to_admin && (
```

### Zmiany w HealthyKnowledge.tsx

**Usunięcie stanów (linie 44-45):**
```tsx
// USUNĄĆ:
const [recipientName, setRecipientName] = useState('');
const [recipientEmail, setRecipientEmail] = useState('');
```

**Usunięcie inputów (linie 377-395):**
```tsx
// USUNĄĆ cały blok:
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="text-sm font-medium">Imię odbiorcy (opcjonalnie)</label>
    <Input ... />
  </div>
  <div>
    <label className="text-sm font-medium">Email odbiorcy (opcjonalnie)</label>
    <Input ... />
  </div>
</div>
```

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| Zmienne szablonu | Lista bez wyjaśnień | Legenda z opisami każdej zmiennej |
| Pola odbiorcy | Imię + Email (nieużywane) | Usunięte |
| Widoczność Admin | Wyklucza inne role | Można łączyć z innymi rolami |
| Badge Admin | Tylko gdy sam Admin | Zawsze gdy Admin zaznaczony |
| Etykieta | "Tylko Admin" | "Administratorzy" |

