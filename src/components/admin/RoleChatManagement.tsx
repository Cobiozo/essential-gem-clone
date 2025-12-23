import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Users, ArrowRight } from 'lucide-react';
import type { RoleChatChannel } from '@/types/roleChat';
import { ROLE_LABELS } from '@/types/roleChat';

export const RoleChatManagement = () => {
  const [channels, setChannels] = useState<RoleChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('role_chat_channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels((data || []) as RoleChatChannel[]);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Błąd pobierania kanałów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const toggleChannel = async (channelId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('role_chat_channels')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', channelId);

      if (error) throw error;

      setChannels(prev =>
        prev.map(c => c.id === channelId ? { ...c, is_active: isActive } : c)
      );
      toast.success(isActive ? 'Kanał aktywowany' : 'Kanał dezaktywowany');
    } catch (error) {
      console.error('Error toggling channel:', error);
      toast.error('Błąd aktualizacji kanału');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Zarządzanie kanałami czatu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Hierarchia komunikacji</h4>
            <p className="text-sm text-muted-foreground">
              Role wyższego poziomu mogą wysyłać wiadomości do ról niższego poziomu, ale nie odwrotnie.
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Badge variant="outline">Admin (100)</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">Partner (75)</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">Specjalista (50)</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge variant="outline">Klient (25)</Badge>
            </div>
          </div>

          <div className="divide-y">
            {channels.map(channel => (
              <div key={channel.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {ROLE_LABELS[channel.sender_role]}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {ROLE_LABELS[channel.target_role]}
                      </span>
                    </div>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground">
                        {channel.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`channel-${channel.id}`} className="text-sm text-muted-foreground">
                    {channel.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </Label>
                  <Switch
                    id={`channel-${channel.id}`}
                    checked={channel.is_active}
                    onCheckedChange={(checked) => toggleChannel(channel.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          {channels.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Brak skonfigurowanych kanałów czatu
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
