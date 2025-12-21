import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import type { TeamContact } from './types';

interface TeamContactExportProps {
  contacts: TeamContact[];
  onClose: () => void;
}

export const TeamContactExport: React.FC<TeamContactExportProps> = ({
  contacts,
  onClose,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [exportEnabled, setExportEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);

  useEffect(() => {
    const checkExportPermission = async () => {
      const { data } = await supabase
        .from('ai_compass_settings')
        .select('allow_team_contacts_export')
        .single();
      
      setExportEnabled(data?.allow_team_contacts_export ?? false);
      setLoading(false);
    };
    checkExportPermission();
  }, []);

  const handleExport = () => {
    if (contacts.length === 0) {
      toast({
        title: t('teamContacts.noData') || 'Brak danych',
        description: t('teamContacts.noDataToExport') || 'Nie ma kontaktów do eksportu',
        variant: 'destructive',
      });
      return;
    }

    const exportData = contacts.map((contact) => ({
      [t('teamContacts.firstName') || 'Imię']: contact.first_name,
      [t('teamContacts.lastName') || 'Nazwisko']: contact.last_name,
      'EQID': contact.eq_id || '',
      [t('teamContacts.role') || 'Rola']: contact.role === 'client' 
        ? (t('role.client') || 'Klient')
        : contact.role === 'partner'
          ? (t('role.partner') || 'Partner')
          : (t('role.specialist') || 'Specjalista'),
      [t('teamContacts.status') || 'Status']: contact.role === 'client'
        ? (contact.client_status || '-')
        : (contact.partner_status || '-'),
      [t('teamContacts.addedAt') || 'Data dodania']: new Date(contact.added_at).toLocaleDateString('pl-PL'),
      ...(includeNotes ? { [t('teamContacts.notes') || 'Notatki']: contact.notes || '' } : {}),
      // Client-specific
      ...(contact.role === 'client' ? {
        [t('teamContacts.purchasedProduct') || 'Zakupiony produkt']: contact.purchased_product || '',
        [t('teamContacts.purchaseDate') || 'Data zakupu']: contact.purchase_date 
          ? new Date(contact.purchase_date).toLocaleDateString('pl-PL')
          : '',
      } : {}),
      // Partner/Specialist-specific
      ...(contact.role !== 'client' ? {
        [t('teamContacts.collaborationLevel') || 'Poziom współpracy']: contact.collaboration_level || '',
        [t('teamContacts.startDate') || 'Data rozpoczęcia']: contact.start_date
          ? new Date(contact.start_date).toLocaleDateString('pl-PL')
          : '',
      } : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kontakty');

    const fileName = `kontakty-zespolu-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: t('teamContacts.exportSuccess') || 'Eksport zakończony',
      description: `${t('teamContacts.exported') || 'Wyeksportowano'} ${contacts.length} ${t('teamContacts.contacts') || 'kontaktów'}`,
    });

    onClose();
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">{t('common.loading') || 'Ładowanie...'}</div>;
  }

  if (!exportEnabled) {
    return (
      <div className="py-8 text-center">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {t('teamContacts.exportDisabled') || 'Eksport jest wyłączony przez administratora'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('teamContacts.exportInfo') || `Eksportuj ${contacts.length} kontaktów do pliku Excel.`}
        </p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeNotes"
              checked={includeNotes}
              onCheckedChange={(checked) => setIncludeNotes(!!checked)}
            />
            <Label htmlFor="includeNotes" className="text-sm">
              {t('teamContacts.includeNotes') || 'Dołącz notatki'}
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          {t('admin.cancel') || 'Anuluj'}
        </Button>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          {t('teamContacts.exportToExcel') || 'Eksportuj do Excel'}
        </Button>
      </div>
    </div>
  );
};
