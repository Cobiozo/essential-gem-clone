

# Plan: Trwałe okno odtwarzania wideo z pamięcią pozycji w module "Zdrowa Wiedza"

## Zidentyfikowane problemy

Na podstawie analizy kodu i zgłoszenia użytkownika:

1. **Dialog zamyka się przy kliknięciu poza nim** - Dialog używa domyślnego zachowania Radix UI, które zamyka okno przy kliknięciu overlay lub naciśnięciu Escape
2. **Brak zapamiętywania pozycji wideo** - Obecnie SecureMedia jest używany bez props `onTimeUpdate` i `initialTime`, więc pozycja nie jest zapisywana
3. **Inline player znika przy interakcji** - Player w karcie znika gdy użytkownik kliknie gdziekolwiek indziej

## Rozwiązanie

Stworzymy nową dedykowaną stronę odtwarzacza (zamiast dialogu) oraz system zapamiętywania pozycji w localStorage.

### Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────┐
│           HealthyKnowledge.tsx (lista)              │
│                                                     │
│  [Podgląd] ──navigate──> /zdrowa-wiedza/:id         │
│                                                     │
└─────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│       HealthyKnowledgePlayer.tsx (nowa strona)     │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │         SecureMedia (pełny ekran)       │       │
│  │   + onTimeUpdate (zapisuje do LS)       │       │
│  │   + initialTime (czyta z LS)            │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  Visibility API: zapisz pozycję przy zmianie       │
│  zakładki przeglądarki                              │
└─────────────────────────────────────────────────────┘
```

## Szczegółowe zmiany

### 1. Nowa strona: HealthyKnowledgePlayer.tsx

Dedykowana strona do odtwarzania materiałów:
- Pełnoekranowy player z SecureMedia
- Automatyczne zapisywanie pozycji do localStorage co 5 sekund
- Odczyt pozycji przy starcie z localStorage
- Zapisywanie pozycji przy zmianie zakładki (Visibility API)
- Zapisywanie pozycji przy wyjściu ze strony (beforeunload)
- Przycisk powrotu do listy materiałów
- Wyświetlanie tytułu, opisu i metadanych

**Klucz localStorage:** `hk_progress_${material_id}`  
**Format:** `{ position: number, updatedAt: number }`

### 2. Modyfikacja HealthyKnowledge.tsx

Zmiana przycisku "Podgląd" aby:
- Dla wideo/audio: przekierowuje na `/zdrowa-wiedza/:id` (nowa strona playera)
- Dla innych typów (dokumenty, obrazy, tekst): pozostaje modal (dialog)

Usunięcie inline playera z kart - zamiast tego kliknięcie w play przekierowuje na stronę playera.

### 3. Nowy route w App.tsx

Dodanie trasy:
```tsx
<Route path="/zdrowa-wiedza/:id" element={<HealthyKnowledgePlayerPage />} />
```

### 4. Obsługa Visibility API i beforeunload

```tsx
// Zapisz przy zmianie zakładki
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && currentTime > 0) {
      saveProgress(currentTime);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [currentTime]);

