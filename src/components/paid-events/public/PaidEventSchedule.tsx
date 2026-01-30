import React from 'react';
import { Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ScheduleItem {
  id: string;
  time?: string | null;
  title: string;
  description?: string | null;
  speakerName?: string | null;
  duration?: string | null;
}

interface PaidEventScheduleProps {
  items: ScheduleItem[];
  sectionTitle?: string;
  eventDate?: string;
}

export const PaidEventSchedule: React.FC<PaidEventScheduleProps> = ({
  items,
  sectionTitle = 'Program szkolenia',
  eventDate,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section id="schedule" className="py-8 md:py-12 scroll-mt-16">
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{sectionTitle}</h2>
        </div>

        {/* Schedule Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              {/* Time Column */}
              <div className="flex-shrink-0 w-24 text-center">
                {item.time && (
                  <div className="flex items-center justify-center gap-1 text-primary font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>{item.time}</span>
                  </div>
                )}
                {item.duration && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.duration}
                  </div>
                )}
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                )}
                {item.speakerName && (
                  <p className="text-sm text-primary mt-2">
                    Prowadzący: {item.speakerName}
                  </p>
                )}
              </div>

              {/* Step Number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
