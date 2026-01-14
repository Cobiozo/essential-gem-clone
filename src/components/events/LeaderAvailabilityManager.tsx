import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save, Loader2 } from 'lucide-react';
import type { LeaderAvailability } from '@/types/events';

const DAYS_OF_WEEK = [
  { value: 0, labelKey: 'events.sunday' },
  { value: 1, labelKey: 'events.monday' },
  { value: 2, labelKey: 'events.tuesday' },
  { value: 3, labelKey: 'events.wednesday' },
  { value: 4, labelKey: 'events.thursday' },
  { value: 5, labelKey: 'events.friday' },
  { value: 6, labelKey: 'events.saturday' },
];

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
  id?: string;
}

export const LeaderAvailabilityManager: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day.value,
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user]);

  const loadAvailability = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('leader_availability')
      .select('*')
      .eq('leader_user_id', user.id);

    if (error) {
      console.error('Error loading availability:', error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setAvailability(
        DAYS_OF_WEEK.map((day) => {
          const existing = data.find((d) => d.day_of_week === day.value);
          return {
            dayOfWeek: day.value,
            isAvailable: existing?.is_active ?? false,
            startTime: existing?.start_time ?? '09:00',
            endTime: existing?.end_time ?? '17:00',
            id: existing?.id,
          };
        })
      );
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Get user's timezone automatically
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[LeaderAvailabilityManager] Saving with timezone:', userTimezone);

      // Delete existing and insert new
      await supabase
        .from('leader_availability')
        .delete()
        .eq('leader_user_id', user.id);

      const insertData = availability.map((day) => ({
        leader_user_id: user.id,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        is_active: day.isAvailable,
        timezone: userTimezone, // NEW: Save user's timezone
      }));

      const { error } = await supabase
        .from('leader_availability')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: t('toast.success'),
        description: t('events.availabilitySaved'),
      });

      loadAvailability();
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, updates: Partial<DayAvailability>) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...updates } : day
      )
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('events.myAvailability')}
        </CardTitle>
        <CardDescription>{t('events.availabilityDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const dayData = availability.find((a) => a.dayOfWeek === day.value)!;
          return (
            <div
              key={day.value}
              className="flex items-center gap-4 p-3 rounded-lg border"
            >
              <div className="w-32">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dayData.isAvailable}
                    onCheckedChange={(checked) =>
                      updateDay(day.value, { isAvailable: checked })
                    }
                  />
                  <Label className="font-medium">{t(day.labelKey)}</Label>
                </div>
              </div>
              
              {dayData.isAvailable && (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">{t('events.from')}</Label>
                    <Input
                      type="time"
                      value={dayData.startTime}
                      onChange={(e) =>
                        updateDay(day.value, { startTime: e.target.value })
                      }
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">{t('events.to')}</Label>
                    <Input
                      type="time"
                      value={dayData.endTime}
                      onChange={(e) =>
                        updateDay(day.value, { endTime: e.target.value })
                      }
                      className="w-28"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderAvailabilityManager;
