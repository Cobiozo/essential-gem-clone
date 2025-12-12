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
      description: t('reflinks.linkCopied') || 'Link został skopiowany do schowka',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  const selectedReflink = selectedRole 
    ? reflinks.find(r => r.target_role === selectedRole)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden md:inline text-xs sm:text-sm">Reflinki</span>
          <ChevronDown className="w-3 h-3 ml-1 hidden sm:inline" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          {/* Role selection buttons */}
          <div className="flex gap-1">
            {['klient', 'partner', 'specjalista'].map(role => (
              <Button
                key={role}
                variant={selectedRole === role ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                className="flex-1 text-xs"
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>

          {/* Selected reflink display */}
          {selectedRole && (
            <div className="space-y-3">
              {selectedReflink ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground break-all bg-muted/50 p-3 rounded-md font-mono">
                    {getFullReflink(selectedReflink.reflink_code)}
                  </div>
                  <Button
                    onClick={() => handleCopy(selectedReflink)}
                    className="w-full"
                    size="sm"
                  >
                    {copiedId === selectedReflink.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Skopiowano!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Kopiuj link
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Brak reflinku dla tej roli
                </p>
              )}
            </div>
          )}

          {/* Initial state hint */}
          {!selectedRole && (
            <p className="text-xs text-muted-foreground text-center">
              Wybierz rolę, aby zobaczyć reflink
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};