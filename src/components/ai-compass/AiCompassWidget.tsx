import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { 
  Compass, Send, Copy, ThumbsUp, ThumbsDown, Clock, 
  CheckCircle, History, Tag, Search, Filter,
  FileText, Link2, Loader2, Download
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

interface Session {
  id: string;
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

interface AiCompassSettings {
  is_enabled: boolean;
  enabled_for_partners: boolean;
  enabled_for_specjalista: boolean;
  enabled_for_clients: boolean;
  allow_export: boolean;
}

export const AiCompassWidget: React.FC = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  
  const [settings, setSettings] = useState<AiCompassSettings | null>(null);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [stages, setStages] = useState<ContactStage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [contextDescription, setContextDescription] = useState('');
  const [lastContactDays, setLastContactDays] = useState<number | undefined>();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
    loadContactTypes();
    loadSessions();
  }, [user]);

  useEffect(() => {
    if (selectedType) {
      loadStages(selectedType);
    }
  }, [selectedType]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('ai_compass_settings')
      .select('*')
      .single();
    setSettings(data);
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

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_compass_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setSessions(data || []);
    
    // Extract unique tags
    const tags = new Set<string>();
    data?.forEach(s => s.tags?.forEach((tag: string) => tags.add(tag)));
    setAllTags(Array.from(tags));
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
          contactTypeId: selectedType || null,
          stageId: selectedStage || null,
          contextDescription,
          lastContactDays,
          userId: user?.id,
        }
      });

      if (response.error) throw response.error;
      
      setResult(response.data);
      loadSessions(); // Refresh history
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
      loadSessions();
      
      // Update learning patterns based on feedback
      const session = sessions.find(s => s.id === sessionId);
      if (session?.contact_type_id && session?.stage_id) {
        const patternType = feedback === 'positive' ? 'success' : 'failure';
        await supabase.from('ai_compass_learning_patterns').upsert({
          contact_type_id: session.contact_type_id,
          stage_id: session.stage_id,
          pattern_type: patternType,
          optimal_timing_days: session.last_contact_days,
          sample_count: 1
        }, {
          onConflict: 'contact_type_id,stage_id,pattern_type'
        });
      }
    }
  };

  const handleAddTag = async (sessionId: string, tag: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newTags = [...(session.tags || []), tag];
    const { error } = await supabase
      .from('ai_compass_sessions')
      .update({ tags: newTags })
      .eq('id', sessionId);

    if (!error) {
      loadSessions();
      toast.success('Dodano tag');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Typ kontaktu', 'Etap', 'Kontekst', 'Decyzja', 'Wiadomość', 'Feedback', 'Tagi'];
    const rows = filteredSessions.map(s => [
      new Date(s.created_at).toLocaleDateString('pl'),
      contactTypes.find(t => t.id === s.contact_type_id)?.name || '',
      stages.find(st => st.id === s.stage_id)?.name || '',
      s.context_description,
      s.ai_decision,
      s.generated_message || '',
      s.user_feedback || '',
      s.tags?.join(', ') || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-compass-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wyeksportowano dane');
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

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = !searchQuery || 
      s.context_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.generated_message?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !filterTag || s.tags?.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Pure AI-Compass
          </CardTitle>
          <CardDescription>
            Opisz kontekst rozmowy, a AI pomoże Ci podjąć decyzję: DZIAŁAJ lub POCZEKAJ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                value={lastContactDays || ''}
                onChange={e => setLastContactDays(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="np. 7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Opisz kontekst rozmowy *</Label>
            <Textarea
              value={contextDescription}
              onChange={e => setContextDescription(e.target.value)}
              placeholder="Opisz sytuację, ostatnią rozmowę, reakcję klienta, Twoje wrażenia..."
              rows={4}
            />
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading || !contextDescription.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizuję...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Analizuj i doradzaj
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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

            {result.resourceId && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Rekomendowany zasób z Centrum Zasobów</span>
                <Button size="sm" variant="outline" asChild>
                  <a href="/knowledge" target="_blank">
                    Zobacz zasób
                  </a>
                </Button>
              </div>
            )}

            {result.reflink && (
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Twój reflink: <code className="bg-muted px-2 py-1 rounded">{result.reflink}</code></span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(result.reflink);
                    toast.success('Skopiowano reflink');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
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

      {/* History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historia decyzji
            </CardTitle>
            {settings?.allow_export && (
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Eksport CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj w historii..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredSessions.map(session => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={session.ai_decision === 'ACT' ? 'default' : 'secondary'}>
                          {session.ai_decision === 'ACT' ? 'DZIAŁAJ' : 'POCZEKAJ'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString('pl')}
                        </span>
                        {session.user_feedback === 'positive' && (
                          <ThumbsUp className="h-3 w-3 text-green-500" />
                        )}
                        {session.user_feedback === 'negative' && (
                          <ThumbsDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{session.context_description}</p>
                      {session.tags?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {session.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          Szczegóły
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Szczegóły sesji</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-muted-foreground">Kontekst</Label>
                            <p className="mt-1">{session.context_description}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Uzasadnienie AI</Label>
                            <p className="mt-1">{session.ai_reasoning}</p>
                          </div>
                          {session.generated_message && (
                            <div>
                              <Label className="text-muted-foreground">Wygenerowana wiadomość</Label>
                              <p className="mt-1 bg-muted p-3 rounded">{session.generated_message}</p>
                            </div>
                          )}
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Dodaj tag..."
                              className="flex-1"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleAddTag(session.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <Tag className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              ))}
              {filteredSessions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Brak historii decyzji
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AiCompassWidget;
