

# Plan: Podfoldery językowe dla Dokumentów Edukacyjnych

## Cel

Umożliwić organizację dokumentów edukacyjnych według języka (7 języków: PL, EN, DE, IT, ES, FR, PT), aby admin mógł wrzucać dokumenty do odpowiednich podfolderów językowych, a użytkownicy widzieli tylko dokumenty w swoim wybranym języku.

---

## Aktualny stan

### Struktura danych `knowledge_resources`
- Dokumenty przechowywane w tabeli `knowledge_resources`
- Brak pola `language_code` - wszystkie dokumenty traktowane jako uniwersalne
- Kategorie: Dokumenty firmowe, Materiały szkoleniowe, Formularze, Instrukcje, Prezentacje, itd.
- 15 dokumentów edukacyjnych w systemie (głównie PDF)

### Języki w systemie
Tabela `i18n_languages` zawiera 7 aktywnych języków:
- PL (Polski), EN (English), DE (German), IT (Italian), ES (Spanish), FR (French), PT (Portuguese)

---

## Rozwiązanie

### 1. Dodanie kolumny `language_code` do tabeli `knowledge_resources`

```sql
ALTER TABLE knowledge_resources 
ADD COLUMN language_code TEXT DEFAULT 'pl';
```

**Uwagi:**
- Domyślna wartość `'pl'` - istniejące dokumenty będą traktowane jako polskie
- Wartość `'all'` lub `NULL` oznacza dokument uniwersalny (widoczny we wszystkich językach)

### 2. Aktualizacja typów TypeScript

W pliku `src/types/knowledge.ts`:
```typescript
export interface KnowledgeResource {
  // ... istniejące pola
  language_code: string | null; // NOWE: 'pl', 'en', 'de', 'it', 'es', 'fr', 'pt' lub null (wszystkie)
}
```

### 3. Panel Admina - nowy selektor języka

W `KnowledgeResourcesManagement.tsx`:

**A) Dodanie pola wyboru języka w formularzu edycji:**
- Nowy selektor "Język dokumentu" w zakładce "Podstawowe"
- Opcje: "Wszystkie języki" + 7 języków z flagami
- Pozycja: obok selektora kategorii

**B) Dodanie filtra językowego na liście zasobów:**
- Nowy dropdown "Filtruj wg języka" obok filtra kategorii
- Pozwala adminowi szybko zobaczyć dokumenty w konkretnym języku

**C) Wizualna identyfikacja języka:**
- Badge z kodem języka i flagą przy każdym dokumencie na liście

### 4. Widok użytkownika - filtrowanie wg języka

W `KnowledgeCenter.tsx`:

**A) Automatyczne filtrowanie:**
- Dokumenty wyświetlane zgodnie z językiem wybranym przez użytkownika (z `LanguageSelector`)
- Dokumenty oznaczone jako "Wszystkie języki" widoczne zawsze

**B) Ręczny filtr językowy (opcjonalnie):**
- Dropdown pozwalający użytkownikowi wybrać inny język
- Przydatne gdy ktoś chce pobrać dokument w konkretnym języku

---

## Diagram struktury podfolderów

```text
📁 Dokumenty edukacyjne
│
├── 🇵🇱 Polski (PL)
│   ├── Dokumenty firmowe
│   │   └── Regulamin.pdf
│   ├── Materiały szkoleniowe
│   │   └── Przewodnik_startowy.pdf
│   └── Formularze
│       └── Wniosek_o_e-book.pdf
│
├── 🇬🇧 English (EN)
│   ├── Dokumenty firmowe
│   │   └── Terms_and_Conditions.pdf
│   └── Materiały szkoleniowe
│       └── Getting_Started_Guide.pdf
│
├── 🇩🇪 Deutsch (DE)
│   └── Materiały szkoleniowe
│       └── Einführungshandbuch.pdf
│
├── 🇮🇹 Italiano (IT)
│   └── ...
│
├── 🇪🇸 Español (ES)
│   └── ...
│
├── 🇫🇷 Français (FR)
│   └── ...
│
├── 🇵🇹 Português (PT)
│   └── ...
│
└── 🌐 Wszystkie języki (uniwersalne)
    └── Logo_guidelines.pdf
```

