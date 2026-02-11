import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GRAPHICS_CATEGORIES } from '@/types/knowledge';

interface KnowledgeGraphic {
  id: string;
  title: string;
  source_url: string;
  category: string | null;
}

interface KnowledgeGraphicsPickerProps {
  onSelect: (graphic: KnowledgeGraphic) => void;
}

export const KnowledgeGraphicsPicker: React.FC<KnowledgeGraphicsPickerProps> = ({ onSelect }) => {
  const [graphics, setGraphics] = useState<KnowledgeGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('knowledge_resources')
        .select('id, title, source_url, category')
        .eq('resource_type', 'image')
        .eq('status', 'active')
        .order('position');
      setGraphics((data as KnowledgeGraphic[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = graphics.filter(g => {
    const matchesSearch = !search || g.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(graphics.map(g => g.category).filter(Boolean))] as string[];

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj grafiki..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Wszystkie kategorie</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Brak grafik w zasobach wiedzy.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g)}
              className="group border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all text-left"
            >
              {g.source_url ? (
                <img src={g.source_url} alt={g.title} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-xs">Brak</div>
              )}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{g.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
