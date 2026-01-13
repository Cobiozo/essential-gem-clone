import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, UserRound, Loader2 } from 'lucide-react';

interface PartnerWithPermissions {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  individual_meetings_enabled: boolean;
  tripartite_meeting_enabled: boolean;
  partner_consultation_enabled: boolean;
  permission_id?: string;
}

export const IndividualMeetingsManagement: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [partners, setPartners] = useState<PartnerWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      // Fetch all partners
      const { data: partnerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch user roles to filter only partners
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'partner');

      if (rolesError) throw rolesError;

      const partnerUserIds = new Set(roles?.map(r => r.user_id) || []);

      // Fetch leader permissions
      const { data: permissions, error: permError } = await supabase
        .from('leader_permissions')
        .select('id, user_id, individual_meetings_enabled, tripartite_meeting_enabled, partner_consultation_enabled');

      if (permError) throw permError;

      const permMap = new Map(permissions?.map(p => [p.user_id, p]) || []);

      // Combine data
      const partnersWithPermissions: PartnerWithPermissions[] = (partnerProfiles || [])
        .filter(p => partnerUserIds.has(p.user_id))
        .map(profile => {
          const perm = permMap.get(profile.user_id);
          return {
            user_id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            individual_meetings_enabled: perm?.individual_meetings_enabled || false,
            tripartite_meeting_enabled: perm?.tripartite_meeting_enabled || false,
            partner_consultation_enabled: perm?.partner_consultation_enabled || false,
            permission_id: perm?.id,
          };
        });

      setPartners(partnersWithPermissions);
    } catch (error: any) {
      console.error('Error loading partners:', error);
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (
    partner: PartnerWithPermissions,
    field: 'tripartite_meeting_enabled' | 'partner_consultation_enabled',
    value: boolean
  ) => {
    setSaving(partner.user_id);
    try {
      // Check if permission record exists
      if (partner.permission_id) {
        // Update existing
        const updateData: any = { [field]: value };
        // Also enable individual_meetings_enabled if enabling any sub-permission
        if (value) {
          updateData.individual_meetings_enabled = true;
        } else {
          // If disabling, check if other permission is also disabled
          const otherField = field === 'tripartite_meeting_enabled' 
            ? 'partner_consultation_enabled' 
            : 'tripartite_meeting_enabled';
          const otherValue = partner[otherField];
          if (!otherValue) {
            updateData.individual_meetings_enabled = false;
          }
        }
        
        const { error } = await supabase
          .from('leader_permissions')
          .update(updateData)
          .eq('id', partner.permission_id);

        if (error) throw error;
      } else {
        // Insert new permission record
        const { error } = await supabase
          .from('leader_permissions')
          .insert({
            user_id: partner.user_id,
            can_host_private_meetings: true,
            individual_meetings_enabled: true,
            [field]: value,
          });

        if (error) throw error;
      }

      toast({ 
        title: t('toast.success'), 
        description: value 
          ? 'Uprawnienie zostało włączone' 
          : 'Uprawnienie zostało wyłączone' 
      });
      loadPartners();
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const filteredPartners = partners.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(query) ||
      p.last_name?.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query)
    );
  });

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            Zarządzanie spotkaniami indywidualnymi
          </CardTitle>
          <CardDescription>
            Włącz lub wyłącz możliwość prowadzenia spotkań indywidualnych dla partnerów
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj partnera..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Spotkanie trójstronne</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <UserRound className="h-4 w-4" />
                    <span>Konsultacje dla partnerów</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.user_id}>
                  <TableCell className="font-medium">
                    {partner.first_name} {partner.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.email}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={partner.tripartite_meeting_enabled}
                      onCheckedChange={(checked) => 
                        togglePermission(partner, 'tripartite_meeting_enabled', checked)
                      }
                      disabled={saving === partner.user_id}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={partner.partner_consultation_enabled}
                      onCheckedChange={(checked) => 
                        togglePermission(partner, 'partner_consultation_enabled', checked)
                      }
                      disabled={saving === partner.user_id}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredPartners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'Nie znaleziono partnerów' : 'Brak partnerów w systemie'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndividualMeetingsManagement;
