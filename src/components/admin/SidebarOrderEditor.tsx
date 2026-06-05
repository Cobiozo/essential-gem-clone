import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GripVertical, RotateCcw, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSidebarMenuOrder } from '@/hooks/useSidebarMenuOrder';

// Known sidebar items (id → label). Must match IDs in DashboardSidebar.
const KNOWN_ITEMS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Pulpit' },
  { id: 'leader-panel', label: 'Panel Lidera' },
  { id: 'academy', label: 'Akademia' },
  { id: 'healthy-knowledge', label: 'Baza wiedzy' },
  { id: 'resources', label: 'Biblioteka' },
  { id: 'purebox', label: 'PureBox' },
  { id: 'pureContacts', label: 'Pure-Kontakty' },
  { id: 'news', label: 'Aktualności' },
  { id: 'events', label: 'Wydarzenia' },
  { id: 'paid-events', label: 'Eventy' },
  { id: 'ticket-verification', label: 'Weryfikacja biletów' },
  { id: 'reflinks', label: 'PureLinki' },
  { id: 'moja-strona', label: 'Moja Strona-Biznes Partner' },
  { id: 'infolinks', label: 'Info-Linki' },
  { id: 'settings', label: 'Ustawienia' },
  { id: 'support', label: 'Wsparcie' },
  { id: 'calculator', label: 'Kalkulator' },
  { id: 'admin', label: 'Panel administratora' },
];

const labelOf = (id: string) => KNOWN_ITEMS.find((k) => k.id === id)?.label || id;

function SortableRow({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 select-none"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
        {...attributes}
        {...listeners}
        aria-label="Przeciągnij aby zmienić kolejność"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium">{labelOf(id)}</span>
      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{id}</span>
    </div>
  );
}

export const SidebarOrderEditor: React.FC = () => {
  const { order, loading, save } = useSidebarMenuOrder();
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const defaultIds = useMemo(() => KNOWN_ITEMS.map((k) => k.id), []);

  useEffect(() => {
    if (loading) return;
    // Merge: keep saved order first, then append any new known IDs at the end.
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of order) {
      if (defaultIds.includes(id) && !seen.has(id)) { result.push(id); seen.add(id); }
    }
    for (const id of defaultIds) {
      if (!seen.has(id)) { result.push(id); seen.add(id); }
    }
    setItems(result);
  }, [loading, order, defaultIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((arr) => {
      const oldIndex = arr.indexOf(String(active.id));
      const newIndex = arr.indexOf(String(over.id));
      return arrayMove(arr, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(items);
      toast.success('Zapisano kolejność menu');
    } catch (e: any) {
      toast.error(`Błąd zapisu: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setItems(defaultIds);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" />
          Kolejność menu bocznego
        </CardTitle>
        <CardDescription>
          Przeciągnij pozycje, aby zmienić ich kolejność w lewym pasku nawigacji dla wszystkich użytkowników.
          Pozycje niewidoczne dla danej roli zostaną pominięte automatycznie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((id) => <SortableRow key={id} id={id} />)}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Zapisz kolejność
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Przywróć domyślną
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SidebarOrderEditor;
