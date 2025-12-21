import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, Globe } from 'lucide-react';
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
  const { toast } = useToast();
  const [exportEnabled, setExportEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return 'Klient';
      case 'partner': return 'Partner';
      case 'specjalista': return 'Specjalista';
      default: return role;
    }
  };

  const handleExportExcel = () => {
    const exportData = contacts.map((contact) => ({
      'Imię': contact.first_name,
      'Nazwisko': contact.last_name,
      'EQID': contact.eq_id || '',
      'Rola': getRoleLabel(contact.role),
      'Status': contact.role === 'client'
        ? (contact.client_status || '-')
        : (contact.partner_status || '-'),
      'Status relacji': contact.relationship_status || '-',
      'Telefon': contact.phone_number || '',
      'Email': contact.email || '',
      'Adres': contact.address || '',
      'Zawód': contact.profession || '',
      'Data dodania': contact.added_at ? new Date(contact.added_at).toLocaleDateString('pl-PL') : '',
      ...(includeNotes ? { 'Notatki': contact.notes || '' } : {}),
      ...(contact.role === 'client' ? {
        'Zakupiony produkt': contact.purchased_product || '',
        'Data zakupu': contact.purchase_date 
          ? new Date(contact.purchase_date).toLocaleDateString('pl-PL')
          : '',
      } : {}),
      ...(contact.role !== 'client' ? {
        'Poziom współpracy': contact.collaboration_level || '',
        'Data rozpoczęcia': contact.start_date
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
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${contacts.length} kontaktów do Excel`,
    });
    onClose();
  };

  const handleExportHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kontakty zespołu - ${new Date().toLocaleDateString('pl-PL')}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #ddd; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .client { background: #e3f2fd; color: #1976d2; }
    .partner { background: #e8f5e9; color: #388e3c; }
    .specjalista { background: #f3e5f5; color: #7b1fa2; }
  </style>
</head>
<body>
  <h1>Kontakty zespołu</h1>
  <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
  <p>Liczba kontaktów: ${contacts.length}</p>
  <table>
    <thead>
      <tr>
        <th>Imię i nazwisko</th>
        <th>EQID</th>
        <th>Rola</th>
        <th>Status</th>
        <th>Telefon</th>
        <th>Email</th>
        ${includeNotes ? '<th>Notatki</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${contacts.map(c => `
        <tr>
          <td>${c.first_name} ${c.last_name}</td>
          <td>${c.eq_id || '-'}</td>
          <td><span class="badge ${c.role}">${getRoleLabel(c.role)}</span></td>
          <td>${c.relationship_status || '-'}</td>
          <td>${c.phone_number || '-'}</td>
          <td>${c.email || '-'}</td>
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
    a.download = `kontakty-zespolu-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${contacts.length} kontaktów do HTML`,
    });
    onClose();
  };

  const handleExportDocx = () => {
    // Simple DOCX-like content (actually HTML that Word can open)
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
  <h1>Kontakty zespołu</h1>
  <p><strong>Data:</strong> ${new Date().toLocaleString('pl-PL')}</p>
  <p><strong>Liczba kontaktów:</strong> ${contacts.length}</p>
  <br/>
  <table>
    <tr>
      <th>Imię</th>
      <th>Nazwisko</th>
      <th>EQID</th>
      <th>Rola</th>
      <th>Status</th>
      <th>Telefon</th>
      <th>Email</th>
    </tr>
    ${contacts.map(c => `
      <tr>
        <td>${c.first_name}</td>
        <td>${c.last_name}</td>
        <td>${c.eq_id || '-'}</td>
        <td>${getRoleLabel(c.role)}</td>
        <td>${c.relationship_status || '-'}</td>
        <td>${c.phone_number || '-'}</td>
        <td>${c.email || '-'}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontakty-zespolu-${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Eksport zakończony',
      description: `Wyeksportowano ${contacts.length} kontaktów do Word`,
    });
    onClose();
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      toast({
        title: 'Brak danych',
        description: 'Nie ma kontaktów do eksportu',
        variant: 'destructive',
      });
      return;
    }

    switch (exportFormat) {
      case 'xlsx':
        handleExportExcel();
        break;
      case 'html':
        handleExportHtml();
        break;
      case 'docx':
        handleExportDocx();
        break;
    }
  };

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

        {/* Format selection */}
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
        <Button variant="outline" onClick={onClose}>
          Anuluj
        </Button>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Eksportuj
        </Button>
      </div>
    </div>
  );
};
