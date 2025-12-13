import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  description: string | null;
  title: string | null;
  image_url: string | null;
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
  const { toast } = useToast();
  const { t } = useLanguage();
  const { userRole } = useAuth();

  useEffect(() => {
    const fetchReflinks = async () => {
      const { data, error } = await supabase
        .from('reflinks')
        .select('*')
        .eq('is_active', true)
        .order('target_role')
        .order('position');
      
      if (error) {
        console.error('Error fetching reflinks:', error);
        return;
      }
      
      // Filter by visible_to_roles based on current user role
      const filtered = (data || []).filter(reflink => {
        const visibleRoles = reflink.visible_to_roles || [];
        // Map userRole to match visible_to_roles values
        const roleMapping: Record<string, string> = {
          'partner': 'partner',
          'specjalista': 'specjalista',
          'client': 'client',
          'klient': 'client',
          'admin': 'admin',
        };
        const currentRole = userRole?.role || null;
        const mappedRole = currentRole ? (roleMapping[currentRole] || currentRole) : null;
        
        // Admin sees everything, others see only if their role is in visible_to_roles
        if (currentRole === 'admin') return true;
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
      title: t('reflinks.copied') || 'Skopiowano!',
      description: t('reflinks.linkCopied') || 'Link został skopiowany do schowka',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpen = (reflink: Reflink) => {
    const url = getFullLink(reflink);
    if (reflink.link_type === 'external') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  // Get reflinks for selected role
  const selectedReflinks = selectedRole 
    ? reflinks.filter(r => r.target_role === selectedRole)
    : [];

  // Get available roles (those that have at least one reflink)
  const availableTargetRoles = [...new Set(reflinks.map(r => r.target_role))];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden md:inline text-xs sm:text-sm">Reflinki</span>
          <ChevronDown className="w-3 h-3 ml-1 hidden sm:inline" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
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
                  {hasReflinks && (
                    <span className="ml-1 text-[10px] opacity-60">
                      ({reflinks.filter(r => r.target_role === role).length})
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Selected role reflinks list */}
          {selectedRole && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedReflinks.length > 0 ? (
                selectedReflinks.map(reflink => (
                  <div 
                    key={reflink.id} 
                    className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      {reflink.image_url && (
                        <img 
                          src={reflink.image_url} 
                          alt="" 
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {reflink.title || reflink.reflink_code}
                        </p>
                        {reflink.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {reflink.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                      {getFullLink(reflink)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCopy(reflink)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {copiedId === reflink.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-500" />
                            Skopiowano
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Kopiuj
                          </>
                        )}
                      </Button>
                      {(reflink.link_type === 'internal' || reflink.link_type === 'external') && (
                        <Button
                          onClick={() => handleOpen(reflink)}
                          size="sm"
                          variant="outline"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Brak reflinków dla tej roli
                </p>
              )}
            </div>
          )}

          {/* Initial state hint */}
          {!selectedRole && (
            <p className="text-xs text-muted-foreground text-center">
              Wybierz rolę, aby zobaczyć reflinki
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};