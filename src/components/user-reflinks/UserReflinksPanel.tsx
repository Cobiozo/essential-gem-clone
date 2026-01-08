import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Plus, Copy, Check, RefreshCw, MousePointer, UserPlus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ReflinkStatusBadge } from './ReflinkStatusBadge';
import { UserReflink, ReflinkGenerationSettings, getRoleLabel, getReflinkStatus } from './types';

export const UserReflinksPanel: React.FC = () => {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  
  const [reflinks, setReflinks] = useState<UserReflink[]>([]);
  const [settings, setSettings] = useState<ReflinkGenerationSettings | null>(null);
  const [globalValidityDays, setGlobalValidityDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTargetRole, setNewTargetRole] = useState<string>('client');
  
  // Regenerate dialog
  const [regeneratingLink, setRegeneratingLink] = useState<UserReflink | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !userRole) return;
    
    setLoading(true);
    try {
      // Fetch user's reflinks
      const { data: userReflinks } = await supabase
        .from('user_reflinks')
        .select('*')
        .eq('creator_user_id', user.id)
        .order('created_at', { ascending: false });
      
      setReflinks((userReflinks as unknown as UserReflink[]) || []);
      
      // Fetch generation settings for user's role
      const roleStr = userRole.role;
      const { data: genSettings } = await supabase
        .from('reflink_generation_settings')
        .select('*')
        .eq('role', roleStr as 'admin' | 'partner' | 'specjalista' | 'client' | 'user')
        .single();
      
      setSettings(genSettings as unknown as ReflinkGenerationSettings);
      
      // Fetch global validity days
      const { data: globalSettings } = await supabase
        .from('reflink_global_settings')
        .select('setting_value')
        .eq('setting_key', 'link_validity_days')
        .single();
      
      if (globalSettings) {
        setGlobalValidityDays(parseInt(globalSettings.setting_value) || 30);
      }
    } catch (error) {
      console.error('Error fetching reflinks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateReflink = async () => {
    if (!user || !profile || !settings) return;
    
    setCreating(true);
    try {
      // Generate unique code using RPC
      const { data: newCode, error: codeError } = await supabase.rpc('generate_user_reflink_code', {
        p_eq_id: profile.eq_id || 'anon'
      });
      
      if (codeError) throw codeError;
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + globalValidityDays);
      
      // Insert new reflink
      const { error: insertError } = await supabase
        .from('user_reflinks')
        .insert([{
          creator_user_id: user.id,
          target_role: newTargetRole as 'admin' | 'partner' | 'specjalista' | 'client' | 'user',
          reflink_code: newCode,
          expires_at: expiresAt.toISOString(),
        }]);
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Sukces',
        description: 'Link polecający został utworzony',
      });
      
      setShowCreateDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating reflink:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się utworzyć linku',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerateReflink = async () => {
    if (!regeneratingLink || !profile) return;
    
    setCreating(true);
    try {
      // Deactivate old link
      await supabase
        .from('user_reflinks')
        .update({ is_active: false })
        .eq('id', regeneratingLink.id);
      
      // Generate new code
      const { data: newCode, error: codeError } = await supabase.rpc('generate_user_reflink_code', {
        p_eq_id: profile.eq_id || 'anon'
      });
      
      if (codeError) throw codeError;
      
      // Calculate new expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + globalValidityDays);
      
      // Create new link
      const { error: insertError } = await supabase
        .from('user_reflinks')
        .insert([{
          creator_user_id: user!.id,
          target_role: regeneratingLink.target_role as 'admin' | 'partner' | 'specjalista' | 'client' | 'user',
          reflink_code: newCode,
          expires_at: expiresAt.toISOString(),
        }]);
      
      if (insertError) throw insertError;
      
      toast({
        title: 'Sukces',
        description: 'Nowy link został wygenerowany',
      });
      
      setRegeneratingLink(null);
      fetchData();
    } catch (error: any) {
      console.error('Error regenerating reflink:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wygenerować nowego linku',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (reflink: UserReflink) => {
    try {
      await supabase
        .from('user_reflinks')
        .update({ is_active: !reflink.is_active })
        .eq('id', reflink.id);
      
      fetchData();
    } catch (error) {
      console.error('Error toggling reflink:', error);
    }
  };

  const handleCopy = async (reflink: UserReflink) => {
    const fullUrl = `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedId(reflink.id);
    toast({
      title: 'Skopiowano!',
      description: fullUrl,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!settings?.can_generate) {
    return null; // Don't show panel if user can't generate
  }

  const activeReflinks = reflinks.filter(r => r.is_active);
  const canCreateMore = activeReflinks.length < settings.max_links_per_user;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Moje linki polecające
            </CardTitle>
            <CardDescription>
              Twórz i zarządzaj własnymi linkami polecającymi
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowCreateDialog(true)}
            disabled={!canCreateMore}
          >
            <Plus className="w-4 h-4 mr-2" />
            Utwórz link
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!canCreateMore && (
          <Alert className="mb-4">
            <Info className="w-4 h-4" />
            <AlertDescription>
              Osiągnięto limit {settings.max_links_per_user} aktywnych linków.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
        ) : reflinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nie masz jeszcze żadnych linków polecających.
          </div>
        ) : (
          <div className="space-y-3">
            {reflinks.map((reflink) => {
              const status = getReflinkStatus(reflink.expires_at);
              const isExpired = status === 'expired';
              
              return (
                <div
                  key={reflink.id}
                  className={`p-4 rounded-lg border ${
                    reflink.is_active && !isExpired
                      ? 'border-border bg-card'
                      : 'border-muted bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline">
                          {getRoleLabel(reflink.target_role)}
                        </Badge>
                        <ReflinkStatusBadge expiresAt={reflink.expires_at} />
                      </div>
                      <p className="font-mono text-sm truncate text-muted-foreground">
                        {reflink.reflink_code}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          {reflink.click_count} kliknięć
                        </span>
                        <span className="flex items-center gap-1">
                          <UserPlus className="w-3 h-3" />
                          {reflink.registration_count} rejestracji
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpired ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRegeneratingLink(reflink)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Wygeneruj nowy
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(reflink)}
                            disabled={!reflink.is_active}
                          >
                            {copiedId === reflink.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Switch
                            checked={reflink.is_active}
                            onCheckedChange={() => handleToggleActive(reflink)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utwórz nowy link polecający</DialogTitle>
            <DialogDescription>
              Link będzie ważny przez {globalValidityDays} dni.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rola dla nowych użytkowników
              </label>
              <Select value={newTargetRole} onValueChange={setNewTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings?.allowed_target_roles?.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleCreateReflink} disabled={creating}>
              {creating ? 'Tworzenie...' : 'Utwórz link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={!!regeneratingLink} onOpenChange={() => setRegeneratingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wygeneruj nowy link</DialogTitle>
            <DialogDescription>
              Stary link zostanie dezaktywowany. Nowy link będzie ważny przez {globalValidityDays} dni.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegeneratingLink(null)}>
              Anuluj
            </Button>
            <Button onClick={handleRegenerateReflink} disabled={creating}>
              {creating ? 'Generowanie...' : 'Wygeneruj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
