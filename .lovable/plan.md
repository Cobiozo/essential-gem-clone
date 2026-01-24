

# Plan: Nowoczesny panel dla klientów + System notatek w szkoleniach

## Część 1: Przekierowanie klientów na nowoczesny panel

### Problem
Obecnie w `src/App.tsx` (linia 305-312) klient (`isClient`) jest zawsze kierowany na klasyczny widok (`<Index />`) i nie może wejść na `/dashboard`:

```tsx
// Linia 307: Clients stay on classic view
isClient ? <Index /> :
// Linia 321: Clients cannot access modern dashboard
isClient ? <Navigate to="/" replace /> : <Dashboard />
```

### Rozwiązanie
Usunąć wyjątki dla klientów - traktować ich jak pozostałych użytkowników i kierować na `/dashboard`:

**Zmiana 1** - Route `/` (linia 305-309):
```tsx
// PRZED:
isClient ? <Index /> :
(isPartner || isSpecjalista) ? <Navigate to="/dashboard" replace /> :
(user && isModern) ? <Navigate to="/dashboard" replace /> : <Index />

// PO:
user ? <Navigate to="/dashboard" replace /> : <Index />
```

**Zmiana 2** - Route `/dashboard` (linia 319-322):
```tsx
// PRZED:
isClient ? <Navigate to="/" replace /> : <Dashboard />

// PO:
<Dashboard />
```

**Zmiana 3** - Route `/auth` (linia 311-313):
```tsx
// PRZED:
user ? <Navigate to={(isPartner || isSpecjalista) ? '/dashboard' : (isModern ? '/dashboard' : '/')} replace /> : <Auth />

// PO:
user ? <Navigate to="/dashboard" replace /> : <Auth />
```

---

## Część 2: System notatek w lekcjach wideo

### Wymagania funkcjonalne
1. Przycisk "Notatka" przy każdej lekcji wideo
2. Podczas odtwarzania wideo użytkownik może kliknąć przycisk
3. Otwiera się modal z polem tekstowym + aktualnym czasem wideo
4. Notatka jest zapisywana z przypisaniem do konkretnego momentu wideo
5. Na linii czasu wideo pojawiają się czerwone kropki w miejscach notatek
6. Kliknięcie kropki pokazuje treść notatki
7. W liście notatek przy każdej widoczny jest czas, a kliknięcie (tylko po zaliczeniu lekcji) przenosi wideo do tego momentu
8. Możliwość eksportu notatek

### Nowe elementy

#### 1. Nowa tabela w bazie danych: `training_notes`

```sql
CREATE TABLE training_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES training_lessons(id) ON DELETE CASCADE NOT NULL,
  video_timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_training_notes_user_lesson ON training_notes(user_id, lesson_id);

-- RLS
ALTER TABLE training_notes ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoje notatki
CREATE POLICY "Users can manage own notes" ON training_notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin może wszystko
CREATE POLICY "Admins full access" ON training_notes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());
```

#### 2. Nowy komponent: `src/components/training/LessonNotesDialog.tsx`

Zgodnie z designem ze screenshotów:
- Nagłówek: ikona notatki + "Notatki" + przycisk "Eksportuj"
- Pole tekstowe z placeholderem "Wpisz treść notatki..."
- Checkbox + aktualny czas wideo (np. "⏱ 1:08")
- Przycisk "+ Dodaj" (niebieski)
- Lista zapisanych notatek z:
  - Treścią notatki
  - Znacznikiem czasu (kliknięciem przeskakuje do tego momentu, jeśli lekcja ukończona)
  - Przyciskami edycji i usuwania

```tsx
interface LessonNotesDialogProps {
  lessonId: string;
  userId: string;
  currentVideoTime: number;
  isLessonCompleted: boolean;
  onSeekToTime?: (seconds: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

#### 3. Hook: `src/hooks/useLessonNotes.ts`

```tsx
interface LessonNote {
  id: string;
  lesson_id: string;
  video_timestamp_seconds: number;
  content: string;
  created_at: string;
}

