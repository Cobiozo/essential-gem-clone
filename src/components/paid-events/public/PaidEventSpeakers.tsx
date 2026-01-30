import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

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
  backgroundColor?: string | null;
  textColor?: string | null;
}

export const PaidEventSpeakers: React.FC<PaidEventSpeakersProps> = ({
  speakers,
  sectionTitle = 'Prelegenci',
  backgroundColor,
  textColor,
}) => {
  if (!speakers || speakers.length === 0) return null;

  const sortedSpeakers = [...speakers].sort((a, b) => (a.position || 0) - (b.position || 0));

  const sectionStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || 'hsl(var(--primary))',
    color: textColor || 'hsl(var(--primary-foreground))',
  };

  return (
    <section
      id="speakers"
      className="py-12 md:py-16 scroll-mt-16 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12"
      style={sectionStyle}
    >
      <div className="space-y-8">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/20">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{sectionTitle}</h2>
        </div>

        {/* Speakers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSpeakers.map((speaker) => (
            <Card key={speaker.id} className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 text-center">
                {/* Photo */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-white/30">
                  {speaker.photoUrl ? (
                    <img
                      src={speaker.photoUrl}
                      alt={speaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Users className="w-10 h-10 opacity-50" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold">{speaker.name}</h3>

                {/* Title */}
                {speaker.title && (
                  <p className="text-sm opacity-80 mt-1">{speaker.title}</p>
                )}

                {/* Bio */}
                {speaker.bio && (
                  <p className="text-sm opacity-70 mt-3 line-clamp-3">
                    {speaker.bio}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
