import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Library, Search, Loader2, FileText, ExternalLink, Globe, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResourceItem: React.FC<{ r: any }> = ({ r }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm truncate">{r.title}</span>
        {r.is_featured && <Badge className="text-xs">Wyróżniony</Badge>}
        <Badge variant="outline" className="text-xs">{r.resource_type}</Badge>
      </div>
      {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
    </div>
    {r.source_url && (
      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </a>
    )}
  </div>
);

const LeaderKnowledgeView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['leader-knowledge-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_resources')
        .select('id, title, description, category, resource_type, status, source_url, is_featured, tags, visible_to_everyone')
        .eq('status', 'active')
        .order('position');
      if (error) throw error;
      return data || [];
    },
  });

  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];
  const filtered = resources.filter(r => {
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || r.category === category;
    return matchesSearch && matchesCategory;
  });

  const globalResources = filtered.filter(r => r.visible_to_everyone === true);
  const teamResources = filtered.filter(r => r.visible_to_everyone !== true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Library className="h-5 w-5 text-primary" />Baza wiedzy</CardTitle>
        <CardDescription>Zasoby wiedzy dostępne dla zespołu (tylko podgląd).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Dostępne dla wszystkich */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Globe className="h-4 w-4" />Dostępne dla wszystkich
              </h3>
              {globalResources.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Brak zasobów w tej kategorii</p>
              ) : (
                globalResources.map(r => <ResourceItem key={r.id} r={r} />)
              )}
            </div>

            {/* Widoczne dla mojego zespołu */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users className="h-4 w-4" />Widoczne dla mojego zespołu
              </h3>
              {teamResources.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Brak zasobów w tej kategorii</p>
              ) : (
                teamResources.map(r => <ResourceItem key={r.id} r={r} />)
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderKnowledgeView;
