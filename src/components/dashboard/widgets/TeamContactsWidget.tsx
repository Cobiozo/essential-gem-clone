import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowRight, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamContact {
  id: string;
  first_name: string;
  last_name: string;
  role?: string;
}

export const TeamContactsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;

      try {
        let query = supabase
          .from('team_contacts')
          .select('id, first_name, last_name, role')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!isAdmin) {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setContacts((data || []) as TeamContact[]);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [user, isAdmin]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <Card className="dashboard-widget h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Mój zespół
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Mój zespół
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/moje-konto?tab=team')}
          className="text-primary hover:text-primary/80"
        >
          Zarządzaj
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm mb-3">Brak kontaktów</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/moje-konto?tab=team')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Dodaj kontakt
            </Button>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate('/moje-konto?tab=team')}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-500/10 text-blue-600 text-sm">
                  {getInitials(contact.first_name, contact.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {contact.first_name} {contact.last_name}
                </p>
                {contact.role && (
                  <p className="text-xs text-muted-foreground capitalize">{contact.role}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
