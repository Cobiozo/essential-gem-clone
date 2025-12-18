import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Compass, Send, Copy, ThumbsUp, ThumbsDown, Clock, 
  CheckCircle, History, Tag, Search, Filter,
  FileText, Link2, Loader2, Download, Plus, ArrowLeft,
  Pencil, Trash2, User, RotateCcw, CalendarCheck,
  XCircle, CheckCircle2, Play, Pause, Archive,
  Target, MessageSquare, ChevronRight, Circle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContactType {
  id: string;
  name: string;
  description: string;
  icon_name: string;
}

interface ContactStage {
  id: string;
  name: string;
  contact_type_id: string;
}

interface Contact {
  id: string;
  name: string;
  contact_type_id: string | null;
  stage_id: string | null;
  current_context: string | null;
  last_contact_days: number;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  final_status: string | null;
  final_status_set_at: string | null;
  suggested_next_contact: string | null;
}

interface Session {
  id: string;
  contact_id: string | null;
  contact_type_id: string;
  stage_id: string;
  context_description: string;
  last_contact_days: number;
  ai_decision: string;
  ai_reasoning: string;
  generated_message: string;
  recommended_resource_id: string;
  generated_reflink: string;
  user_feedback: string | null;
  notes: string;
  tags: string[];
  created_at: string;
}

interface ContactHistory {
  id: string;
  contact_id: string;
  change_type: string;
  previous_values: any;
  new_values: any;
  ai_session_id: string | null;
  created_at: string;
}

interface AiCompassSettings {
  is_enabled: boolean;
  enabled_for_partners: boolean;
  enabled_for_specjalista: boolean;
  enabled_for_clients: boolean;
  allow_export: boolean;
  allow_delete_contacts: boolean;
  allow_delete_history: boolean;
  allow_edit_contacts: boolean;
  allow_multiple_decisions: boolean;
  data_retention_days: number | null;
  show_today_dashboard: boolean;
  show_contact_timeline: boolean;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'ai_decision' | 'stage_changed' | 'status_changed';
  date: string;
  title: string;
  description?: string;
  decision?: string;
  sessionId?: string;
}

type ViewMode = 'today' | 'contacts' | 'new' | 'detail' | 'edit';

