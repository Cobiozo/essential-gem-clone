import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Eye, EyeOff, Pencil, Trash2, ExternalLink, Settings,
  Type, Image, HelpCircle, ShoppingBag, MousePointer, Quote, Video, FileText, Minus, Loader2,
} from 'lucide-react';
import type { LandingBlock, LandingBlockType, LeaderLandingPage, DEFAULT_BLOCK_DATA } from '@/types/leaderLanding';
import { DEFAULT_BLOCK_DATA as DEFAULTS } from '@/types/leaderLanding';
import { HeroBlockEditor } from './block-editors/HeroBlockEditor';
import { TextBlockEditor } from './block-editors/TextBlockEditor';
import { QuizBlockEditor } from './block-editors/QuizBlockEditor';
import { GenericBlockEditor } from './block-editors/GenericBlockEditor';

const BLOCK_TYPES: { type: LandingBlockType; label: string; icon: React.ElementType }[] = [
  { type: 'hero', label: 'Hero', icon: Type },
  { type: 'text', label: 'Tekst', icon: FileText },
  { type: 'image', label: 'Obrazek', icon: Image },
  { type: 'quiz', label: 'Quiz', icon: HelpCircle },
  { type: 'products', label: 'Produkty', icon: ShoppingBag },
  { type: 'cta_button', label: 'Przycisk CTA', icon: MousePointer },
  { type: 'testimonial', label: 'Opinia', icon: Quote },
  { type: 'video', label: 'Wideo', icon: Video },
  { type: 'form', label: 'Formularz', icon: FileText },
  { type: 'divider', label: 'Separator', icon: Minus },
];

// Sortable block item
const SortableBlock: React.FC<{
  block: LandingBlock;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  allBlocks: LandingBlock[];
}> = ({ block, onToggleVisible, onDelete, onUpdate, allBlocks }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const blockType = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = blockType?.icon || FileText;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-card border rounded-lg mb-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium truncate">{blockType?.label || block.type}</span>
      <Badge variant="outline" className="text-xs">{block.type}</Badge>
      <button onClick={() => onToggleVisible(block.id)} className="text-muted-foreground hover:text-foreground">
        {block.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
        </PopoverTrigger>
        <PopoverContent className="w-96 max-h-[70vh] overflow-y-auto" side="left">
          <BlockEditor block={block} onUpdate={onUpdate} allBlocks={allBlocks} />
        </PopoverContent>
      </Popover>
      <button onClick={() => onDelete(block.id)} className="text-destructive hover:text-destructive/80">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

const BlockEditor: React.FC<{
  block: LandingBlock;
  onUpdate: (id: string, data: any) => void;
  allBlocks: LandingBlock[];
}> = ({ block, onUpdate, allBlocks }) => {
  switch (block.type) {
    case 'hero': return <HeroBlockEditor data={block.data as any} onChange={d => onUpdate(block.id, d)} />;
    case 'text': return <TextBlockEditor data={block.data as any} onChange={d => onUpdate(block.id, d)} />;
    case 'quiz': return <QuizBlockEditor data={block.data as any} onChange={d => onUpdate(block.id, d)} allBlocks={allBlocks} />;
    default: return <GenericBlockEditor data={block.data as any} onChange={d => onUpdate(block.id, d)} blockType={block.type} />;
  }
};

const LeaderLandingEditorView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Fetch page data
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['leader-landing-editor', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase.from('leader_landing_pages') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as LeaderLandingPage | null;
    },
    enabled: !!user,
  });

  const [blocks, setBlocks] = useState<LandingBlock[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [themeColor, setThemeColor] = useState('#10b981');
  const [isActive, setIsActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (pageData) {
      setBlocks((pageData.blocks as unknown as LandingBlock[]) || []);
      setPageTitle(pageData.page_title || '');
      setPageDescription(pageData.page_description || '');
      setThemeColor(pageData.theme_color || '#10b981');
      setIsActive(pageData.is_active);
    }
  }, [pageData]);

  const markDirty = useCallback(() => setHasUnsavedChanges(true), []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Get user's eq_id
      const { data: profile } = await supabase.from('profiles').select('eq_id').eq('user_id', user.id).single();
      if (!profile?.eq_id) throw new Error('Brak EQ ID w profilu');

      const payload = {
        user_id: user.id,
        eq_id: profile.eq_id,
        blocks: blocks as any,
        page_title: pageTitle,
        page_description: pageDescription || null,
        theme_color: themeColor,
        is_active: isActive,
      };

      if (pageData?.id) {
        const { error } = await (supabase.from('leader_landing_pages') as any)
          .update(payload).eq('id', pageData.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('leader_landing_pages') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Zapisano!', description: 'Strona została zapisana.' });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['leader-landing-editor'] });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });

  const addBlock = (type: LandingBlockType) => {
    const newBlock: LandingBlock = {
      id: `block_${crypto.randomUUID().slice(0, 8)}`,
      type,
      position: blocks.length,
      visible: true,
      data: { ...(DEFAULTS[type] as any) },
    };
    setBlocks(prev => [...prev, newBlock]);
    markDirty();
  };

  const toggleVisible = (id: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
    markDirty();
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    markDirty();
  };

  const updateBlockData = (id: string, data: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));
    markDirty();
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setBlocks(prev => {
        const oldIndex = prev.findIndex(b => b.id === active.id);
        const newIndex = prev.findIndex(b => b.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);
        return reordered.map((b, i) => ({ ...b, position: i }));
      });
      markDirty();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Page settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Ustawienia strony</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Tytuł strony (SEO)</Label>
              <Input value={pageTitle} onChange={e => { setPageTitle(e.target.value); markDirty(); }} placeholder="Moja strona" />
            </div>
            <div>
              <Label>Kolor przewodni</Label>
              <div className="flex gap-2">
                <input type="color" value={themeColor} onChange={e => { setThemeColor(e.target.value); markDirty(); }} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={themeColor} onChange={e => { setThemeColor(e.target.value); markDirty(); }} className="flex-1" />
              </div>
            </div>
          </div>
          <div>
            <Label>Opis meta (SEO)</Label>
            <Input value={pageDescription} onChange={e => { setPageDescription(e.target.value); markDirty(); }} placeholder="Opis strony..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={v => { setIsActive(v); markDirty(); }} />
            <Label>Strona opublikowana {isActive ? '(aktywna)' : '(nieaktywna)'}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Block palette */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Plus className="h-5 w-5" /> Dodaj blok</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map(bt => (
              <Button key={bt.type} variant="outline" size="sm" onClick={() => addBlock(bt.type)} className="gap-1">
                <bt.icon className="h-4 w-4" />
                {bt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocks list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bloki strony ({blocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Brak bloków. Kliknij "Dodaj blok" powyżej.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map(block => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onToggleVisible={toggleVisible}
                    onDelete={deleteBlock}
                    onUpdate={updateBlockData}
                    allBlocks={blocks}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Zapisz stronę
        </Button>
        {hasUnsavedChanges && <Badge variant="secondary">Niezapisane zmiany</Badge>}
        <Button variant="outline" onClick={() => window.open('/landing-preview?eqid=' + (pageData?.eq_id || ''), '_blank')} className="ml-auto gap-1">
          <ExternalLink className="h-4 w-4" />
          Podgląd
        </Button>
      </div>
    </div>
  );
};

export default LeaderLandingEditorView;
