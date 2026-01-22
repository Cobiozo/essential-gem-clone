import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, ArrowRight, UserPlus, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  eq_id: string | null;
  phone_number: string | null;
}

export const TeamContactsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isPartner, isSpecjalista } = useAuth();
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<TeamMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<TeamMember | null>(null);

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
          .select('id, first_name, last_name, email, role, eq_id, phone_number')
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

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { labelKey: string; variant: 'default' | 'secondary' | 'outline' }> = {
      client: { labelKey: 'role.client', variant: 'secondary' },
      partner: { labelKey: 'role.partner', variant: 'outline' },
      specjalista: { labelKey: 'role.specialist', variant: 'default' },
    };
    const config = roleConfig[role] || { labelKey: role, variant: 'secondary' as const };
    return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{t(config.labelKey)}</Badge>;
  };

  const getInitials = (contact: TeamMember) => {
    return `${contact.first_name?.charAt(0) || ''}${contact.last_name?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  const getFullName = (contact: TeamMember) => {
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t('dashboard.team')}
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
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedContact(contact)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{getFullName(contact)}</span>
                      {getRoleBadge(contact.role)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      EQID: <span className="font-mono">{contact.eq_id || '-'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedContact && getInitials(selectedContact)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="block">{selectedContact && getFullName(selectedContact)}</span>
                <div className="mt-1">{selectedContact && getRoleBadge(selectedContact.role)}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground min-w-[60px]">EQID:</span>
              <span className="font-mono font-medium text-foreground">{selectedContact?.eq_id || '-'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${selectedContact?.email}`} 
                className="text-primary hover:underline"
              >
                {selectedContact?.email}
              </a>
            </div>
            {selectedContact?.phone_number && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={`tel:${selectedContact?.phone_number}`} 
                  className="text-primary hover:underline"
                >
                  {selectedContact?.phone_number}
                </a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedContact(null)}
            >
              {t('common.close')}
            </Button>
            <Button onClick={() => {
              setSelectedContact(null);
              navigate('/my-account?tab=team-contacts');
            }}>
              {t('dashboard.viewAllContacts')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamContactsWidget;
