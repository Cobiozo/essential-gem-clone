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
import { cn } from '@/lib/utils';

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
  compact?: boolean;
}

export const MeetingTypeCard: React.FC<MeetingTypeCardProps> = ({
  type,
  settings,
  onSettingsChange,
  icon,
  title,
  colorClass = 'text-primary',
  compact = false,
}) => {
  const updateField = <K extends keyof MeetingTypeSettings>(
    field: K,
    value: MeetingTypeSettings[K]
  ) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <Card className={cn("border-2", compact && "border")}>
      <CardHeader className={cn("pb-3", compact && "pb-2 px-3 pt-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            compact ? "text-sm" : "text-base"
          )}>
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
        <CardContent className={cn("space-y-4", compact && "space-y-3 px-3 pb-3")}>
          {/* Duration - inline in compact mode */}
          <div className={cn("flex items-center gap-2", compact && "gap-1.5")}>
            <Clock className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <Label className={cn(compact ? "text-xs" : "text-sm")}>Czas trwania</Label>
            <Select
              value={settings.slot_duration.toString()}
              onValueChange={(value) => updateField('slot_duration', parseInt(value))}
            >
              <SelectTrigger className={cn(compact ? "h-7 w-24 text-xs" : "h-9 w-40")}>
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

          {/* Title & Image */}
          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 gap-4")}>
            <div className="space-y-1">
              <Label className={cn(compact ? "text-xs" : "text-sm")}>Tytuł</Label>
              <Input
                value={settings.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Nazwa spotkania"
                className={cn(compact ? "h-7 text-sm" : "h-9")}
              />
            </div>
            <div className="space-y-1">
              <Label className={cn(compact ? "text-xs" : "text-sm")}>Obrazek</Label>
              <MediaUpload
                onMediaUploaded={(url) => updateField('image_url', url)}
                currentMediaUrl={settings.image_url}
                currentMediaType="image"
                allowedTypes={['image']}
                compact
              />
            </div>
          </div>

          {/* Description - hidden in compact mode */}
          {!compact && (
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
          )}

          {/* Schedule Tabs */}
          <Tabs defaultValue="weekly" className={cn("space-y-3", compact && "space-y-2")}>
            <TabsList className={cn("grid w-full grid-cols-2", compact && "h-8")}>
              <TabsTrigger 
                value="weekly" 
                className={cn("flex items-center gap-1.5", compact ? "text-xs py-1" : "text-xs gap-2")}
              >
                <Clock className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                Godziny
              </TabsTrigger>
              <TabsTrigger 
                value="exceptions" 
                className={cn("flex items-center gap-1.5", compact ? "text-xs py-1" : "text-xs gap-2")}
              >
                <CalendarOff className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                Wyjątki
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly">
              <WorkingHoursScheduler
                initialSchedule={settings.weeklySchedule}
                onScheduleChange={(schedule) => updateField('weeklySchedule', schedule)}
                slotDuration={settings.slot_duration}
                compact={compact}
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
