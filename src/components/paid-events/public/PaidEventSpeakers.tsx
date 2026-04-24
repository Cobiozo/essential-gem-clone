import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  const hasBio = !!speaker.bio && speaker.bio.trim().length > 0;

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardContent className="p-6 flex flex-col items-center text-center flex-1">
        {/* Photo */}
        <div className="w-24 h-24 mb-4 rounded-full overflow-hidden ring-2 ring-border">
          {speaker.photoUrl ? (
            <img
              src={speaker.photoUrl}
              alt={speaker.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-foreground">{speaker.name}</h3>

        {/* Title */}
        {speaker.title && (
          <p className="text-sm text-muted-foreground mt-1">{speaker.title}</p>
        )}

        {/* Bio (collapsible) */}
        {hasBio && (
          <div className="w-full mt-4">
            <p
              className={cn(
                'text-sm text-foreground/80 whitespace-pre-line text-left',
                !expanded && 'line-clamp-3'
              )}
            >
              {speaker.bio}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Zwiń
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Czytaj więcej
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
        'py-8 md:py-12 scroll-mt-16',
        hasCustomStyle && '-mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 rounded-lg'
      )}
      style={sectionStyle}
    >
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold">{sectionTitle}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedSpeakers.map((speaker) => (
            <SpeakerCard key={speaker.id} speaker={speaker} />
          ))}
        </div>
      </div>
    </section>
  );
};