---

## Zmiany w plikach

### Baza danych (migracja SQL)
| Zmiana | Opis |
|--------|------|
| `ALTER TABLE` | Dodanie kolumny `language_code TEXT DEFAULT 'pl'` |
| Aktualizacja RLS | Brak zmian (używa istniejących reguł widoczności) |

### Frontend

| Plik | Zmiana |
|------|--------|
| `src/types/knowledge.ts` | Dodanie pola `language_code` do interfejsu |
| `src/integrations/supabase/types.ts` | Automatyczna regeneracja z nową kolumną |
| `src/components/admin/KnowledgeResourcesManagement.tsx` | Selektor języka w formularzu + filtr na liście + badge językowy |
| `src/pages/KnowledgeCenter.tsx` | Filtrowanie dokumentów wg języka użytkownika |

---

## Szczegóły implementacji w panelu admina

### Nowy selektor języka w formularzu

```tsx
// W zakładce "basic" formularza edycji
<div className="space-y-2">
  <Label>Język dokumentu</Label>
  <Select
    value={editingResource.language_code || 'all'}
    onValueChange={(v) => setEditingResource({ 
      ...editingResource, 
      language_code: v === 'all' ? null : v 
    })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Wybierz język" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">
        🌐 Wszystkie języki
      </SelectItem>
      <SelectItem value="pl">🇵🇱 Polski</SelectItem>
      <SelectItem value="en">🇬🇧 English</SelectItem>
      <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
      <SelectItem value="it">🇮🇹 Italiano</SelectItem>
      <SelectItem value="es">🇪🇸 Español</SelectItem>
      <SelectItem value="fr">🇫🇷 Français</SelectItem>
      <SelectItem value="pt">🇵🇹 Português</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Badge językowy na liście

```tsx
// W renderowaniu karty dokumentu
<Badge variant="outline" className="text-[10px]">
  {resource.language_code === null ? '🌐 Wszystkie' : 
   `${languageFlags[resource.language_code]} ${resource.language_code.toUpperCase()}`}
</Badge>
```

---

## Szczegóły filtrowania dla użytkownika

### Logika filtrowania

```tsx
// W KnowledgeCenter.tsx
const { language } = useLanguage(); // aktualny język użytkownika

const filteredDocuments = documentResources.filter(r => {
  // Dokument widoczny jeśli:
  // 1. Jest uniwersalny (language_code === null)
  // 2. Pasuje do języka użytkownika
  const matchesLanguage = r.language_code === null || r.language_code === language;
  
  // ... pozostałe filtry (search, category, type, tag)
  return matchesLanguage && matchesSearch && matchesCategory && matchesType && matchesTag;
});
```

---

## Kompatybilność wsteczna

1. **Istniejące dokumenty**: Domyślnie przypisane do języka polskiego (`'pl'`)
2. **Migracja danych**: Admin może ręcznie zmienić język dla istniejących dokumentów lub oznaczyć jako "Wszystkie języki"
3. **Brak breaking changes**: System działa bez zmian dla dokumentów bez przypisanego języka

---

## Opcjonalne ulepszenia (przyszłość)

1. **Grupowanie w widoku użytkownika**: Możliwość przełączenia widoku na "Grupuj wg języka"
2. **Kopiowanie dokumentu do innego języka**: Przycisk "Duplikuj do innego języka" w panelu admina
3. **Statystyki językowe**: Dashboard pokazujący ile dokumentów jest w każdym języku
4. **Powiadomienia o brakujących tłumaczeniach**: Alert gdy dokument istnieje tylko w jednym języku

---

## Podsumowanie zmian

| Komponent | Zmiana |
|-----------|--------|
| **Baza danych** | +1 kolumna `language_code` |
| **TypeScript** | +1 pole w interfejsie |
| **Panel admina** | +selektor języka, +filtr, +badge |
| **Widok użytkownika** | +automatyczne filtrowanie wg języka |
| **Pliki** | ~4 plików do modyfikacji |

