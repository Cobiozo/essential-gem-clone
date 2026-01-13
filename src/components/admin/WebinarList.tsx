import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  User
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

interface WebinarListProps {
  webinars: DbEvent[];
  onEdit: (webinar: DbEvent) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const WebinarList: React.FC<WebinarListProps> = ({
  webinars,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const dateLocale = language === 'pl' ? pl : enUS;

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Sukces', description: 'Link skopiowany do schowka' });
  };

  const handleTogglePublic = async (webinar: DbEvent, isPublic: boolean) => {
    const { error } = await supabase
      .from('events')
      .update({ visible_to_everyone: isPublic })
      .eq('id', webinar.id);
    
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Sukces', description: 'Widoczność zmieniona' });
    onRefresh();
  };

  const getStatusBadge = (webinar: DbEvent) => {
    const startDate = new Date(webinar.start_time);
    if (isPast(new Date(webinar.end_time))) {
      return <Badge variant="secondary">Zakończony</Badge>;
    }
    if (isFuture(startDate)) {
      return <Badge className="bg-emerald-500">Nadchodzący</Badge>;
    }
    return <Badge className="bg-amber-500">Trwa</Badge>;
  };

  const getReminderInfo = (webinar: DbEvent) => {
    const parts: string[] = [];
    if (webinar.sms_reminder_enabled) parts.push('SMS');
    if (webinar.email_reminder_enabled) parts.push('Email');
    return parts.length > 0 ? parts.join(' + ') : 'Brak';
  };

  if (webinars.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Brak webinarów. Kliknij "Dodaj Webinar" aby utworzyć pierwszy.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {webinars.map((webinar) => (
        <Card key={webinar.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Thumbnail */}
              <div className="w-full md:w-48 h-32 md:h-auto bg-muted flex-shrink-0">
                {webinar.image_url ? (
                  <img 
                    src={webinar.image_url} 
                    alt={webinar.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-4xl">📹</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title and Status */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{webinar.title}</h3>
                      {getStatusBadge(webinar)}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(webinar.start_time), 'dd MMMM yyyy, HH:mm', { locale: dateLocale })}
                      </span>
                      {webinar.host_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {webinar.host_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        {webinar.sms_reminder_enabled && <MessageSquare className="h-3.5 w-3.5" />}
                        {webinar.email_reminder_enabled && <Mail className="h-3.5 w-3.5" />}
                        {getReminderInfo(webinar)}
                      </span>
                    </div>

                    {/* Zoom Link */}
                    {webinar.zoom_link && (
                      <div className="flex items-center gap-2 text-sm">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs truncate max-w-[300px]">
                          {webinar.zoom_link}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleCopyLink(webinar.zoom_link!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Right side controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Publiczny</span>
                      <Switch
                        checked={webinar.visible_to_everyone ?? false}
                        onCheckedChange={(checked) => handleTogglePublic(webinar, checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" className="h-8">
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Uczestnicy
                  </Button>
                  {webinar.guest_link && (
                    <Button variant="outline" size="sm" className="h-8">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Link gościa
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8"
                    onClick={() => onEdit(webinar)}
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
                          Ta akcja jest nieodwracalna. Webinar "{webinar.title}" zostanie trwale usunięty.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(webinar.id)}
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
  );
};

export default WebinarList;
