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
        .is('deleted_at', null)
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
      // Soft delete with deleted_at timestamp (30-day retention)
      const { error } = await supabase
        .from('team_contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Add history entry
      await supabase.from('team_contacts_history').insert({
        contact_id: id,
        change_type: 'deleted',
        changed_by: user.id,
      });

      toast({
        title: 'Kontakt przeniesiony do usuniętych',
        description: 'Możesz go przywrócić w zakładce "Usunięte" przez 30 dni',
      });

      fetchContacts();
      fetchDeletedContacts();
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

  // Fetch soft-deleted contacts (within 30 days)
  const [deletedContacts, setDeletedContacts] = useState<TeamContact[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  const fetchDeletedContacts = useCallback(async () => {
    if (!user) return;
    setDeletedLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('team_contacts')
        .select('*')
        .eq('is_active', true)
        .not('deleted_at', 'is', null)
        .gte('deleted_at', thirtyDaysAgo.toISOString())
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedContacts((data || []) as TeamContact[]);
    } catch (error) {
      console.error('Error fetching deleted contacts:', error);
    } finally {
      setDeletedLoading(false);
    }
  }, [user]);

  const restoreContact = async (id: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('team_contacts')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      // Re-activate linked guest registrations
      await supabase
        .from('guest_event_registrations')
        .update({ status: 'registered', cancelled_at: null })
        .eq('team_contact_id', id)
        .eq('status', 'cancelled');

      toast({
        title: 'Kontakt przywrócony',
        description: 'Kontakt został przywrócony do listy',
      });

      fetchContacts();
      fetchDeletedContacts();
      return true;
    } catch (error: any) {
      console.error('Error restoring contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się przywrócić kontaktu',
        variant: 'destructive',
      });
      return false;
    }
  };

  const moveToOwnList = async (id: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('team_contacts')
        .update({ moved_to_own_list: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Przeniesiono',
        description: 'Kontakt został przeniesiony do Mojej listy kontaktów',
      });

      fetchContacts();
      return true;
    } catch (error: any) {
      console.error('Error moving contact:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się przenieść kontaktu',
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
        .select('team_contact_id, event_id, first_name, email, status, registered_at, registration_attempts, events(title, start_time)')
        .eq('invited_by_user_id', user.id)
        .not('team_contact_id', 'is', null);
      
      if (error) throw error;
      const ids = new Set<string>();
      const detailsMap = new Map<string, EventRegistrationInfo[]>();
      
      // Deduplicate: keep best record per contact+event (prefer 'registered', then latest)
      const seenContactEvent = new Map<string, any>();
      for (const r of (data || [])) {
        const dedupeKey = `${r.team_contact_id}::${r.event_id}`;
        const prev = seenContactEvent.get(dedupeKey);
        if (!prev ||
            (r.status === 'registered' && prev.status !== 'registered') ||
            (r.status === prev.status && (r.registered_at || '') > (prev.registered_at || ''))) {
          seenContactEvent.set(dedupeKey, r);
        }
      }

      for (const r of seenContactEvent.values()) {
        // Skip cancelled-only entries — they shouldn't create event groups
        if (r.status === 'cancelled') continue;
        const contactId = r.team_contact_id as string;
        ids.add(contactId);
        
        const event = r.events as any;
        if (event) {
          const attempts = (r as any).registration_attempts || 1;
          
          const info: EventRegistrationInfo = {
            event_id: r.event_id,
            event_title: event.title || '',
            event_start_time: event.start_time || '',
            guest_status: r.status || 'registered',
            registered_at: r.registered_at || '',
            registration_attempts: attempts > 1 ? attempts : undefined,
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

    for (const [contactId, registrations] of eventContactDetails.entries()) {
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) continue;

      for (const reg of registrations) {
        if (!groups.has(reg.event_id)) {
          groups.set(reg.event_id, {
            event_id: reg.event_id,
            title: reg.event_title,
            date: reg.event_start_time,
            contacts: [],
          });
        }
        groups.get(reg.event_id)!.contacts.push(contact);
      }

      // Per-contact event count — simply count registrations for each contact ID
      if (registrations.length > 1) {
        duplicates.set(contactId, registrations.length);
      }
    }

    return { groups, duplicates };
  }, [eventContactDetails]);

  useEffect(() => {
    fetchContacts();
    fetchEventContactIds();
    fetchDeletedContacts();
  }, [fetchContacts, fetchEventContactIds, fetchDeletedContacts]);

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
    deletedContacts,
    deletedLoading,
    restoreContact,
    moveToOwnList,
  };
};
