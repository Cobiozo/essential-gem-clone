import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const TeamContactsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isPartner, isSpecjalista } = useAuth();
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<TeamMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!profile?.eq_id || (!isPartner && !isSpecjalista)) {
        setLoading(false);
        return;
      }

      try {
        // Get total count
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('upline_eq_id', profile.eq_id);

        setTotalCount(count || 0);

        // Get latest 3 contacts
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('upline_eq_id', profile.eq_id)
          .order('created_at', { ascending: false })
          .limit(3);

        setContacts(data || []);
      } catch (error) {
        console.error('Error fetching team contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [profile?.eq_id, isPartner, isSpecjalista]);

  if (!isPartner && !isSpecjalista) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t('dashboard.teamContacts')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/my-account?tab=team-contacts')} className="text-xs">
          {t('dashboard.manage')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">{t('dashboard.totalContacts')}</span>
          <span className="text-2xl font-bold text-foreground">{loading ? '...' : totalCount}</span>
        </div>

        {/* Recent contacts */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-10 bg-muted rounded" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-4">
            <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noTeamMembers')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('dashboard.recentlyAdded')}</p>
            {contacts.map((contact) => {
              const initials = `${contact.first_name?.charAt(0) || ''}${contact.last_name?.charAt(0) || ''}`.toUpperCase() || '?';
              const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
              
              return (
                <div key={contact.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground truncate">{fullName}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
