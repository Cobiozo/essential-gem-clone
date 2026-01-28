import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ChevronDown, Mail, Users, X } from 'lucide-react';
import { useFormProtection } from '@/hooks/useFormProtection';

interface BulkUserActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkApprove: () => void;
  onBulkChangeRole: (role: 'user' | 'client' | 'admin' | 'partner' | 'specjalista') => void;
  onBulkSendEmail: (templateId: string) => void;
  emailTemplates: { id: string; name: string }[];
  isLoading?: boolean;
}

export const BulkUserActions: React.FC<BulkUserActionsProps> = ({
  selectedCount,
  onClearSelection,
  onBulkApprove,
  onBulkChangeRole,
  onBulkSendEmail,
  emailTemplates,
  isLoading,
}) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Protect form from page refresh on tab switch
  useFormProtection(showEmailDialog);

  if (selectedCount === 0) return null;

  const handleSendEmail = () => {
    if (selectedTemplate) {
      onBulkSendEmail(selectedTemplate);
      setShowEmailDialog(false);
      setSelectedTemplate('');
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <Badge variant="secondary" className="h-6">
          {selectedCount} zaznaczonych
        </Badge>
        
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="default"
            size="sm"
            onClick={onBulkApprove}
            disabled={isLoading}
            className="h-8 text-xs bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Zatwierdź wszystkich
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={isLoading}>
                <Users className="w-3.5 h-3.5 mr-1" />
                Zmień rolę
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onBulkChangeRole('client')}>
                Klient
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkChangeRole('partner')}>
                Partner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkChangeRole('specjalista')}>
                Specjalista
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onBulkChangeRole('admin')}>
                Administrator
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailDialog(true)}
            disabled={isLoading || emailTemplates.length === 0}
            className="h-8 text-xs"
          >
            <Mail className="w-3.5 h-3.5 mr-1" />
            Wyślij email
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 text-xs"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wyślij email do {selectedCount} użytkowników</DialogTitle>
            <DialogDescription>
              Wybierz szablon wiadomości do wysłania
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz szablon..." />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSendEmail} disabled={!selectedTemplate}>
              <Mail className="w-4 h-4 mr-2" />
              Wyślij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