// Zapisz przy wyjściu ze strony
useEffect(() => {
  const handleBeforeUnload = () => {
    if (currentTime > 0) {
      saveProgress(currentTime);
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [currentTime]);
```

### 5. Zapisywanie pozycji co 5 sekund

```tsx
const saveProgress = useCallback((position: number) => {
  localStorage.setItem(`hk_progress_${materialId}`, JSON.stringify({
    position,
    updatedAt: Date.now()
  }));
}, [materialId]);

// Co 5 sekund podczas odtwarzania
useEffect(() => {
  if (!isPlaying) return;
  
  const interval = setInterval(() => {
    saveProgress(currentTime);
  }, 5000);
  
  return () => clearInterval(interval);
}, [isPlaying, currentTime, saveProgress]);
```

### 6. Odczyt pozycji przy starcie

```tsx
const [initialTime, setInitialTime] = useState(0);

useEffect(() => {
  const saved = localStorage.getItem(`hk_progress_${materialId}`);
  if (saved) {
    const data = JSON.parse(saved);
    // Sprawdź czy nie starsze niż 7 dni
    if (Date.now() - data.updatedAt < 7 * 24 * 60 * 60 * 1000) {
      setInitialTime(data.position);
    }
  }
}, [materialId]);
```

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/pages/HealthyKnowledgePlayer.tsx` | **NOWY** - dedykowana strona odtwarzacza |
| `src/pages/HealthyKnowledge.tsx` | Zmiana logiki Podgląd -> nawigacja zamiast dialogu dla wideo |
| `src/App.tsx` | Dodanie nowego route `/zdrowa-wiedza/:id` |

## Korzyści

- Wideo nie znika przy kliknięciu - jest na dedykowanej stronie
- Pozycja zapamiętywana w localStorage (przetrwa odświeżenie strony)
- Automatyczny zapis przy zmianie zakładki przeglądarki
- Automatyczny zapis przy wyjściu ze strony
- Możliwość wznowienia oglądania od miejsca gdzie się skończyło
- Brak problemów z modalami i overlay

---

## Sekcja techniczna

### Nowa strona HealthyKnowledgePlayer.tsx

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SecureMedia } from '@/components/SecureMedia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Eye, Loader2, Heart } from 'lucide-react';
import { HealthyKnowledge, CONTENT_TYPE_LABELS } from '@/types/healthyKnowledge';

const HealthyKnowledgePlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [material, setMaterial] = useState<HealthyKnowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  
  const currentTimeRef = useRef(0);
  const lastSaveRef = useRef(0);

  // Load material
  useEffect(() => {
    if (!id) return;
    
    const fetchMaterial = async () => {
      try {
        const { data, error } = await supabase
          .from('healthy_knowledge')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setMaterial(data as HealthyKnowledge);
        
        // Load saved progress
        const saved = localStorage.getItem(`hk_progress_${id}`);
        if (saved) {
          const progress = JSON.parse(saved);
          // Check if not older than 7 days
          if (Date.now() - progress.updatedAt < 7 * 24 * 60 * 60 * 1000) {
            setInitialTime(progress.position);
          }
        }
      } catch (error) {
        console.error('Error fetching material:', error);
        toast.error('Nie udało się pobrać materiału');
        navigate('/zdrowa-wiedza');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterial();
  }, [id, navigate]);

  // Save progress to localStorage
  const saveProgress = useCallback((position: number) => {
    if (!id || position <= 0) return;
    localStorage.setItem(`hk_progress_${id}`, JSON.stringify({
      position,
      updatedAt: Date.now()
    }));
  }, [id]);

  // Update ref when time changes
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveProgress]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  // Periodic save every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // Handle time update from SecureMedia
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle play state change
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Auth check
  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout title="Zdrowa Wiedza">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!material) {
    return (
      <DashboardLayout title="Zdrowa Wiedza">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Materiał nie został znaleziony</p>
          <Button onClick={() => navigate('/zdrowa-wiedza')} className="mt-4">
            Wróć do listy
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Zdrowa Wiedza">
      <div className="space-y-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/zdrowa-wiedza')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do listy
        </Button>

        {/* Title */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">{material.title}</h1>
            {material.description && (
              <p className="text-muted-foreground text-sm mt-1">{material.description}</p>
            )}
          </div>
        </div>

        {/* Video Player */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <SecureMedia
              mediaUrl={material.media_url!}
              mediaType={material.content_type as 'video' | 'audio'}
              className="w-full aspect-video"
              onTimeUpdate={handleTimeUpdate}
              onPlayStateChange={handlePlayStateChange}
              initialTime={initialTime}
            />
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">
            {CONTENT_TYPE_LABELS[material.content_type as keyof typeof CONTENT_TYPE_LABELS]}
          </Badge>
          {material.category && (
            <Badge variant="secondary">{material.category}</Badge>
          )}
          {material.duration_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(material.duration_seconds / 60)} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {material.view_count} wyświetleń
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HealthyKnowledgePlayerPage;
```

### Modyfikacja HealthyKnowledge.tsx

W handleViewMaterial zmiana logiki:
```tsx
const handleViewMaterial = (material: HealthyKnowledge) => {
  // For video/audio - navigate to player page
  if (material.content_type === 'video' || material.content_type === 'audio') {
    navigate(`/zdrowa-wiedza/${material.id}`);
    return;
  }
  
  // For other types - use modal
  setPreviewMaterial(material);
  setPreviewDialogOpen(true);
  
  // Increment view count
  supabase.from('healthy_knowledge')
    .update({ view_count: material.view_count + 1 })
    .eq('id', material.id)
    .then(() => {
      setMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, view_count: m.view_count + 1 } : m
      ));
    });
};
```

Usunięcie inline playera z kart - kliknięcie w play też nawiguje:
```tsx
<div 
  className="absolute inset-0 flex items-center justify-center cursor-pointer"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/zdrowa-wiedza/${material.id}`);
    // View count will be incremented on player page
  }}
>
```

### Dodanie route w App.tsx

```tsx
import HealthyKnowledgePlayerPage from './pages/HealthyKnowledgePlayer';

// W Routes:
<Route path="/zdrowa-wiedza/:id" element={<HealthyKnowledgePlayerPage />} />
```

