import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { 
  Copy, 
  Users, 
  ExternalLink,
  Pencil, 
  Trash2,
  Mail,
  MessageSquare,
  Clock,
  User,
  Eye,
  Download,
  MapPin
} from 'lucide-react';
import type { DbEvent } from '@/types/events';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';
import { useEvents } from '@/hooks/useEvents';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TeamTrainingListProps {
  trainings: DbEvent[];
  onEdit: (training: DbEvent) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

interface Participant {
  id: string;
  user_id: string;
  registered_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

const trainingTypeLabels: Record<string, string> = {
  wewnetrzny: 'Wewnętrzny',
  zewnetrzny: 'Zewnętrzny',
  onboarding: 'Onboarding',
  produktowy: 'Produktowy',
  biznesowy: 'Biznesowy',
};

export const TeamTrainingList: React.FC<TeamTrainingListProps> = ({
  trainings,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { getEventRegistrations } = useEvents();
  const dateLocale = language === 'pl' ? pl : enUS;

  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<DbEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Sukces', description: 'Link skopiowany do schowka' });
  };

  const handleVisibilityChange = async (training: DbEvent, settings: {
    visible_to_everyone?: boolean;
    visible_to_clients?: boolean;
    visible_to_partners?: boolean;
    visible_to_specjalista?: boolean;
    visible_to_anonymous?: boolean;
  }) => {
    const { error } = await supabase
      .from('events')
      .update({
        visible_to_everyone: settings.visible_to_everyone ?? false,
        visible_to_clients: settings.visible_to_clients ?? false,
        visible_to_partners: settings.visible_to_partners ?? false,
        visible_to_specjalista: settings.visible_to_specjalista ?? false,
      })
      .eq('id', training.id);
    
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Sukces', description: 'Widoczność zmieniona' });
    onRefresh();
  };

  const handleShowParticipants = async (training: DbEvent) => {
    setSelectedTraining(training);
    setLoadingParticipants(true);
    setParticipantsDialogOpen(true);
    
    try {
      const registrations = await getEventRegistrations(training.id);
      const mapped = (registrations || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        registered_at: r.registered_at,
        profiles: r.profiles || null,
      })) as Participant[];
      setParticipants(mapped);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({ title: 'Błąd', description: 'Nie udało się pobrać listy uczestników', variant: 'destructive' });
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0 || !selectedTraining) return;
    
    const headers = ['Imię', 'Nazwisko', 'Email', 'Data zapisu'];
    const rows = participants.map(p => [
      p.profiles?.first_name || '',
      p.profiles?.last_name || '',
      p.profiles?.email || '',
      format(new Date(p.registered_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uczestnicy-szkolenie-${selectedTraining.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (training: DbEvent) => {
    const startDate = new Date(training.start_time);
    if (isPast(new Date(training.end_time))) {
      return <Badge variant="secondary">Zakończone</Badge>;
    }
    if (isFuture(startDate)) {
      return <Badge className="bg-emerald-500">Nadchodzące</Badge>;
    }
    return <Badge className="bg-amber-500">Trwa</Badge>;
  };

  const getTypeBadge = (training: DbEvent) => {
    const typeLabel = trainingTypeLabels[training.webinar_type || ''] || training.webinar_type;
    return <Badge variant="outline" className="text-xs">{typeLabel}</Badge>;
  };

  const getReminderInfo = (training: DbEvent) => {
    const parts: string[] = [];
    if (training.sms_reminder_enabled) parts.push('SMS');
    if (training.email_reminder_enabled) parts.push('Email');
    return parts.length > 0 ? parts.join(' + ') : 'Brak';
  };

  const getVisibilityBadgeText = (training: DbEvent) => {
    if (training.visible_to_everyone) return 'Wszyscy';
    const roles: string[] = [];
    if (training.visible_to_clients) roles.push('K');
    if (training.visible_to_partners) roles.push('P');
    if (training.visible_to_specjalista) roles.push('S');
    return roles.length > 0 ? roles.join('+') : 'Brak';
  };

  const getCurrentVisibilitySettings = (training: DbEvent) => ({
    visible_to_everyone: training.visible_to_everyone ?? false,
    visible_to_clients: training.visible_to_clients ?? false,
    visible_to_partners: training.visible_to_partners ?? false,
    visible_to_specjalista: training.visible_to_specjalista ?? false,
    visible_to_anonymous: false,
  });

  if (trainings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Brak szkoleń zespołu. Kliknij "Dodaj Szkolenie" aby utworzyć pierwsze.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {trainings.map((training) => (
          <Card key={training.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail */}
                <div className="w-full md:w-48 h-32 md:h-auto bg-muted flex-shrink-0">
                  {training.image_url ? (
                    <img 
                      src={training.image_url} 
                      alt={training.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Users className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Title and Status */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-lg">{training.title}</h3>
                        {getStatusBadge(training)}
                        {getTypeBadge(training)}
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(training.start_time), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}
                        </span>
                        {training.host_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {training.host_name}
                          </span>
                        )}
                        {training.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {training.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {training.sms_reminder_enabled && <MessageSquare className="h-3.5 w-3.5" />}
                          {training.email_reminder_enabled && <Mail className="h-3.5 w-3.5" />}
                          {getReminderInfo(training)}
                        </span>
                      </div>

                      {/* Meeting Link */}
                      {training.zoom_link && (
                        <div className="flex items-center gap-2 text-sm">
                          <code className="px-2 py-0.5 bg-muted rounded text-xs truncate max-w-[300px]">
                            {training.zoom_link}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleCopyLink(training.zoom_link!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right side controls - Visibility Popover */}
                    <div className="flex flex-col items-end gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs">{getVisibilityBadgeText(training)}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <VisibilityEditor
                            value={getCurrentVisibilitySettings(training)}
                            onChange={(settings) => handleVisibilityChange(training, settings)}
                            compact
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleShowParticipants(training)}
                    >
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Uczestnicy
                    </Button>
                    {training.zoom_link && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8"
                        onClick={() => window.open(training.zoom_link!, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Otwórz link
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => onEdit(training)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edytuj
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Usuń
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ta akcja jest nieodwracalna. Szkolenie "{training.title}" zostanie trwale usunięte.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(training.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Usuń
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Participants Dialog */}
      <Dialog open={participantsDialogOpen} onOpenChange={setParticipantsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Uczestnicy: {selectedTraining?.title}</span>
              {participants.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Eksportuj CSV
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {loadingParticipants ? (
            <div className="text-center py-8 text-muted-foreground">
              Ładowanie listy uczestników...
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak zapisanych uczestników
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imię i nazwisko</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data zapisu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        {participant.profiles?.first_name || ''} {participant.profiles?.last_name || ''}
                      </TableCell>
                      <TableCell>{participant.profiles?.email || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(participant.registered_at), 'dd.MM.yyyy HH:mm', { locale: dateLocale })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground text-center">
            Łącznie: {participants.length} uczestników
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTrainingList;