export const AiCompassWidget: React.FC = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  
  const [settings, setSettings] = useState<AiCompassSettings | null>(null);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [stages, setStages] = useState<ContactStage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Form states
  const [contactName, setContactName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [contextDescription, setContextDescription] = useState('');
  const [lastContactDays, setLastContactDays] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'closed' | 'all'>('active');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
    loadContactTypes();
    loadContacts();
  }, [user]);

  useEffect(() => {
    if (selectedType) {
      loadStages(selectedType);
    } else {
      setStages([]);
    }
  }, [selectedType]);

  useEffect(() => {
    if (selectedContact) {
      loadContactSessions(selectedContact.id);
      loadContactHistory(selectedContact.id);
    }
  }, [selectedContact]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('ai_compass_settings')
      .select('*')
      .single();
    setSettings(data);
    
    // Default to today dashboard if enabled, otherwise contacts
    if (data?.show_today_dashboard !== false) {
      setViewMode('today');
    } else {
      setViewMode('contacts');
    }
  };

  const loadContactTypes = async () => {
    const { data } = await supabase
      .from('ai_compass_contact_types')
      .select('*')
      .eq('is_active', true)
      .order('position');
    setContactTypes(data || []);
  };

  const loadStages = async (typeId: string) => {
    const { data } = await supabase
      .from('ai_compass_contact_stages')
      .select('*')
      .eq('contact_type_id', typeId)
      .eq('is_active', true)
      .order('position');
    setStages(data || []);
  };

  const loadContacts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_compass_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    setContacts(data || []);
    
    // Extract unique tags
    const tags = new Set<string>();
    data?.forEach(c => c.tags?.forEach((tag: string) => tags.add(tag)));
    setAllTags(Array.from(tags));
  };

  const loadContactSessions = async (contactId: string) => {
    const { data } = await supabase
      .from('ai_compass_sessions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setSessions(data || []);
  };

  const loadContactHistory = async (contactId: string) => {
    const { data } = await supabase
      .from('ai_compass_contact_history')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setContactHistory(data || []);
  };

  // Build timeline from contact data
  const buildTimeline = useMemo((): TimelineEvent[] => {
    if (!selectedContact) return [];
    
    const events: TimelineEvent[] = [];
    
    // Add contact creation
    events.push({
      id: 'created-' + selectedContact.id,
      type: 'created',
      date: selectedContact.created_at,
      title: 'Kontakt utworzony',
      description: `Dodano kontakt "${selectedContact.name}"`
    });
    
    // Add history entries
    contactHistory.forEach(entry => {
      let title = entry.change_type;
      let description = '';
      
      switch (entry.change_type) {
        case 'updated':
          title = 'Aktualizacja danych';
          if (entry.new_values?.stage_id !== entry.previous_values?.stage_id) {
            title = 'Zmiana etapu';
          }
          break;
        case 'stage_changed':
          title = 'Zmiana etapu';
          break;
        case 'status_changed':
          title = 'Zmiana statusu';
          description = entry.new_values?.final_status === 'success' 
            ? 'Zamknięto jako sukces' 
            : entry.new_values?.final_status === 'not_now'
            ? 'Zamknięto jako "nie teraz"'
            : 'Reaktywowano kontakt';
          break;
      }
      
      events.push({
        id: entry.id,
        type: entry.change_type as any,
        date: entry.created_at,
        title,
        description,
        sessionId: entry.ai_session_id || undefined
      });
    });
    
    // Add AI decisions from sessions
    sessions.forEach(session => {
      events.push({
        id: 'session-' + session.id,
        type: 'ai_decision',
        date: session.created_at,
        title: session.ai_decision === 'ACT' ? 'AI: DZIAŁAJ' : 'AI: POCZEKAJ',
        description: session.ai_reasoning?.substring(0, 100) + (session.ai_reasoning?.length > 100 ? '...' : ''),
        decision: session.ai_decision,
        sessionId: session.id
      });
    });
    
    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedContact, contactHistory, sessions]);

  // "Today to do" contacts - AI said ACT or suggested time has passed
  const todayContacts = useMemo(() => {
    const now = new Date();
    return contacts
      .filter(c => !c.final_status) // Only active contacts
      .map(contact => {
        // Find latest AI decision for this contact
        const latestSession = sessions.find(s => s.contact_id === contact.id);
        const isActionable = latestSession?.ai_decision === 'ACT';
        const suggestedPassed = contact.suggested_next_contact && new Date(contact.suggested_next_contact) <= now;
        
        return {
          ...contact,
          latestSession,
          isActionable,
          suggestedPassed,
          priority: isActionable ? 1 : suggestedPassed ? 2 : 3
        };
      })
      .filter(c => c.isActionable || c.suggestedPassed)
      .sort((a, b) => a.priority - b.priority);
  }, [contacts, sessions]);

  // Load all sessions for today view
  useEffect(() => {
    if (viewMode === 'today' && user) {
      loadAllSessions();
    }
  }, [viewMode, user]);

  const loadAllSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_compass_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Store all sessions for reference
    if (data) {
      // Create a map of latest session per contact
      const latestByContact = new Map<string, Session>();
      data.forEach(s => {
        if (s.contact_id && !latestByContact.has(s.contact_id)) {
          latestByContact.set(s.contact_id, s);
        }
      });
      setSessions(data);
    }
  };

  const handleCreateContact = async () => {
    if (!contactName.trim()) {
      toast.error('Podaj nazwę kontaktu');
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: newContact, error } = await supabase
        .from('ai_compass_contacts')
        .insert({
          user_id: user.id,
          name: contactName,
          contact_type_id: selectedType || null,
          stage_id: selectedStage || null,
          current_context: contextDescription || null,
          last_contact_days: lastContactDays,
          notes: notes || null,
          tags: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation in history
      await supabase.from('ai_compass_contact_history').insert({
        contact_id: newContact.id,
        change_type: 'created',
        new_values: { name: contactName, contact_type_id: selectedType, stage_id: selectedStage },
        created_by: user.id,
      });

      toast.success('Utworzono kontakt');
      loadContacts();
      setSelectedContact(newContact);
      setViewMode('detail');
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Błąd tworzenia kontaktu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!selectedContact || !user) return;

    setIsLoading(true);
    try {
      const previousValues = {
        name: selectedContact.name,
        contact_type_id: selectedContact.contact_type_id,
        stage_id: selectedContact.stage_id,
        current_context: selectedContact.current_context,
        last_contact_days: selectedContact.last_contact_days,
        notes: selectedContact.notes,
      };

      const newValues = {
        name: contactName,
        contact_type_id: selectedType || null,
        stage_id: selectedStage || null,
        current_context: contextDescription || null,
        last_contact_days: lastContactDays,
        notes: notes || null,
      };

      const { error } = await supabase
        .from('ai_compass_contacts')
        .update(newValues)
        .eq('id', selectedContact.id);

      if (error) throw error;

      // Log change in history
      await supabase.from('ai_compass_contact_history').insert({
        contact_id: selectedContact.id,
        change_type: 'updated',
        previous_values: previousValues,
        new_values: newValues,
        created_by: user.id,
      });

      toast.success('Zaktualizowano kontakt');
      loadContacts();
      
      // Refresh selected contact
      const { data: updated } = await supabase
        .from('ai_compass_contacts')
        .select('*')
        .eq('id', selectedContact.id)
        .single();
      setSelectedContact(updated);
      setViewMode('detail');
    } catch (error: any) {
      toast.error(error.message || 'Błąd aktualizacji kontaktu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetFinalStatus = async (contactId: string, status: 'success' | 'not_now' | null) => {
    if (!user) return;
    
    try {
      const contact = contacts.find(c => c.id === contactId);
      const previousStatus = contact?.final_status;
      
      const { error } = await supabase
        .from('ai_compass_contacts')
        .update({ 
          final_status: status,
          final_status_set_at: status ? new Date().toISOString() : null
        })
        .eq('id', contactId);

      if (error) throw error;

      // Log status change
      await supabase.from('ai_compass_contact_history').insert({
        contact_id: contactId,
        change_type: 'status_changed',
        previous_values: { final_status: previousStatus },
        new_values: { final_status: status },
        created_by: user.id,
      });

      const statusText = status === 'success' ? 'Zamknięto jako sukces' : 
                         status === 'not_now' ? 'Zamknięto jako "nie teraz"' : 
                         'Reaktywowano kontakt';
      toast.success(statusText);
      loadContacts();
      
      if (selectedContact?.id === contactId) {
        const { data: updated } = await supabase
          .from('ai_compass_contacts')
          .select('*')
          .eq('id', contactId)
          .single();
        setSelectedContact(updated);
        loadContactHistory(contactId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd zmiany statusu');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_compass_contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast.success('Usunięto kontakt');
      loadContacts();
      setSelectedContact(null);
      setViewMode('contacts');
    } catch (error: any) {
      toast.error(error.message || 'Błąd usuwania kontaktu');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_compass_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Usunięto decyzję AI');
      if (selectedContact) {
        loadContactSessions(selectedContact.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd usuwania decyzji');
    }
  };

  const handleDeleteHistoryEntry = async (historyId: string) => {
    try {
      const { error } = await supabase
        .from('ai_compass_contact_history')
        .delete()
        .eq('id', historyId);

      if (error) throw error;

      toast.success('Usunięto wpis historii');
      if (selectedContact) {
        loadContactHistory(selectedContact.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Błąd usuwania historii');
    }
  };

  const handleAnalyze = async () => {
    if (!contextDescription.trim()) {
      toast.error('Opisz kontekst rozmowy');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke('ai-compass', {
        body: {
          contactId: selectedContact?.id || null,
          contactTypeId: selectedType || selectedContact?.contact_type_id || null,
          stageId: selectedStage || selectedContact?.stage_id || null,
          contextDescription,
          lastContactDays: lastContactDays || selectedContact?.last_contact_days || 0,
          userId: user?.id,
        }
      });

      if (response.error) throw response.error;
      
      setResult(response.data);
      
      // Update contact's current_context and suggested_next_contact if working with existing contact
      if (selectedContact) {
        const updateData: any = { 
          current_context: contextDescription,
          last_contact_days: lastContactDays || selectedContact.last_contact_days,
        };
        
        // If AI says wait, set suggested next contact date
        if (response.data?.decision === 'WAIT' && response.data?.waitDays) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + response.data.waitDays);
          updateData.suggested_next_contact = nextDate.toISOString();
        } else {
          updateData.suggested_next_contact = null;
        }
        
        await supabase
          .from('ai_compass_contacts')
          .update(updateData)
          .eq('id', selectedContact.id);
        
        loadContactSessions(selectedContact.id);
        loadContactHistory(selectedContact.id);
        loadContacts();
      }
      
      toast.success('Analiza zakończona');
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Błąd analizy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (result?.message) {
      navigator.clipboard.writeText(result.message);
      toast.success('Skopiowano wiadomość');
    }
  };

  const handleFeedback = async (sessionId: string, feedback: 'positive' | 'negative') => {
    const { error } = await supabase
      .from('ai_compass_sessions')
      .update({ user_feedback: feedback })
      .eq('id', sessionId);

    if (!error) {
      toast.success('Dziękujemy za opinię');
      if (selectedContact) {
        loadContactSessions(selectedContact.id);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Kontakt', 'Typ kontaktu', 'Etap', 'Kontekst', 'Decyzja', 'Wiadomość', 'Feedback'];
    const rows = sessions.map(s => [
      new Date(s.created_at).toLocaleDateString('pl'),
      selectedContact?.name || '',
      contactTypes.find(t => t.id === s.contact_type_id)?.name || '',
      stages.find(st => st.id === s.stage_id)?.name || '',
      s.context_description,
      s.ai_decision,
      s.generated_message || '',
      s.user_feedback || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-compass-${selectedContact?.name || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wyeksportowano dane');
  };

  const resetForm = () => {
    setContactName('');
    setSelectedType('');
    setSelectedStage('');
    setContextDescription('');
    setLastContactDays(0);
    setNotes('');
    setResult(null);
  };

  const openEditMode = () => {
    if (!selectedContact) return;
    setContactName(selectedContact.name);
    setSelectedType(selectedContact.contact_type_id || '');
    setSelectedStage(selectedContact.stage_id || '');
    setContextDescription(selectedContact.current_context || '');
    setLastContactDays(selectedContact.last_contact_days);
    setNotes(selectedContact.notes || '');
    setViewMode('edit');
  };

  const openContactDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setContextDescription(contact.current_context || '');
    setLastContactDays(contact.last_contact_days);
    setViewMode('detail');
  };

  // Check access
  const roleValue = userRole?.role;
  const hasAccess = settings?.is_enabled && (
    (roleValue === 'partner' && settings.enabled_for_partners) ||
    (roleValue === 'specjalista' && settings.enabled_for_specjalista) ||
    (roleValue === 'client' && settings.enabled_for_clients) ||
    roleValue === 'admin'
  );

  if (!hasAccess) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Compass className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Moduł AI-Compass jest niedostępny dla Twojej roli.</p>
        </CardContent>
      </Card>
    );
  }

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.current_context?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !filterTag || c.tags?.includes(filterTag);
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && !c.final_status) ||
      (filterStatus === 'closed' && c.final_status);
    return matchesSearch && matchesTag && matchesStatus;
  });

  // "TODAY TO DO" DASHBOARD VIEW
  if (viewMode === 'today') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Dziś do zrobienia
                </CardTitle>
                <CardDescription>
                  Kontakty wymagające Twojej uwagi
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewMode('contacts')}>
                  <User className="h-4 w-4 mr-2" />
                  Wszystkie kontakty
                </Button>
                <Button onClick={() => { resetForm(); setViewMode('new'); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nowy kontakt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {todayContacts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Wszystko ogarnięte!</p>
                <p className="text-muted-foreground mt-1">Brak kontaktów wymagających działania</p>
                <Button variant="outline" className="mt-4" onClick={() => setViewMode('contacts')}>
                  Przeglądaj wszystkie kontakty
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {todayContacts.map(contact => {
                    const type = contactTypes.find(t => t.id === contact.contact_type_id);
                    const stage = stages.find(s => s.id === contact.stage_id);
                    const latestSession = sessions.find(s => s.contact_id === contact.id);
                    
                    return (
                      <Card 
                        key={contact.id} 
                        className={`p-4 border-l-4 ${contact.isActionable ? 'border-l-green-500' : 'border-l-amber-500'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={contact.isActionable ? 'default' : 'secondary'}>
                                {contact.isActionable ? 'DZIAŁAJ' : 'Czas minął'}
                              </Badge>
                              <span className="font-medium">{contact.name}</span>
                              {type && <Badge variant="outline" className="text-xs">{type.name}</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {stage && <span>Etap: {stage.name} • </span>}
                              <span>{contact.last_contact_days} dni od kontaktu</span>
                            </div>
                            {latestSession?.ai_reasoning && (
                              <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                                {latestSession.ai_reasoning}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => openContactDetail(contact)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Zapytaj Compass
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openContactDetail(contact)}
                            >
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Szczegóły
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // CONTACTS LIST VIEW
  if (viewMode === 'contacts') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  Pure AI-Compass
                </CardTitle>
                <CardDescription>
                  Zarządzaj kontaktami i podejmuj decyzje z pomocą AI
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {settings?.show_today_dashboard !== false && (
                  <Button variant="outline" onClick={() => setViewMode('today')}>
                    <Target className="h-4 w-4 mr-2" />
                    Dziś do zrobienia
                    {todayContacts.length > 0 && (
                      <Badge variant="destructive" className="ml-2">{todayContacts.length}</Badge>
                    )}
                  </Button>
                )}
                <Button onClick={() => { resetForm(); setViewMode('new'); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nowy kontakt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj kontakt..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktywne</SelectItem>
                  <SelectItem value="closed">Zamknięte</SelectItem>
                  <SelectItem value="all">Wszystkie</SelectItem>
                </SelectContent>
              </Select>
              {allTags.length > 0 && (
                <Select value={filterTag || '_all'} onValueChange={(val) => setFilterTag(val === '_all' ? '' : val)}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Wszystkie</SelectItem>
                    {allTags.filter(tag => tag && tag.trim() !== '').map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Brak kontaktów</p>
                <Button variant="outline" className="mt-4" onClick={() => setViewMode('new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj pierwszy kontakt
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredContacts.map(contact => {
                    const type = contactTypes.find(t => t.id === contact.contact_type_id);
                    const stage = stages.find(s => s.id === contact.stage_id);
                    
                    return (
                      <Card 
                        key={contact.id} 
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          contact.final_status ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div 
                            className="flex-1"
                            onClick={() => openContactDetail(contact)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{contact.name}</span>
                              {type && <Badge variant="outline">{type.name}</Badge>}
                              {contact.final_status === 'success' && (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sukces
                                </Badge>
                              )}
                              {contact.final_status === 'not_now' && (
                                <Badge variant="secondary">
                                  <Pause className="h-3 w-3 mr-1" />
                                  Nie teraz
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {stage && <span>Etap: {stage.name} • </span>}
                              <span>{contact.last_contact_days} dni temu</span>
                            </div>
                            {contact.current_context && (
                              <p className="text-sm mt-2 line-clamp-2">{contact.current_context}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {settings?.allow_edit_contacts && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedContact(contact); 
                                  openEditMode(); 
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {settings?.allow_delete_contacts && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={e => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń kontakt?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Ta operacja usunie kontakt "{contact.name}" wraz z całą historią.
                                      Tej operacji nie można cofnąć.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>
                                      Usuń
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // NEW / EDIT CONTACT FORM
  if (viewMode === 'new' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => { setViewMode('contacts'); resetForm(); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>{viewMode === 'new' ? 'Nowy kontakt' : 'Edytuj kontakt'}</CardTitle>
                <CardDescription>
                  {viewMode === 'new' ? 'Dodaj nowy kontakt do obsługi' : `Edycja: ${selectedContact?.name}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nazwa kontaktu *</Label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="np. Jan Kowalski - Warszawa"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Typ kontaktu</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Etap</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage} disabled={!selectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz etap..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dni od ostatniego kontaktu</Label>
                <Input
                  type="number"
                  min={0}
                  value={lastContactDays}
                  onChange={e => setLastContactDays(parseInt(e.target.value) || 0)}
                  placeholder="np. 7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kontekst rozmowy</Label>
              <Textarea
                value={contextDescription}
                onChange={e => setContextDescription(e.target.value)}
                placeholder="Opisz sytuację, ostatnią rozmowę, reakcję klienta..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Notatki prywatne</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Twoje prywatne notatki..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={viewMode === 'new' ? handleCreateContact : handleUpdateContact} 
                disabled={isLoading || !contactName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {viewMode === 'new' ? 'Tworzenie...' : 'Zapisywanie...'}
                  </>
                ) : (
                  viewMode === 'new' ? 'Utwórz kontakt' : 'Zapisz zmiany'
                )}
              </Button>
              <Button variant="outline" onClick={() => { setViewMode('contacts'); resetForm(); }}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CONTACT DETAIL VIEW
  if (viewMode === 'detail' && selectedContact) {
    const type = contactTypes.find(t => t.id === selectedContact.contact_type_id);
    const stage = stages.find(s => s.id === selectedContact.stage_id);

    return (
      <div className="space-y-6">
        {/* Contact header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => { setViewMode('contacts'); setSelectedContact(null); resetForm(); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedContact.name}
                    {selectedContact.final_status === 'success' && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sukces
                      </Badge>
                    )}
                    {selectedContact.final_status === 'not_now' && (
                      <Badge variant="secondary">
                        <Pause className="h-3 w-3 mr-1" />
                        Nie teraz
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {type && <Badge variant="outline">{type.name}</Badge>}
                    {stage && <Badge variant="secondary">{stage.name}</Badge>}
                    <span className="text-muted-foreground">• {selectedContact.last_contact_days} dni od kontaktu</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedContact.final_status ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reaktywuj kontakt
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reaktywować kontakt?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Kontakt zostanie przywrócony do aktywnych i ponownie będzie dostępny do pracy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSetFinalStatus(selectedContact.id, null)}>
                          Reaktywuj
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                          Sukces
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Zamknij jako sukces?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Kontakt zostanie oznaczony jako zakończony sukcesem i nie będzie pojawiał się w widoku "Dziś do zrobienia".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSetFinalStatus(selectedContact.id, 'success')}>
                            Zamknij jako sukces
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-2" />
                          Nie teraz
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Zamknij jako "nie teraz"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Kontakt zostanie odłożony na później. Możesz go reaktywować w dowolnym momencie.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSetFinalStatus(selectedContact.id, 'not_now')}>
                            Zamknij jako "nie teraz"
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {selectedContact.final_status === 'not_now' && (
                  <Button variant="outline" size="sm" onClick={() => handleSetFinalStatus(selectedContact.id, null)}>
                    <Play className="h-4 w-4 mr-2" />
                    Reaktywuj
                  </Button>
                )}
                {settings?.allow_edit_contacts && (
                  <Button variant="outline" size="sm" onClick={openEditMode}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edytuj
                  </Button>
                )}
                {settings?.allow_delete_contacts && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                        Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usuń kontakt?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ta operacja usunie kontakt "{selectedContact.name}" wraz z {sessions.length} decyzjami AI i {contactHistory.length} wpisami historii.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteContact(selectedContact.id)}>
                          Usuń
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedContact.current_context && (
              <div className="mb-4">
                <Label className="text-muted-foreground">Aktualny kontekst</Label>
                <p className="mt-1">{selectedContact.current_context}</p>
              </div>
            )}
            {selectedContact.notes && (
              <div>
                <Label className="text-muted-foreground">Notatki</Label>
                <p className="mt-1 text-sm">{selectedContact.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis - only for active contacts */}
        {!selectedContact.final_status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Nowa analiza AI
              </CardTitle>
              <CardDescription>
                Opisz aktualną sytuację, a AI pomoże Ci podjąć decyzję
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Opisz aktualny kontekst *</Label>
                <Textarea
                  value={contextDescription}
                  onChange={e => setContextDescription(e.target.value)}
                  placeholder="Opisz sytuację, ostatnią rozmowę, reakcję klienta, Twoje wrażenia..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Dni od kontaktu</Label>
                  <Input
                    type="number"
                    min={0}
                    value={lastContactDays || selectedContact.last_contact_days}
                    onChange={e => setLastContactDays(parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading || !contextDescription.trim() || (!settings?.allow_multiple_decisions && sessions.length > 0)}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizuję...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Wygeneruj nową decyzję AI
                  </>
                )}
              </Button>

              {!settings?.allow_multiple_decisions && sessions.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Wielokrotne generowanie decyzji AI jest wyłączone przez administratora.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Result Card */}
        {result && (
          <Card className={result.decision === 'ACT' ? 'border-green-500' : 'border-amber-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.decision === 'ACT' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600">DZIAŁAJ</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-amber-500" />
                    <span className="text-amber-600">POCZEKAJ {result.waitDays ? `(${result.waitDays} dni)` : ''}</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Uzasadnienie</Label>
                <p className="mt-1">{result.reasoning}</p>
              </div>

              {result.message && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Gotowa wiadomość follow-up</Label>
                  <div className="bg-muted p-4 rounded-lg relative">
                    <p className="whitespace-pre-wrap pr-10">{result.message}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={handleCopyMessage}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {result.sessionId && (
                <div className="flex items-center gap-2 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Czy ta porada była pomocna?</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFeedback(result.sessionId, 'positive')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Tak
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFeedback(result.sessionId, 'negative')}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Nie
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline - Visual history */}
        {settings?.show_contact_timeline !== false && buildTimeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Timeline kontaktu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {buildTimeline.map((event, index) => (
                      <div key={event.id} className="relative flex gap-4">
                        {/* Dot indicator */}
                        <div className={`absolute left-[-15px] w-4 h-4 rounded-full border-2 ${
                          event.type === 'ai_decision' 
                            ? event.decision === 'ACT' 
                              ? 'bg-green-500 border-green-600' 
                              : 'bg-amber-500 border-amber-600'
                            : event.type === 'created'
                            ? 'bg-blue-500 border-blue-600'
                            : event.type === 'status_changed'
                            ? 'bg-purple-500 border-purple-600'
                            : 'bg-muted border-border'
                        }`} />
                        
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{event.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString('pl', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* History of AI decisions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historia decyzji AI ({sessions.length})
              </CardTitle>
              {settings?.allow_export && sessions.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Eksport
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Brak decyzji AI dla tego kontaktu</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {sessions.map(session => (
                    <Card key={session.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={session.ai_decision === 'ACT' ? 'default' : 'secondary'}>
                              {session.ai_decision === 'ACT' ? 'DZIAŁAJ' : 'POCZEKAJ'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString('pl')}
                            </span>
                            {session.user_feedback && (
                              <Badge variant={session.user_feedback === 'positive' ? 'default' : 'destructive'}>
                                {session.user_feedback === 'positive' ? '👍' : '👎'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{session.ai_reasoning}</p>
                          {session.generated_message && (
                            <div className="mt-2 p-2 bg-muted/50 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Wiadomość:</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(session.generated_message || '');
                                    toast.success('Skopiowano wiadomość');
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{session.generated_message}</p>
                            </div>
                          )}
                        </div>
                        {settings?.allow_delete_history && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Usuń decyzję AI?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tej operacji nie można cofnąć.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
