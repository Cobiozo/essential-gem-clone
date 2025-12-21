import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HandHelping, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { TeamContact, UplineInfo } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UplineHelpButtonProps {
  contact: TeamContact;
}

export const UplineHelpButton: React.FC<UplineHelpButtonProps> = ({ contact }) => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { sendNotification } = useNotifications();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uplineInfo, setUplineInfo] = useState<UplineInfo | null>(null);

  useEffect(() => {
    const fetchUplineInfo = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('upline_eq_id, upline_first_name, upline_last_name')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUplineInfo(data);
      }
    };
    fetchUplineInfo();
  }, [user]);

  const handleRequestHelp = async () => {
    if (!user || !uplineInfo?.upline_eq_id) {
      toast({
        title: t('teamContacts.noUpline') || 'Brak UpLine',
        description: t('teamContacts.noUplineDescription') || 'Nie masz przypisanego UpLine. Uzupełnij dane w profilu.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Find upline user by eq_id
      const { data: uplineProfile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('eq_id', uplineInfo.upline_eq_id)
        .single();

      if (!uplineProfile) {
        toast({
          title: t('teamContacts.uplineNotFound') || 'Nie znaleziono UpLine',
          description: t('teamContacts.uplineNotFoundDescription') || 'Osoba z podanym EQID nie istnieje w systemie.',
          variant: 'destructive',
        });
        return;
      }

      // Send notification
      const success = await sendNotification(uplineProfile.user_id, {
        notification_type: 'upline_help',
        source_module: 'team_contacts',
        title: t('teamContacts.helpRequestTitle') || 'Prośba o pomoc',
        message: `${profile?.first_name || ''} ${profile?.last_name || ''} prosi o pomoc w sprawie kontaktu: ${contact.first_name} ${contact.last_name}`,
        link: `/my-account?tab=team-contacts&contact=${contact.id}`,
        metadata: {
          requester_id: user.id,
          requester_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`,
          contact_id: contact.id,
          contact_name: `${contact.first_name} ${contact.last_name}`,
          requested_at: new Date().toISOString(),
        },
        related_contact_id: contact.id,
      });

      if (success) {
        toast({
          title: t('teamContacts.helpRequestSent') || 'Wysłano prośbę o pomoc',
          description: `${t('teamContacts.notificationSentTo') || 'Powiadomienie wysłano do'}: ${uplineProfile.first_name} ${uplineProfile.last_name}`,
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending upline help request:', error);
      toast({
        title: t('toast.error') || 'Błąd',
        description: t('teamContacts.helpRequestFailed') || 'Nie udało się wysłać prośby o pomoc',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasUpline = uplineInfo?.upline_eq_id;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestHelp}
            disabled={loading || !hasUpline}
            className="text-primary hover:text-primary/80"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <HandHelping className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasUpline 
            ? (t('teamContacts.requestUplineHelp') || 'Poproś UpLine o pomoc')
            : (t('teamContacts.noUplineConfigured') || 'Brak skonfigurowanego UpLine')
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
