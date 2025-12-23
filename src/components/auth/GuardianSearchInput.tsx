import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Guardian {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  email: string;
}

interface GuardianSearchInputProps {
  value: Guardian | null;
  onChange: (guardian: Guardian | null) => void;
  disabled?: boolean;
  error?: string;
}

export const GuardianSearchInput: React.FC<GuardianSearchInputProps> = ({
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for guardians
  useEffect(() => {
    const searchGuardians = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        setNoResults(false);
        return;
      }

      setIsLoading(true);
      setNoResults(false);

      try {
        // Search by name or EQID - using public profiles data
        // Note: RLS policy "Anyone can search for guardians" allows searching
        // for active partners, specjalists, and admins
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id, email')
          .eq('is_active', true)
          .in('role', ['partner', 'specjalista', 'admin'])
          .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,eq_id.ilike.%${searchQuery}%`)
          .limit(10);

        if (searchError) {
          console.error('Error searching guardians:', searchError);
          setResults([]);
        } else {
          setResults(data || []);
          setNoResults((data || []).length === 0);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchGuardians, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelect = (guardian: Guardian) => {
    onChange(guardian);
    setSearchQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
    if (value) {
      onChange(null);
    }
  };

  const formatGuardianName = (guardian: Guardian) => {
    const name = [guardian.first_name, guardian.last_name].filter(Boolean).join(' ');
    return name || guardian.email;
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="guardian-search" className="flex flex-col gap-1">
        <span>Opiekun (osoba wprowadzająca Partner/Specjalista Zespołu Pure Life) *</span>
        <span className="font-normal text-xs text-muted-foreground">
          Jeżeli osobą wprowadzającą jest inny klient Zespołu Pure Life, skontaktuj się z najbliższym upline struktury i wpisz dane opiekuna.
        </span>
      </Label>
      
      {value ? (
        // Selected guardian display
        <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-md">
          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {formatGuardianName(value)}
            </div>
            <div className="text-xs text-muted-foreground">
              EQID: {value.eq_id}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-sm"
              aria-label="Usuń opiekuna"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      ) : (
        // Search input
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              id="guardian-search"
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
              placeholder="Wpisz imię, nazwisko lub EQID opiekuna..."
              disabled={disabled}
              className={cn(
                "pl-10",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown results */}
          {isOpen && searchQuery.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {results.length > 0 ? (
                results.map((guardian) => (
                  <button
                    key={guardian.user_id}
                    type="button"
                    onClick={() => handleSelect(guardian)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {formatGuardianName(guardian)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        EQID: {guardian.eq_id}
                      </div>
                    </div>
                  </button>
                ))
              ) : noResults ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="font-medium">Nie znaleziono opiekuna</p>
                  <p className="text-xs mt-1">Sprawdź dane lub skontaktuj się z opiekunem</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Wyszukaj i wybierz Partnera lub Specjalistę, który Cię wprowadza do Pure Life/Eqology
      </p>
    </div>
  );
};

export default GuardianSearchInput;
