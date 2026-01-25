import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CalendarOff } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { WorkingHoursScheduler, WeeklySchedule } from './WorkingHoursScheduler';
import { DateExceptionsManager, DateException } from './DateExceptionsManager';

const SLOT_DURATIONS = [
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 45, label: '45 minut' },
  { value: 60, label: '60 minut' },
  { value: 90, label: '90 minut' },
];

export interface MeetingTypeSettings {
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  slot_duration: number;
  weeklySchedule: WeeklySchedule;
  dateExceptions: DateException[];
}

interface MeetingTypeCardProps {
  type: 'tripartite' | 'consultation';
  settings: MeetingTypeSettings;
  onSettingsChange: (settings: MeetingTypeSettings) => void;
  icon: React.ReactNode;
  title: string;
  colorClass?: string;
}

export const MeetingTypeCard: React.FC<MeetingTypeCardProps> = ({
  type,
  settings,
  onSettingsChange,
  icon,
  title,
  colorClass = 'text-primary',
}) => {
  const updateField = <K extends keyof MeetingTypeSettings>(
    field: K,
    value: MeetingTypeSettings[K]
  ) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={colorClass}>{icon}</span>
            {title}
          </CardTitle>
          <Switch
            checked={settings.is_active}
            onCheckedChange={(checked) => updateField('is_active', checked)}
          />
        </div>
      </CardHeader>

      {settings.is_active && (
        <CardContent className="space-y-4">
          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Czas trwania
            </Label>
            <Select
              value={settings.slot_duration.toString()}
              onValueChange={(value) => updateField('slot_duration', parseInt(value))}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Tytuł</Label>
              <Input
                value={settings.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Nazwa spotkania"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Obrazek</Label>
              <MediaUpload
                onMediaUploaded={(url) => updateField('image_url', url)}
                currentMediaUrl={settings.image_url}
                currentMediaType="image"
                allowedTypes={['image']}
                compact
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Opis</Label>
            <Textarea
              value={settings.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Opisz, czego dotyczy spotkanie..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Schedule Tabs */}
          <Tabs defaultValue="weekly" className="space-y-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly" className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Godziny tygodniowe
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="flex items-center gap-2 text-xs">
                <CalendarOff className="h-3.5 w-3.5" />
                Wyjątki dat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly">
              <WorkingHoursScheduler
                initialSchedule={settings.weeklySchedule}
                onScheduleChange={(schedule) => updateField('weeklySchedule', schedule)}
                slotDuration={settings.slot_duration}
              />
            </TabsContent>

            <TabsContent value="exceptions">
              <DateExceptionsManager
                exceptions={settings.dateExceptions}
                onExceptionsChange={(exceptions) => updateField('dateExceptions', exceptions)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default MeetingTypeCard;
