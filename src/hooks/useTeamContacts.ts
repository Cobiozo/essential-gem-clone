import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TeamContact, TeamContactFilters, TeamContactHistory } from '@/components/team-contacts/types';

export const useTeamContacts = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TeamContactFilters>({
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    userId: '',
  });

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('team_contacts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.status) {
        // Status depends on role
        query = query.or(`client_status.eq.${filters.status},partner_status.eq.${filters.status}`);
      }
      
      if (filters.dateFrom) {
        query = query.gte('added_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('added_at', filters.dateTo);
      }
      
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,eq_id.ilike.%${filters.search}%`);
      }
      
      // Admin can filter by user
      if (isAdmin && filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data || []) as TeamContact[]);
    } catch (error: any) {
      console.error('Error fetching team contacts:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać kontaktów',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, filters, toast]);

  const addContact = async (contact: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('team_contacts')
        .insert({
          ...contact,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add history entry
      await supabase.from('team_contacts_history').insert({
        contact_id: data.id,
        change_type: 'created',
        new_values: data,
        changed_by: user.id,
      });

      toast({
        title: 'Sukces',
        description: 'Kontakt został dodany',
      });

      fetchContacts();
      return data as TeamContact;
    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać kontaktu',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<TeamContact>) => {
    if (!user) return false;
    
    try {
      // Get current values for history
      const { data: currentData } = await supabase
        .from('team_contacts')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('team_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add history entry
      await supabase.from('team_contacts_history').insert({
        contact_id: id,
        change_type: 'updated',
        previous_values: currentData,
        new_values: data,
        changed_by: user.id,
      });

      toast({
        title: 'Sukces',
        description: 'Kontakt został zaktualizowany',
      });

      fetchContacts();
      return true;
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować kontaktu',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteContact = async (id: string) => {
    if (!user) return false;
    
    try {
      // Soft delete
      const { error } = await supabase
        .from('team_contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Add history entry
      await supabase.from('team_contacts_history').insert({
        contact_id: id,
        change_type: 'deleted',
        changed_by: user.id,
      });

      toast({
        title: 'Sukces',
        description: 'Kontakt został usunięty',
      });

      fetchContacts();
      return true;
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kontaktu',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getContactHistory = async (contactId: string): Promise<TeamContactHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('team_contacts_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as TeamContactHistory[];
    } catch (error) {
      console.error('Error fetching contact history:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    filters,
    setFilters,
    addContact,
    updateContact,
    deleteContact,
    getContactHistory,
    refetch: fetchContacts,
  };
};
