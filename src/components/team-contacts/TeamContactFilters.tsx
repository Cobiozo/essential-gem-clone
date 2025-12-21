import React from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamContactFilters as Filters } from './types';

interface TeamContactFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  isAdmin: boolean;
}

export const TeamContactFilters: React.FC<TeamContactFiltersProps> = ({
  filters,
  onFiltersChange,
  isAdmin,
}) => {
  const { t } = useLanguage();

  const clearFilters = () => {
    onFiltersChange({
      role: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      userId: '',
    });
  };

  const hasFilters = filters.role || filters.status || filters.dateFrom || filters.dateTo || filters.search || filters.userId;

  return (
    <div className="bg-muted/50 p-4 rounded-lg mb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{t('teamContacts.filters') || 'Filtry'}</h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            {t('teamContacts.clearFilters') || 'Wyczyść'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-xs">{t('teamContacts.search') || 'Szukaj'}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('teamContacts.searchPlaceholder') || 'Imię, nazwisko, EQID...'}
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <Label className="text-xs">{t('teamContacts.role') || 'Rola'}</Label>
          <Select
            value={filters.role}
            onValueChange={(value) => onFiltersChange({ ...filters, role: value === 'all' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('teamContacts.allRoles') || 'Wszystkie role'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('teamContacts.allRoles') || 'Wszystkie role'}</SelectItem>
              <SelectItem value="client">{t('role.client') || 'Klient'}</SelectItem>
              <SelectItem value="partner">{t('role.partner') || 'Partner'}</SelectItem>
              <SelectItem value="specjalista">{t('role.specialist') || 'Specjalista'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs">{t('teamContacts.status') || 'Status relacji'}</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('teamContacts.allStatuses') || 'Wszystkie statusy'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('teamContacts.allStatuses') || 'Wszystkie statusy'}</SelectItem>
              <SelectItem value="active">Aktywny</SelectItem>
              <SelectItem value="suspended">Wstrzymany</SelectItem>
              <SelectItem value="closed_success">Zamknięty - sukces</SelectItem>
              <SelectItem value="closed_not_now">Zamknięty - nie teraz</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-xs">{t('teamContacts.dateRange') || 'Zakres dat'}</Label>
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
            <Label className="text-xs">{t('teamContacts.filterByUser') || 'Filtruj po użytkowniku (ID)'}</Label>
            <Input
              placeholder={t('teamContacts.userIdPlaceholder') || 'UUID użytkownika...'}
              value={filters.userId || ''}
              onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
