import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Speaker {
  id: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  position?: number;
}

interface PaidEventSpeakersProps {
  speakers: Speaker[];
  sectionTitle?: string;
  /** Optional overrides — when null/undefined, falls back to neutral page background (matches admin preview). */
  backgroundColor?: string | null;
  textColor?: string | null;
}

const SpeakerCard: React.FC<{ speaker: Speaker }> = ({ speaker }) => {
  const [open, setOpen] = useState(false);
  const hasBio = !!speaker.bio && speaker.bio.trim().length > 0;

  return (
    <>
      <Card className="bg-card border-border h-full">
        <CardContent className="p-4 flex gap-3">
          {/* Photo */}
          <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden ring-2 ring-border">
            {speaker.photoUrl ? (
              <img
                src={speaker.photoUrl}
                alt={speaker.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="text-base font-semibold text-foreground leading-tight">{speaker.name}</h3>

            {/* Title */}
            {speaker.title && (
              <p className="text-xs text-muted-foreground mt-0.5">{speaker.title}</p>
            )}

            {/* Bio preview + trigger */}
            {hasBio && (
              <div className="mt-2">
                <p className="text-sm text-foreground/80 line-clamp-2 whitespace-pre-line">
                  {speaker.bio}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setOpen(true)}
                >
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  Czytaj więcej
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden ring-2 ring-border">
                {speaker.photoUrl ? (
                  <img
                    src={speaker.photoUrl}
                    alt={speaker.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Users className="w-9 h-9 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="text-left min-w-0">
                <DialogTitle className="text-lg leading-tight">{speaker.name}</DialogTitle>
                {speaker.title && (
                  <DialogDescription className="mt-1">{speaker.title}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          {hasBio && (
            <div className="mt-2 max-h-[70vh] overflow-y-auto pr-1">
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {speaker.bio}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export const PaidEventSpeakers: React.FC<PaidEventSpeakersProps> = ({
  speakers,
  sectionTitle = 'Prelegenci',
  backgroundColor,
  textColor,
}) => {
  if (!speakers || speakers.length === 0) return null;

  const sortedSpeakers = [...speakers].sort((a, b) => (a.position || 0) - (b.position || 0));

  // Only apply custom background/text styling if explicitly provided.
  const hasCustomStyle = !!backgroundColor || !!textColor;
  const sectionStyle: React.CSSProperties | undefined = hasCustomStyle
    ? {
        backgroundColor: backgroundColor || undefined,
        color: textColor || undefined,
      }
    : undefined;

  return (
    <section
      id="speakers"
      className={cn(
        'py-6 md:py-8 scroll-mt-16',
        hasCustomStyle && '-mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 rounded-lg'
      )}
      style={sectionStyle}
    >
      <div className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-bold">{sectionTitle}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSpeakers.map((speaker) => (
            <SpeakerCard key={speaker.id} speaker={speaker} />
          ))}
        </div>
      </div>
    </section>
  );
};
