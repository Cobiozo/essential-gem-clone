import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';
import type { TeamContactFilters as Filters, ContactType } from './types';

interface TeamContactFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  isAdmin: boolean;
  contactType?: ContactType;
}

export const TeamContactFilters: React.FC<TeamContactFiltersProps> = ({
  filters,
  onFiltersChange,
  isAdmin,
  contactType,
}) => {
  const { tf } = useLanguage();
  const clearFilters = () => {
    onFiltersChange({
      role: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      userId: '',
      contactType,
    });
  };

  const hasFilters = filters.role || filters.status || filters.dateFrom || filters.dateTo || filters.search || filters.userId;

  return (
    <div className="bg-muted/50 p-4 rounded-lg mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{tf('teamContacts.filters', 'Filtry')}</h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            {tf('teamContacts.clear', 'Wyczyść')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-xs">{tf('teamContacts.search', 'Szukaj')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Imię, nazwisko, EQID..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label className="text-xs">{tf('teamContacts.role', 'Rola')}</Label>
          <Select
            value={filters.role}
            onValueChange={(value) => onFiltersChange({ ...filters, role: value === 'all' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={tf('teamContacts.allRoles', 'Wszystkie role')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tf('teamContacts.allRoles', 'Wszystkie role')}</SelectItem>
              <SelectItem value="client">{tf('teamContacts.client', 'Klient')}</SelectItem>
              <SelectItem value="partner">{tf('teamContacts.partner', 'Partner')}</SelectItem>
              <SelectItem value="specjalista">{tf('teamContacts.specialist', 'Specjalista')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs">{tf('teamContacts.relationshipStatus', 'Status relacji')}</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={tf('teamContacts.allStatuses', 'Wszystkie statusy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tf('teamContacts.allStatuses', 'Wszystkie statusy')}</SelectItem>
              {contactType === 'private' ? (
                <>
                  <SelectItem value="observation">{tf('teamContacts.observation', 'Czynny obserwujący')}</SelectItem>
                  <SelectItem value="potential_client">{tf('teamContacts.potentialClient', 'Potencjalny klient')}</SelectItem>
                  <SelectItem value="potential_partner">{tf('teamContacts.potentialPartner', 'Potencjalny partner')}</SelectItem>
                  <SelectItem value="closed_success">{tf('teamContacts.closedSuccess', 'Zamknięty - sukces dołączył')}</SelectItem>
                  <SelectItem value="closed_not_now">{tf('teamContacts.closedNotNow', 'Zamknięty - nie teraz')}</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="active">{tf('teamContacts.active', 'Aktywny')}</SelectItem>
                  <SelectItem value="suspended">{tf('teamContacts.suspended', 'Wstrzymany')}</SelectItem>
                  <SelectItem value="closed_success">{tf('teamContacts.closedSuccess', 'Zamknięty - sukces')}</SelectItem>
                  <SelectItem value="closed_not_now">{tf('teamContacts.closedNotNow', 'Zamknięty - nie teraz')}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-xs">{tf('teamContacts.dateRange', 'Zakres dat')}</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="flex-1"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Admin-only: Filter by user */}
      {isAdmin && (
        <div className="pt-2 border-t">
          <div className="space-y-2">
            <Label className="text-xs">Filtruj po użytkowniku (ID)</Label>
            <Input
              placeholder="UUID użytkownika..."
              value={filters.userId || ''}
              onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
};