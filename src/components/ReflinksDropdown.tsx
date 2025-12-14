import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  title: string | null;
  link_url: string | null;
  link_type: string;
  visible_to_roles: string[];
  position: number;
}

export const ReflinksDropdown: React.FC = () => {
  const [reflinks, setReflinks] = useState<Reflink[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState<boolean | null>(null);
  const { toast } = useToast();
  const { userRole } = useAuth();

  // Check if button should be visible for current user's role
  useEffect(() => {
    const checkButtonVisibility = async () => {
      const currentRole = userRole?.role;
      
      // Admin always sees the button
      if (currentRole === 'admin') {
        setIsButtonVisible(true);
        return;
      }

      if (!currentRole) {
        setIsButtonVisible(false);
        return;
      }

      // Map roles
      const roleMapping: Record<string, string> = {
        'partner': 'partner',
        'specjalista': 'specjalista',
        'client': 'client',
        'klient': 'client',
      };
      const mappedRole = roleMapping[currentRole] || currentRole;

      const { data, error } = await supabase
        .from('reflinks_visibility_settings')
        .select('button_visible')
        .eq('role', mappedRole)
        .maybeSingle();

      if (error) {
        console.error('Error checking button visibility:', error);
        setIsButtonVisible(false);
        return;
      }

      setIsButtonVisible(data?.button_visible ?? false);
    };

    checkButtonVisibility();
  }, [userRole]);

  useEffect(() => {
    const fetchReflinks = async () => {
      const { data, error } = await supabase
        .from('reflinks')
        .select('id, target_role, reflink_code, title, link_url, link_type, visible_to_roles, position')
        .eq('is_active', true)
        .order('target_role')
        .order('position');
      
      if (error) {
        console.error('Error fetching reflinks:', error);
        return;
      }
      
      // Filter by visible_to_roles based on current user role
      const currentRole = userRole?.role || null;
      const filtered = (data || []).filter(reflink => {
        if (currentRole === 'admin') return true;
        const visibleRoles = reflink.visible_to_roles || [];
        const roleMapping: Record<string, string> = {
          'partner': 'partner',
          'specjalista': 'specjalista',
          'client': 'client',
          'klient': 'client',
        };
        const mappedRole = currentRole ? (roleMapping[currentRole] || currentRole) : null;
        return mappedRole && visibleRoles.includes(mappedRole);
      });
      
      setReflinks(filtered);
    };

    if (isOpen) {
      fetchReflinks();
    }
  }, [isOpen, userRole]);

  const getFullLink = (reflink: Reflink) => {
    if (reflink.link_type === 'reflink') {
      return `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
    }
    if (reflink.link_type === 'internal') {
      return `${window.location.origin}${reflink.link_url || ''}`;
    }
    return reflink.link_url || '';
  };

  const handleCopy = async (reflink: Reflink) => {
    const fullUrl = getFullLink(reflink);
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(reflink.id);
    toast({
      title: 'Skopiowano!',
      description: 'Link został skopiowany do schowka',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  const selectedReflinks = selectedRole 
    ? reflinks.filter(r => r.target_role === selectedRole)
    : [];

  const availableTargetRoles = [...new Set(reflinks.map(r => r.target_role))];

  // Don't render if button visibility not determined yet or is hidden
  if (isButtonVisible === null || !isButtonVisible) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden md:inline text-xs sm:text-sm">Reflinki</span>
          <ChevronDown className="w-3 h-3 ml-1 hidden sm:inline" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-background" align="end">
        <div className="space-y-3">
          {/* Role selection buttons */}
          <div className="flex gap-1">
            {['klient', 'partner', 'specjalista'].map(role => {
              const hasReflinks = availableTargetRoles.includes(role);
              return (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                  className="flex-1 text-xs"
                  disabled={!hasReflinks}
                >
                  {roleLabels[role]}
                </Button>
              );
            })}
          </div>

          {/* Lista reflinków - tylko nazwa i przycisk kopiowania */}
          {selectedRole && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {selectedReflinks.length > 0 ? (
                selectedReflinks.map(reflink => (
                  <div 
                    key={reflink.id} 
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm truncate flex-1 font-medium">
                      {reflink.title}
                    </span>
                    <Button
                      onClick={() => handleCopy(reflink)}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      title="Kopiuj link"
                    >
                      {copiedId === reflink.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Brak reflinków
                </p>
              )}
            </div>
          )}

          {!selectedRole && (
            <p className="text-xs text-muted-foreground text-center">
              Wybierz rolę
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
