import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, ArrowRight, MousePointerClick } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

export const ReflinksWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const [totalClicks, setTotalClicks] = useState(0);
  const [activeLinks, setActiveLinks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canGenerate, setCanGenerate] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !userRole?.role) {
        setLoading(false);
        return;
      }

      try {
        // Check if user can generate reflinks
        const { data: settings } = await supabase
          .from('reflink_generation_settings')
          .select('can_generate')
          .eq('role', userRole.role as any)
          .maybeSingle();

        setCanGenerate(settings?.can_generate || false);

        if (!settings?.can_generate) {
          setLoading(false);
          return;
        }

        // Fetch user's reflinks using raw query to avoid type issues
        const { data: reflinks, error } = await supabase
          .from('user_reflinks' as any)
          .select('id, is_active, click_count')
          .eq('user_id', user.id) as { data: Array<{ id: string; is_active: boolean; click_count: number }> | null; error: any };

        if (!error && reflinks) {
          const activeCount = reflinks.filter(r => r.is_active).length;
          const clicks = reflinks.reduce((sum, r) => sum + (r.click_count || 0), 0);
          setActiveLinks(activeCount);
          setTotalClicks(clicks);
        }
      } catch (error) {
        console.error('Error fetching reflink stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, userRole]);

  if (!canGenerate) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          {t('dashboard.reflinks')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/my-account?tab=reflinks')} className="text-xs">
          {t('dashboard.manage')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse h-16 bg-muted rounded" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <MousePointerClick className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-foreground">{totalClicks}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalClicks')}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <Link2 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold text-foreground">{activeLinks}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.activeLinks')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
