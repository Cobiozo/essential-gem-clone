

# Plan: Pełnoekranowy edytor HTML w osobnej karcie

## Analiza problemu

Na screenshotach widać:
- Podgląd edytowanej strony (sekcja "Gotowy na zmianę?") zajmuje tylko ~40% dostępnej wysokości
- Pod podglądem jest duża niewykorzystana przestrzeń (szara/biała)
- Dialog ma zbyt wiele zagnieżdżonych warstw (zakładki dialogu + zakładki edytora)
- Panel boczny pojawia się tylko po zaznaczeniu elementu, co jest poprawne

## Proponowane rozwiązanie

Zamiast otwierać edytor w dialogu, **otworzymy go w osobnej, pełnoekranowej stronie** (`/admin/html-editor/:id`). To zapewni:

| Aspekt | Dialog (obecnie) | Osobna strona (propozycja) |
|--------|------------------|---------------------------|
| Dostępna przestrzeń | ~95vh minus nagłówki | 100vh |
| Zagnieżdżenie zakładek | Podwójne | Pojedyncze |
| Nawigacja | Zamknięcie dialogu | Powrót do listy |
| Focus użytkownika | Rozproszone | Pełna koncentracja |

## Architektura zmian

```text
/admin?tab=html-pages
     │
     │  [Edytuj] - navigate to:
     ▼
/admin/html-editor/:id   (nowa strona)
     │
     └── HtmlEditorPage.tsx
           ├── Toolbar z przyciskiem "← Powrót do listy"
           ├── Minimalistyczny header z tytułem + Zapisz/Anuluj
           ├── HtmlHybridEditor (pełna wysokość: calc(100vh - 60px))
           └── Status bar z informacją o zapisie
```

## Pliki do utworzenia/modyfikacji

| Plik | Akcja | Opis |
|------|-------|------|
| `src/pages/HtmlEditorPage.tsx` | Nowy | Pełnoekranowa strona edytora |
| `src/App.tsx` | Modyfikacja | Dodanie route `/admin/html-editor/:id` |
| `src/components/admin/HtmlPagesManagement.tsx` | Modyfikacja | Zmiana przycisku "Edytuj" na navigate() zamiast dialog |
| `src/components/admin/html-editor/HtmlHybridEditor.tsx` | Modyfikacja | Usunięcie duplikujących się zakładek, max wykorzystanie przestrzeni |

## Szczegółowe zmiany

### 1. Nowa strona HtmlEditorPage.tsx

```tsx
// src/pages/HtmlEditorPage.tsx
const HtmlEditorPage = () => {
  const { id } = useParams(); // 'new' dla nowej strony
  const navigate = useNavigate();
  
  // Pobranie/tworzenie strony
  const { data: page, isLoading } = useQuery({...});
  
  // Stan edycji
  const [editingPage, setEditingPage] = useState(page);
  const [activeView, setActiveView] = useState<'preview' | 'settings'>('preview');
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimalistyczny header - tylko niezbędne */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin?tab=html-pages')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Powrót
          </Button>
          <span className="text-lg font-medium">{page?.title || 'Nowa strona'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Przełącznik: Edytor / Ustawienia */}
          <Button 
            variant={activeView === 'preview' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveView('preview')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Edytor
          </Button>
          <Button 
            variant={activeView === 'settings' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setActiveView('settings')}
          >
            <Settings className="w-4 h-4 mr-1" />
            Ustawienia
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button size="sm" onClick={handleSave}>
            Zapisz
          </Button>
        </div>
      </header>
      
      {/* Główna treść - pełna wysokość */}
      {activeView === 'preview' ? (
        <div className="flex-1 overflow-hidden">
          <HtmlHybridEditor
            htmlContent={editingPage?.html_content || ''}
            customCss={editingPage?.custom_css || ''}
            onChange={(html) => setEditingPage(prev => ({ ...prev, html_content: html }))}
          />
        </div>
      ) : (
        <SettingsPanel page={editingPage} onChange={setEditingPage} />
      )}
    </div>
  );
};
```

### 2. Uproszczony HtmlHybridEditor

Usunięcie zbędnych elementów:
- Zmniejszenie toolbara formatowania (tylko niezbędne ikony)
- Pełne `h-full` bez `min-h` i `max-h`
- Domyślnie widok "Edytor wizualny" jako główny

```tsx
// Zmiana w HtmlHybridEditor.tsx - kontener główny
<div className="h-full flex flex-col overflow-hidden">
  {/* Toolbar - kompaktowy */}
  <div className="shrink-0 border-b">
    <HtmlFormattingToolbar minimal />
    <HtmlElementToolbar compact />
  </div>
  
  {/* Edytor - pełna reszta wysokości */}
  <div className="flex-1 overflow-hidden">
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Panel podglądu - domyślnie 100% lub 70% z properties */}
      <ResizablePanel defaultSize={selectedElementId ? 70 : 100} minSize={50}>
        <div className="h-full overflow-auto p-4">
          {/* Elementy do edycji */}
        </div>
      </ResizablePanel>
      
      {/* Panel właściwości - pojawia się po zaznaczeniu */}
      {selectedElementId && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <SimplifiedPropertiesPanel />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  </div>
</div>
```

### 3. App.tsx - nowa trasa

```tsx
// Dodanie w Routes
<Route path="/admin/html-editor/:id" element={<HtmlEditorPage />} />
```

### 4. HtmlPagesManagement.tsx - nawigacja zamiast dialogu

```tsx
// Zmiana przycisku "Edytuj"
<Button
  variant="ghost"
  size="sm"
  onClick={() => navigate(`/admin/html-editor/${page.id}`)}
>
  <Edit className="w-4 h-4" />
</Button>

// Przycisk "Nowa strona" 
<Button onClick={() => navigate('/admin/html-editor/new')}>
  <Plus className="w-4 h-4 mr-2" />
  Nowa strona
</Button>
```

## Korzyści

- **100% wysokości ekranu** dla edytora (zamiast 95vh minus nagłówki dialogu)
- **Intuicyjna nawigacja** - jeden poziom zakładek (Edytor / Ustawienia)
- **Focus na podgląd** - edytowana strona zajmuje maksymalną przestrzeń
- **Responsywność** - łatwiejsze dostosowanie do różnych rozmiarów ekranu
- **Autosave** - możliwość implementacji automatycznego zapisu
- **Breadcrumb** - jasna ścieżka powrotu do listy stron

## Zachowanie kompatybilności

- Dialog pozostanie jako fallback dla małych urządzeń
- Istniejące funkcje (drag-drop, inline editing, panel właściwości) bez zmian
- Dane zapisywane do tej samej tabeli `html_pages`

