import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Plus, Edit, Trash2, Send, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { TeamContact, TeamContactHistory } from './types';

interface UnifiedHistoryEntry {
  id: string;
  change_type: string;
  created_at: string;
  previous_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
}

interface TeamContactHistoryDialogProps {
  contact: TeamContact;
  getHistory: (contactId: string) => Promise<TeamContactHistory[]>;
  onClose: () => void;
}

export const TeamContactHistoryDialog: React.FC<TeamContactHistoryDialogProps> = ({
  contact,
  getHistory,
  onClose,
}) => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<UnifiedHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch contact history
        const historyData = await getHistory(contact.id);
        const historyEntries: UnifiedHistoryEntry[] = historyData.map((h) => ({
          id: h.id,
          change_type: h.change_type,
          created_at: h.created_at,
          previous_values: h.previous_values,
          new_values: h.new_values,
        }));

        // Fetch event registrations by email
        let regEntries: UnifiedHistoryEntry[] = [];
        if (contact.email) {
          const { data: regs } = await supabase
            .from('guest_event_registrations')
            .select('id, registered_at, source, status, event_id, events(title, start_time)')
            .eq('email', contact.email.toLowerCase().trim())
            .neq('status', 'cancelled')
            .order('registered_at', { ascending: false });

          if (regs) {
            regEntries = regs.map((r: any) => ({
              id: `reg-${r.id}`,
              change_type: r.source === 'partner_invite' ? 'event_invite_reg' : 'event_registration',
              created_at: r.registered_at,
              previous_values: null,
              new_values: {
                event_title: r.events?.title || 'Nieznane wydarzenie',
                event_id: r.event_id,
                event_date: r.events?.start_time || '',
                source: r.source,
                status: r.status,
              },
            }));
          }
        }

        // Merge and sort chronologically (newest first)
        const all = [...historyEntries, ...regEntries].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Deduplicate: if event_invite history entry and event_invite_reg entry exist for same event, keep only one
        const seen = new Set<string>();
        const deduped = all.filter((entry) => {
          if (entry.change_type === 'event_invite' && entry.new_values?.event_id) {
            seen.add(entry.new_values.event_id);
          }
          if (entry.change_type === 'event_invite_reg' && entry.new_values?.event_id && seen.has(entry.new_values.event_id)) {
            return false; // skip duplicate reg entry for partner invites already shown
          }
          return true;
        });

        setEntries(deduped);
      } catch (err) {
        console.error('Error fetching unified history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [contact.id, contact.email, getHistory]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'event_invite':
        return <Send className="w-4 h-4 text-yellow-600" />;
      case 'event_registration':
      case 'event_invite_reg':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getChangeBadge = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Badge className="bg-green-100 text-green-800">{t('teamContacts.created') || 'Utworzono'}</Badge>;
      case 'updated':
        return <Badge className="bg-blue-100 text-blue-800">{t('teamContacts.updated') || 'Zaktualizowano'}</Badge>;
      case 'deleted':
        return <Badge variant="destructive">{t('teamContacts.deleted') || 'Usunięto'}</Badge>;
      case 'event_invite':
        return <Badge className="bg-yellow-100 text-yellow-800">Zaproszono na wydarzenie</Badge>;
      case 'event_invite_reg':
        return <Badge className="bg-yellow-100 text-yellow-800">Zaproszony przez partnera</Badge>;
      case 'event_registration':
        return <Badge className="bg-purple-100 text-purple-800">Samodzielna rejestracja</Badge>;
      default:
        return <Badge variant="secondary">{changeType}</Badge>;
    }
  };

  const formatChanges = (previous: Record<string, any> | null, current: Record<string, any> | null) => {
    if (!previous || !current) return null;
    
    const changes: { field: string; from: any; to: any }[] = [];
    const ignoredFields = ['id', 'user_id', 'created_at', 'updated_at'];
    
    Object.keys(current).forEach((key) => {
      if (ignoredFields.includes(key)) return;
      if (previous[key] !== current[key]) {
        changes.push({
          field: key,
          from: previous[key],
          to: current[key],
        });
      }
    });
    
    return changes;
  };

  const renderEventDetails = (entry: UnifiedHistoryEntry) => {
    const vals = entry.new_values;
    if (!vals) return null;
    const eventDate = vals.event_date
      ? new Date(vals.event_date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';

    return (
      <div className="mt-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{vals.event_title}</span>
        {eventDate && <span className="ml-2">({eventDate})</span>}
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t('teamContacts.historyTitle') || 'Historia zmian'}: {contact.first_name} {contact.last_name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('teamContacts.noHistory') || 'Brak historii zmian'}
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getChangeIcon(entry.change_type)}
                      {getChangeBadge(entry.change_type)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString('pl-PL')}
                    </span>
                  </div>
                  
                  {/* Event details for event-related entries */}
                  {['event_invite', 'event_registration', 'event_invite_reg'].includes(entry.change_type) &&
                    renderEventDetails(entry)}
                  
                  {/* Field-level changes for updates */}
                  {entry.change_type === 'updated' && entry.previous_values && entry.new_values && (
                    <div className="mt-2 text-sm">
                      {formatChanges(entry.previous_values, entry.new_values)?.map((change, idx) => (
                        <div key={idx} className="py-1 border-t first:border-t-0">
                          <span className="font-medium">{change.field}:</span>{' '}
                          <span className="text-red-500 line-through">{String(change.from || '-')}</span>
                          {' → '}
                          <span className="text-green-500">{String(change.to || '-')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
