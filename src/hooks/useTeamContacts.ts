import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import type { TeamContact, TeamContactFilters, TeamContactHistory, EventRegistrationInfo, EventGroup } from '@/components/team-contacts/types';

export const useTeamContacts = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventContactIds, setEventContactIds] = useState<Set<string>>(new Set());
  const [eventContactDetails, setEventContactDetails] = useState<Map<string, EventRegistrationInfo[]>>(new Map());
  const [filters, setFilters] = useState<TeamContactFilters>({
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    userId: '',
    contactType: undefined,
  });

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('team_contacts')
        .select(`
          *,
          linked_profile:profiles!team_contacts_linked_user_id_fkey (
            guardian_approved,
            admin_approved,
            is_active
          )
        `)
        .eq('is_active', true)
        .is('linked_user_deleted_at', null) // Hide contacts where linked user was deleted
        .order('created_at', { ascending: false })
        .limit(100); // Performance optimization - most users have <100 contacts

      // Apply filters
      if (filters.contactType) {
        query = query.eq('contact_type', filters.contactType);
      }

      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.status) {
        // Status depends on relationship_status or role-specific status
        query = query.or(`relationship_status.eq.${filters.status},client_status.eq.${filters.status},partner_status.eq.${filters.status}`);
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
      
      // Admin domyślnie widzi swoje kontakty, może przełączyć na innego użytkownika
      if (isAdmin) {
        query = query.eq('user_id', filters.userId || user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map linked profile data to contact fields
      const mappedData = (data || []).map((contact: any) => ({
        ...contact,
        linked_guardian_approved: contact.linked_profile?.guardian_approved ?? null,
        linked_admin_approved: contact.linked_profile?.admin_approved ?? null,
        linked_profile: undefined,
      }));
      setContacts(mappedData as TeamContact[]);
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

  const { pendingCount, enqueue, sync } = useOfflineQueue(fetchContacts);

  const addContact = async (contact: Omit<TeamContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    // If offline, enqueue immediately
    if (!navigator.onLine) {
      const queued = enqueue(contact as any);
      if (queued) {
        toast({
          title: 'Zapisano offline',
          description: 'Kontakt zostanie zsynchronizowany po przywróceniu połączenia',
        });
      }
      return null;
    }
    
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
      
      // Network error — save offline
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.name === 'TypeError') {
        const queued = enqueue(contact as any);
        if (queued) {
          toast({
            title: 'Zapisano offline',
            description: 'Kontakt zostanie zsynchronizowany po przywróceniu połączenia',
          });
        }
      } else {
        toast({
          title: 'Błąd',
          description: error.message || 'Nie udało się dodać kontaktu',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<TeamContact>) => {
    if (!user) return false;
    
    try {
      // Get current values for history (non-blocking if fails)
      let currentData: any = null;
      try {
        const { data } = await supabase
          .from('team_contacts')
          .select('*')
          .eq('id', id)
          .single();
        currentData = data;
      } catch (e) {
        console.warn('Could not fetch current contact data for history:', e);
      }

      const { data, error } = await supabase
        .from('team_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Add history entry (non-blocking — don't fail the update if history insert fails)
      try {
        await supabase.from('team_contacts_history').insert({
          contact_id: id,
          change_type: 'updated',
          previous_values: currentData,
          new_values: data,
          changed_by: user.id,
        });
      } catch (historyError) {
        console.warn('History insert failed, but contact was updated:', historyError);
      }

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
        description: error.message || 'Nie udało się zaktualizować kontaktu',
        variant: 'destructive',
      });
      // Re-throw so the form can display specific error
      throw error;
    }
  };

  const deleteContact = async (id: string) => {
    if (!user) return false;
    
    try {
      // Cancel linked guest registrations before soft-deleting the contact
      await supabase
        .from('guest_event_registrations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('team_contact_id', id)
        .eq('status', 'registered');

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

  // Fetch contact IDs that have event registrations
  const fetchEventContactIds = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('guest_event_registrations')
        .select('team_contact_id, event_id, first_name, status, events(title, start_time)')
        .eq('invited_by_user_id', user.id)
        .not('team_contact_id', 'is', null);
      
      if (error) throw error;
      const ids = new Set<string>();
      const detailsMap = new Map<string, EventRegistrationInfo[]>();
      
      for (const r of (data || [])) {
        const contactId = r.team_contact_id as string;
        ids.add(contactId);
        
        const event = r.events as any;
        if (event) {
          const info: EventRegistrationInfo = {
            event_id: r.event_id,
            event_title: event.title || '',
            event_start_time: event.start_time || '',
            guest_status: r.status || 'registered',
          };
          const existing = detailsMap.get(contactId) || [];
          existing.push(info);
          detailsMap.set(contactId, existing);
        }
      }
      
      setEventContactIds(ids);
      setEventContactDetails(detailsMap);
    } catch (error) {
      console.error('Error fetching event contact IDs:', error);
    }
  }, [user]);

  // Build grouped contacts by event and duplicate detection
  const buildEventGroups = useCallback((allContacts: TeamContact[]): { groups: Map<string, EventGroup>; duplicates: Map<string, number> } => {
    const groups = new Map<string, EventGroup>();
    const duplicates = new Map<string, number>();
    // Track contact keys (email/phone) across events
    const contactEventMap = new Map<string, Set<string>>();

    for (const [contactId, registrations] of eventContactDetails.entries()) {
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) continue;

      // Build duplicate keys
      const keys: string[] = [];
      if (contact.email) keys.push(`email:${contact.email.toLowerCase().trim()}`);
      if (contact.phone_number) keys.push(`phone:${contact.phone_number.replace(/\s+/g, '')}`);

      for (const reg of registrations) {
        // Add to event group
        if (!groups.has(reg.event_id)) {
          groups.set(reg.event_id, {
            event_id: reg.event_id,
            title: reg.event_title,
            date: reg.event_start_time,
            contacts: [],
          });
        }
        groups.get(reg.event_id)!.contacts.push(contact);

        // Track for duplicates
        for (const key of keys) {
          if (!contactEventMap.has(key)) contactEventMap.set(key, new Set());
          contactEventMap.get(key)!.add(reg.event_id);
        }
      }
    }

    // Build duplicate counts per contact id
    for (const contact of allContacts) {
      const keys: string[] = [];
      if (contact.email) keys.push(`email:${contact.email.toLowerCase().trim()}`);
      if (contact.phone_number) keys.push(`phone:${contact.phone_number.replace(/\s+/g, '')}`);
      
      let maxEvents = 0;
      for (const key of keys) {
        const evSet = contactEventMap.get(key);
        if (evSet && evSet.size > maxEvents) maxEvents = evSet.size;
      }
      if (maxEvents > 1) {
        duplicates.set(contact.id, maxEvents);
      }
    }

    return { groups, duplicates };
  }, [eventContactDetails]);

  useEffect(() => {
    fetchContacts();
    fetchEventContactIds();
  }, [fetchContacts, fetchEventContactIds]);

  // Compute grouped data
  const { groups: eventGroupedContacts, duplicates: duplicateContactEvents } = buildEventGroups(contacts);

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
    eventContactIds,
    eventContactDetails,
    eventGroupedContacts,
    duplicateContactEvents,
    pendingOfflineCount: pendingCount,
  };
};
