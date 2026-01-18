import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Users, ExternalLink, Video } from 'lucide-react';
import { format, subMinutes, isAfter, isBefore, isPast } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EventWithRegistration } from '@/types/events';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EventDetailsDialogProps {
  event: EventWithRegistration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: (eventId: string) => void;
}

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  event,
  open,
  onOpenChange,
  onRegister,
}) => {
  const { language } = useLanguage();
  const locale = language === 'pl' ? pl : enUS;

  if (!event) return null;

  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const now = new Date();
  const fifteenMinutesBefore = subMinutes(eventStart, 15);
  const durationMinutes = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60));

  const isEnded = isAfter(now, eventEnd);
  const isLive = isAfter(now, fifteenMinutesBefore) && isBefore(now, eventEnd);
  const canJoin = event.is_registered && isLive && event.zoom_link;

  const handleRegister = () => {
    onRegister(event.id);
  };

  const getEventTypeBadge = () => {
    switch (event.event_type) {
      case 'webinar':
        return <Badge className="bg-blue-500">Webinar</Badge>;
      case 'meeting_public':
      case 'team_training':
        return <Badge className="bg-green-500">Spotkanie zespołu</Badge>;
      case 'meeting_private':
        return <Badge className="bg-purple-500">Spotkanie prywatne</Badge>;
      case 'tripartite_meeting':
        return <Badge className="bg-violet-500">Spotkanie trójstronne</Badge>;
      case 'partner_consultation':
        return <Badge className="bg-fuchsia-500">Konsultacje</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                {getEventTypeBadge()}
                {isEnded && <Badge variant="secondary">Zakończone</Badge>}
                {isLive && !isEnded && <Badge className="bg-emerald-600">Trwa teraz</Badge>}
              </div>
              <DialogTitle className="text-xl leading-tight">{event.title}</DialogTitle>
            </DialogHeader>

            {/* Event banner/image */}
            {event.image_url && (
              <div className="rounded-lg overflow-hidden -mx-2">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-auto object-cover max-h-48"
                />
              </div>
            )}

            {/* Event info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(eventStart, 'PPPP', { locale })}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(eventStart, 'HH:mm')} - {format(eventEnd, 'HH:mm')} ({durationMinutes} min)
                </span>
              </div>

              {event.host_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Prowadzący: {event.host_name}</span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.max_participants && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {event.registration_count || 0} / {event.max_participants} uczestników
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="font-medium text-sm">Opis</h4>
                <div
                  className="text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t space-y-2">
              {canJoin && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                  <a href={event.zoom_link!} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Dołącz do spotkania
                  </a>
                </Button>
              )}

              {isEnded ? (
                <Button variant="secondary" className="w-full" disabled>
                  Wydarzenie zakończone
                </Button>
              ) : event.is_registered ? (
                <Button variant="secondary" className="w-full" disabled>
                  Jesteś zapisany/a
                </Button>
              ) : (
                <Button className="w-full" onClick={handleRegister}>
                  Zapisz się
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
