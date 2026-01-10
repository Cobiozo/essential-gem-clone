import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, ArrowRight, Clock, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompassContact {
  id: string;
  name: string;
  current_context?: string;
  last_contact_days?: number;
  suggested_next_contact?: string;
}

export const AiCompassWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CompassContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const fetchCompassData = async () => {
      if (!user) return;

      try {
        // Check if AI Compass is enabled
        const { data: settings } = await supabase
          .from('ai_compass_settings')
          .select('is_enabled')
          .single();

        if (!settings?.is_enabled) {
          setIsEnabled(false);
          setLoading(false);
          return;
        }

        setIsEnabled(true);

        // Fetch priority contacts (those needing follow-up soon)
        const { data, error } = await supabase
          .from('ai_compass_contacts')
          .select('id, name, current_context, last_contact_days, suggested_next_contact')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .is('final_status', null)
          .order('last_contact_days', { ascending: false, nullsFirst: false })
          .limit(4);

        if (error) throw error;
        setContacts(data || []);
      } catch (error) {
        console.error('Error fetching compass data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompassData();
  }, [user]);

  if (!isEnabled) {
    return null;
  }

  if (loading) {
    return (
      <Card className="dashboard-widget h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Kompas AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Kompas AI
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/moje-konto?tab=compass')}
          className="text-primary hover:text-primary/80"
        >
          Otwórz
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Compass className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm mb-3">Brak kontaktów do obsłużenia</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/moje-konto?tab=compass')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Rozpocznij sesję
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Kontakty wymagające uwagi:
            </p>
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 hover:bg-purple-500/10 transition-colors cursor-pointer"
                onClick={() => navigate('/moje-konto?tab=compass')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.current_context && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {contact.current_context}
                        </p>
                      )}
                    </div>
                  </div>
                  {contact.last_contact_days !== null && contact.last_contact_days !== undefined && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0 text-xs",
                        contact.last_contact_days > 14 
                          ? "bg-red-500/10 text-red-600 border-red-500/20" 
                          : contact.last_contact_days > 7 
                            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            : "bg-green-500/10 text-green-600 border-green-500/20"
                      )}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {contact.last_contact_days}d
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};
