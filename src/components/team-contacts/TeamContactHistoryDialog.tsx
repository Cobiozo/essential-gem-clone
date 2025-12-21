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
import { History, Plus, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContact, TeamContactHistory } from './types';

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
  const [history, setHistory] = useState<TeamContactHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const data = await getHistory(contact.id);
      setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, [contact.id, getHistory]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />;
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
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('teamContacts.noHistory') || 'Brak historii zmian'}
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
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
