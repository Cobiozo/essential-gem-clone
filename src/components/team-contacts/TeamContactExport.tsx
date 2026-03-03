import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TeamContact } from './types';

interface TeamContactExportProps {
  contacts: TeamContact[];
  onClose: () => void;
}

const getRelationshipLabel = (status: string | null) => {
  switch (status) {
    case 'observation': return 'Czynny obserwujący';
    case 'potential_client': return 'Potencjalny klient';
    case 'potential_partner': return 'Potencjalny partner';
    case 'closed_success': return 'Zamknięty - sukces';
    case 'closed_not_now': return 'Zamknięty - nie teraz';
    default: return status || '-';
  }
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pl-PL') : '';

const formatDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('pl-PL') : '';

export const TeamContactExport: React.FC<TeamContactExportProps> = ({
  contacts,
  onClose,
}) => {
  const { toast } = useToast();
  const [exportEnabled, setExportEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'html' | 'docx'>('xlsx');

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

  const buildExcelRow = useCallback((c: TeamContact) => ({
    'Imię': c.first_name,
    'Nazwisko': c.last_name,
    'Status relacji': getRelationshipLabel(c.relationship_status),
    'Telefon': c.phone_number || '',
    'Email': c.email || '',
    'Adres': c.address || '',
    'Zawód': c.profession || '',
    'Źródło kontaktu': c.contact_source || '',
    'Powód kontaktu': c.contact_reason || '',
    'Produkty': c.products || '',
    'Data przypomnienia': formatDateTime(c.reminder_date),
    'Data dodania': formatDate(c.added_at),
    ...(includeNotes ? { 'Notatki': c.notes || '' } : {}),
  }), [includeNotes]);

  const fileName = `kontakty-prywatne-${new Date().toISOString().split('T')[0]}`;

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const exportData = contacts.map(buildExcelRow);
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kontakty');
      XLSX.writeFile(wb, `${fileName}.xlsx`);

      toast({
        title: 'Eksport zakończony',
        description: `Wyeksportowano ${contacts.length} kontaktów do Excel`,
      });
      onClose();
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: 'Błąd eksportu',
        description: 'Nie udało się wyeksportować do Excel',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  }, [contacts, buildExcelRow, fileName, toast, onClose]);

  const handleExportHtml = useCallback(() => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kontakty prywatne - ${new Date().toLocaleDateString('pl-PL')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #ddd; }
  </style>
</head>
<body>
  <h1>Kontakty prywatne</h1>
  <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
  <p>Liczba kontaktów: ${contacts.length}</p>
  <table>
    <thead>
      <tr>
        <th>Imię i nazwisko</th>
        <th>Status relacji</th>
        <th>Telefon</th>
        <th>Email</th>
        <th>Źródło</th>
        <th>Produkty</th>
        <th>Przypomnienie</th>
        ${includeNotes ? '<th>Notatki</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${contacts.map(c => `
        <tr>
          <td>${c.first_name} ${c.last_name}</td>
          <td>${getRelationshipLabel(c.relationship_status)}</td>
          <td>${c.phone_number || '-'}</td>
          <td>${c.email || '-'}</td>
          <td>${c.contact_source || '-'}</td>
          <td>${c.products || '-'}</td>
          <td>${formatDateTime(c.reminder_date) || '-'}</td>
          ${includeNotes ? `<td>${c.notes || '-'}</td>` : ''}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${contacts.length} kontaktów do HTML`,
    });
    onClose();
  }, [contacts, includeNotes, fileName, toast, onClose]);

  const handleExportDocx = useCallback(() => {
    const docContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Calibri, sans-serif; }
    h1 { color: #2E7D32; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 6px; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>Kontakty prywatne</h1>
  <p><strong>Data:</strong> ${new Date().toLocaleString('pl-PL')}</p>
  <p><strong>Liczba kontaktów:</strong> ${contacts.length}</p>
  <br/>
  <table>
    <tr>
      <th>Imię</th>
      <th>Nazwisko</th>
      <th>Status relacji</th>
      <th>Telefon</th>
      <th>Email</th>
      <th>Źródło</th>
      <th>Produkty</th>
      <th>Przypomnienie</th>
      ${includeNotes ? '<th>Notatki</th>' : ''}
    </tr>
    ${contacts.map(c => `
      <tr>
        <td>${c.first_name}</td>
        <td>${c.last_name}</td>
        <td>${getRelationshipLabel(c.relationship_status)}</td>
        <td>${c.phone_number || '-'}</td>
        <td>${c.email || '-'}</td>
        <td>${c.contact_source || '-'}</td>
        <td>${c.products || '-'}</td>
        <td>${formatDateTime(c.reminder_date) || '-'}</td>
        ${includeNotes ? `<td>${c.notes || '-'}</td>` : ''}
      </tr>
    `).join('')}
  </table>
</body>
</html>`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.doc`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${contacts.length} kontaktów do Word`,
    });
    onClose();
  }, [contacts, includeNotes, fileName, toast, onClose]);

  const handleExport = useCallback(() => {
    if (contacts.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma kontaktów do eksportu',
        variant: 'destructive',
      });
      return;
    }

    switch (exportFormat) {
      case 'xlsx': handleExportExcel(); break;
      case 'html': handleExportHtml(); break;
      case 'docx': handleExportDocx(); break;
    }
  }, [contacts.length, exportFormat, handleExportExcel, handleExportHtml, handleExportDocx, toast]);

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Ładowanie...</div>;
  }

  if (!exportEnabled) {
    return (
      <div className="py-8 text-center">
        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          Eksport jest wyłączony przez administratora
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Eksportuj {contacts.length} kontaktów do wybranego formatu.
        </p>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Format eksportu</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('xlsx')}
              className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                exportFormat === 'xlsx' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('html')}
              className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                exportFormat === 'html' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Globe className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">HTML</span>
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('docx')}
              className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                exportFormat === 'docx' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <FileText className="w-6 h-6 text-blue-800" />
              <span className="text-sm font-medium">Word (.doc)</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeNotes"
              checked={includeNotes}
              onCheckedChange={(checked) => setIncludeNotes(!!checked)}
            />
            <Label htmlFor="includeNotes" className="text-sm">
              Dołącz notatki
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={exporting}>
          Anuluj
        </Button>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Eksportowanie...' : 'Eksportuj'}
        </Button>
      </div>
    </div>
  );
};
