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
import { useLanguage } from '@/contexts/LanguageContext';

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  description: string | null;
}

export const ReflinksDropdown: React.FC = () => {
  const [reflinks, setReflinks] = useState<Reflink[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchReflinks = async () => {
      const { data, error } = await supabase
        .from('reflinks')
        .select('*')
        .eq('is_active', true)
        .order('target_role');
      
      if (error) {
        console.error('Error fetching reflinks:', error);
        return;
      }
      
      setReflinks(data || []);
    };

    if (isOpen) {
      fetchReflinks();
    }
  }, [isOpen]);

  const getFullReflink = (code: string) => {
    return `${window.location.origin}/auth?ref=${code}`;
  };

  const handleCopy = async (reflink: Reflink) => {
    const fullUrl = getFullReflink(reflink.reflink_code);
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(reflink.id);
    toast({
      title: t('reflinks.copied') || 'Skopiowano!',
      description: fullUrl,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const roleLabels: Record<string, string> = {
    klient: t('reflinks.roleClient') || 'Klient',
    partner: t('reflinks.rolePartner') || 'Partner',
    specjalista: t('reflinks.roleSpecialist') || 'Specjalista',
  };

  const filteredReflinks = selectedRole 
    ? reflinks.filter(r => r.target_role === selectedRole)
    : reflinks;

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
          <div className="font-semibold text-sm border-b border-border pb-2">
            {t('reflinks.title') || 'Reflinki dla:'}
          </div>
          
          {/* Role filter buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedRole === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRole(null)}
              className="text-xs"
            >
              {t('reflinks.all') || 'Wszystkie'}
            </Button>
            {['klient', 'partner', 'specjalista'].map(role => (
              <Button
                key={role}
                variant={selectedRole === role ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole(role)}
                className="text-xs"
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>

          {/* Reflinks list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredReflinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('reflinks.noReflinks') || 'Brak reflinków'}
              </p>
            ) : (
              filteredReflinks.map(reflink => (
                <div
                  key={reflink.id}
                  className="p-3 rounded-lg border border-border bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                      {roleLabels[reflink.target_role]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(reflink)}
                      className="h-7 px-2"
                    >
                      {copiedId === reflink.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground break-all font-mono bg-background p-2 rounded">
                    {getFullReflink(reflink.reflink_code)}
                  </div>
                  {reflink.description && (
                    <p className="text-xs text-muted-foreground">
                      {reflink.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
