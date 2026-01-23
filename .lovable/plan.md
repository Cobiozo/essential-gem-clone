

# Plan: Naprawienie modułu "Zdrowa Wiedza" w panelu administracyjnym

## Zidentyfikowany problem

Panel admina nie wyświetla nic po kliknięciu w "Zdrowa Wiedza", ponieważ:

1. **Brakuje importu** komponentu `HealthyKnowledgeManagement` w pliku `Admin.tsx`
2. **Brakuje sekcji `TabsContent`** dla wartości `"healthy-knowledge"` w strukturze zakładek

## Stan obecny

| Element | Status |
|---------|--------|
| Pozycja w menu (`AdminSidebar.tsx:169`) | Dodana |
| Komponent (`HealthyKnowledgeManagement.tsx`) | Istnieje (821 linii) |
| Import w `Admin.tsx` | **BRAK** |
| `TabsContent value="healthy-knowledge"` | **BRAK** |

## Rozwiązanie

### Zmiana 1: Dodanie importu w Admin.tsx

Lokalizacja: `src/pages/Admin.tsx` (linia ~67, po innych importach admin)

```typescript
import HealthyKnowledgeManagement from '@/components/admin/HealthyKnowledgeManagement';
```

### Zmiana 2: Dodanie TabsContent dla healthy-knowledge

Lokalizacja: `src/pages/Admin.tsx` (przed zamknięciem `</Tabs>`, około linii 4409)

```tsx
<TabsContent value="healthy-knowledge">
  <HealthyKnowledgeManagement />
</TabsContent>
```

## Struktura pliku po zmianach

```text
Admin.tsx
├── Importy (linie 1-75)
│   └── + import HealthyKnowledgeManagement  ← DODAĆ
│
├── Komponent Admin (linie 76-5040)
│   └── Tabs (linie ~3410-4410)
│       ├── TabsContent value="sidebar-icons"
│       ├── TabsContent value="html-pages"
│       ├── TabsContent value="media-library"
│       └── + TabsContent value="healthy-knowledge"  ← DODAĆ
│           └── <HealthyKnowledgeManagement />
```

## Wizualny rezultat

Po wprowadzeniu zmian:
- Kliknięcie "Zdrowa Wiedza" w menu pokaże pełny interfejs zarządzania
- Lista materiałów z wyszukiwaniem
- Przycisk "Nowy materiał"
- Tabela z kolumnami: Materiał, Typ, Kategoria, Widoczność, Status, Akcje
- Zakładka "Kody OTP" do zarządzania wygenerowanymi kodami

## Sekcja techniczna

### Pełny kod importu

```typescript
// Po linii 66 (import AdminMediaLibrary)
import HealthyKnowledgeManagement from '@/components/admin/HealthyKnowledgeManagement';
```

### Pełny kod TabsContent

```tsx
// Po TabsContent value="media-library" (linia 4409)
<TabsContent value="healthy-knowledge">
  <HealthyKnowledgeManagement />
</TabsContent>
```

## Pliki do edycji

| Plik | Typ zmiany | Linie |
|------|------------|-------|
| `src/pages/Admin.tsx` | Dodanie importu | ~67 |
| `src/pages/Admin.tsx` | Dodanie TabsContent | ~4410 |

## Efekt końcowy

Po wdrożeniu zmian zakładka "Zdrowa Wiedza" w panelu admina będzie działać prawidłowo, wyświetlając:
- Tabelę materiałów z możliwością dodawania, edycji, usuwania
- Przełączniki aktywności i wyróżnienia
- Zakładkę z kodami OTP
- Pełny formularz edycji z upload plików i ustawieniami widoczności

