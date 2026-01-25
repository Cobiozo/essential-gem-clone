import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, ArrowRight, Copy, Check, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { WidgetInfoButton } from '../WidgetInfoButton';

interface UserReflink {
  id: string;
  reflink_code: string;
  target_role: string;
  is_active: boolean;
  click_count: number;
}

export const ReflinksWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [reflinks, setReflinks] = useState<UserReflink[]>([]);
  const [loading, setLoading] = useState(true);
  const [canGenerate, setCanGenerate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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

        // Fetch user's reflinks
        const { data, error } = await supabase
          .from('user_reflinks' as any)
          .select('id, reflink_code, target_role, is_active, click_count')
          .eq('creator_user_id', user.id)
          .eq('is_active', true) as { data: UserReflink[] | null; error: any };

        if (!error && data) {
          setReflinks(data);
        }
      } catch (error) {
        console.error('Error fetching reflink data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole]);

  const getReflinkUrl = (code: string) => {
    return `${window.location.origin}/ref/${code}`;
  };

  const handleCopy = async (reflink: UserReflink) => {
    const url = getReflinkUrl(reflink.reflink_code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(reflink.id);
      toast({
        title: t('dashboard.copied'),
        description: url,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'client': return t('dashboard.forClient');
      case 'partner': return t('dashboard.forPartner');
      case 'specjalista': return t('dashboard.forSpecialist');
      default: return role;
    }
  };

  if (!canGenerate) {
    return null;
  }

  return (
    <Card className="shadow-sm relative" data-tour="reflinks-widget">
      <WidgetInfoButton description="Twoje linki polecające - kopiuj i śledź statystyki kliknięć" />
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          {t('dashboard.pureLinki')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/my-account?tab=reflinks')} className="text-xs">
          {t('dashboard.manage')}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        ) : reflinks.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">{t('dashboard.noLinks')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/my-account?tab=reflinks')}
            >
              {t('dashboard.generateInAccount')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {reflinks.map((reflink) => (
              <div
                key={reflink.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium text-foreground">
                    {getRoleLabel(reflink.target_role)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {reflink.click_count} {t('dashboard.totalClicks').toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopy(reflink)}
                    title={t('dashboard.copyLink')}
                  >
                    {copiedId === reflink.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs">
                      <DialogHeader>
                        <DialogTitle className="text-center">
                          {getRoleLabel(reflink.target_role)}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCodeSVG 
                            value={getReflinkUrl(reflink.reflink_code)} 
                            size={180}
                            level="H"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center break-all">
                          {getReflinkUrl(reflink.reflink_code)}
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReflinksWidget;