export const useLessonNotes = (lessonId: string, userId: string) => {
  // Funkcje: fetchNotes, addNote, updateNote, deleteNote, exportNotes
  // Stan: notes, loading, error
}
```

#### 4. Modyfikacja `VideoControls.tsx` - znaczniki notatek na linii czasu

Dodać prop `noteMarkers: { timestamp: number; id: string }[]` i renderować czerwone kropki:

```tsx
// W komponencie Progress bar (linia 190-208)
{noteMarkers?.map(marker => (
  <button
    key={marker.id}
    className="absolute w-3 h-3 bg-red-500 rounded-full -top-0.5 transform -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform z-20"
    style={{ left: `${(marker.timestamp / duration) * 100}%` }}
    onClick={() => onNoteClick?.(marker.id)}
    title="Kliknij, aby zobaczyć notatkę"
  />
))}
```

#### 5. Modyfikacja `TrainingModule.tsx`

Dodać:
- Stan `notes` i hook `useLessonNotes`
- Przycisk "📝 Notatki (X)" nad wideo
- Dialog notatek
- Przekazywanie `noteMarkers` i `onSeekToTime` do `SecureMedia`/`VideoControls`

#### 6. Modyfikacja `SecureMedia.tsx`

Dodać:
- Props: `noteMarkers`, `onNoteMarkerClick`, `onSeekToTime`
- Przekazać do `VideoControls`
- Implementacja `seekTo(time)` (tylko dla ukończonych lekcji, gdzie `disableInteraction=false`)

---

## Szczegóły techniczne

| Plik | Zmiana |
|------|--------|
| `src/App.tsx` | Usunięcie wyjątków dla klientów (linie 305-322) |
| `supabase/migrations/` | Nowa tabela `training_notes` z RLS |
| `src/hooks/useLessonNotes.ts` | NOWY - CRUD dla notatek |
| `src/components/training/LessonNotesDialog.tsx` | NOWY - modal notatek |
| `src/components/training/VideoControls.tsx` | Dodanie znaczników notatek na timeline |
| `src/pages/TrainingModule.tsx` | Integracja systemu notatek |
| `src/components/SecureMedia.tsx` | Props dla notatek + seek callback |

---

## Wizualizacja UI

```text
┌────────────────────────────────────────────────────────┐
│  Lekcja: Wprowadzenie do produktu                     │
│  [📝 Notatki 2] [🔖]                                  │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │               [WIDEO]                            │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  [▶ Odtwórz]  [-10s]                                  │
│  ──●───●────────────────────────────────── 2:30/8:45  │
│      ↑   ↑                                            │
│  Czerwone kropki = notatki                            │
└────────────────────────────────────────────────────────┘

Dialog Notatek:
┌─────────────────────────────────────────────┐
│  📝 Notatki                    [↓ Eksportuj]│
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │ Wpisz treść notatki...                  ││
│  └─────────────────────────────────────────┘│
│  ☑ ⏱ 1:08                      [+ Dodaj]   │
├─────────────────────────────────────────────┤
│  "Ważna informacja o produkcie"    [✏️][🗑️]│
│  ⏱ 0:46 (kliknij aby przeskoczyć)          │
├─────────────────────────────────────────────┤
│  "Zapamiętać cenę hurtową"         [✏️][🗑️]│
│  ⏱ 0:52                                     │
└─────────────────────────────────────────────┘
```

---

## Oczekiwany efekt

1. **Klienci po zalogowaniu** widzą nowy panel (`/dashboard`) zamiast klasycznego widoku
2. **Przycisk notatek** przy każdej lekcji wideo z licznikiem
3. **Modal notatek** zgodny z designem (screenshot)
4. **Czerwone kropki na timeline** wskazujące zapisane notatki
5. **Kliknięcie czasu** w liście notatek przeskakuje do momentu w wideo (tylko po zaliczeniu)
6. **Eksport notatek** do pliku tekstowego/PDF

