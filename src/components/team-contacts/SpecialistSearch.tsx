import React, { useState, useCallback } from 'react';
import { Search, User, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Specialist {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  specialization: string | null;
  profile_description: string | null;
  search_keywords: string[] | null;
}

interface SpecialistSearchProps {
  onSelectSpecialist?: (specialist: Specialist) => void;
}

export const SpecialistSearch: React.FC<SpecialistSearchProps> = ({ onSelectSpecialist }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const searchSpecialists = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-specialists', {
        body: { query: searchQuery.trim() }
      });

      if (fnError) throw fnError;

      setResults(data?.specialists || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Wystąpił błąd podczas wyszukiwania');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    searchSpecialists(debouncedQuery);
  }, [debouncedQuery, searchSpecialists]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj specjalisty (np. dietetyk Warszawa, coach zdrowia...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nie znaleziono specjalistów pasujących do zapytania
        </p>
      )}

      <div className="grid gap-3">
        {results.map((specialist) => (
          <Card 
            key={specialist.user_id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelectSpecialist?.(specialist)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {specialist.first_name} {specialist.last_name}
                  </h3>
                  
                  {specialist.specialization && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span className="truncate">{specialist.specialization}</span>
                    </div>
                  )}
                  
                  {(specialist.city || specialist.country) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {[specialist.city, specialist.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {specialist.profile_description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {specialist.profile_description}
                    </p>
                  )}
                  
                  {specialist.search_keywords && specialist.search_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {specialist.search_keywords.slice(0, 5).map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
