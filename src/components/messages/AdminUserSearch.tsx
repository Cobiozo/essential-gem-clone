import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
}

interface AdminUserSearchProps {
  onSelectUser: (userId: string) => void;
}

export const AdminUserSearch = ({ onSelectUser }: AdminUserSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query.trim()}%`;
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, role, avatar_url')
          .eq('is_active', true)
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(10);

        if (!error && data) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Admin user search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (userId: string) => {
    onSelectUser(userId);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    partner: 'Partner',
    specjalista: 'Specjalista',
    client: 'Klient',
  };

  return (
    <div ref={containerRef} className="relative px-4 pb-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj użytkownika..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8 h-10 bg-muted/50 border-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-4 right-4 top-full z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.user_id}
              onClick={() => handleSelect(user.user_id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email} · {roleLabels[user.role || 'client'] || user.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !loading && (
        <div className="absolute left-4 right-4 top-full z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">Brak wyników</p>
        </div>
      )}
    </div>
  );
};
