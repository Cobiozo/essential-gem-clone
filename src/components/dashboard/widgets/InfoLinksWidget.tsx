import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, Copy, Check, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InfoLink {
  id: string;
  title: string;
  description: string | null;
  clipboard_content: string | null;
  link_url: string | null;
  is_active: boolean;
  link_type: string;
  requires_otp: boolean | null;
  slug: string | null;
  otp_validity_hours: number | null;
}

export const InfoLinksWidget: React.FC = () => {
  const { userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [links, setLinks] = useState<InfoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinks = async () => {
      if (!userRole?.role) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('reflinks')
          .select('id, title, description, clipboard_content, link_url, is_active, link_type, requires_otp, slug, otp_validity_hours')
          .eq('is_active', true)
          .contains('visible_to_roles', [userRole.role])
          .order('position', { ascending: true });

        if (!error && data) {
          setLinks(data);
        }
      } catch (error) {
        console.error('Error fetching info links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [userRole]);

  const handleCopy = async (link: InfoLink) => {
    // If this is an InfoLink with OTP, generate OTP first
    if (link.link_type === 'infolink' && link.requires_otp) {
      setGeneratingOtp(link.id);
      try {
        const { data, error } = await supabase.functions.invoke('generate-infolink-otp', {
          body: { reflink_id: link.id },
        });

        if (error || !data?.success) {
          console.error('OTP generation error:', error || data?.error);
          toast({
            title: 'Błąd',
            description: data?.error || 'Nie udało się wygenerować kodu',
            variant: 'destructive',
          });
          return;
        }

        // Copy the formatted message with OTP
        await navigator.clipboard.writeText(data.clipboard_message);
        setCopiedId(link.id);
        toast({
          title: 'Skopiowano!',
          description: `Kod OTP: ${data.otp_code} (ważny ${data.validity_hours}h)`,
        });
        
        // Emit custom event for immediate ActiveOtpCodesWidget update
        window.dispatchEvent(new CustomEvent('otpCodeGenerated', { 
          detail: { code: data.otp_code, reflinkId: link.id } 
        }));
        
        setTimeout(() => setCopiedId(null), 3000);
      } catch (error) {
        console.error('Failed to generate OTP:', error);
        toast({
          title: 'Błąd',
          description: 'Wystąpił błąd podczas generowania kodu',
          variant: 'destructive',
        });
      } finally {
        setGeneratingOtp(null);
      }
      return;
    }

    // Standard copy behavior for other link types
    const textToCopy = link.clipboard_content || link.link_url || '';
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(link.id);
      toast({
        title: t('dashboard.copied'),
        description: link.title,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm" data-tour="infolinks-widget">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            {t('dashboard.infoLinks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm" data-tour="infolinks-widget">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          {t('dashboard.infoLinks')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {link.title}
                </p>
                {link.link_type === 'infolink' && link.requires_otp && (
                  <Shield className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>
              {link.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {link.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleCopy(link)}
              disabled={generatingOtp === link.id}
              title={link.link_type === 'infolink' && link.requires_otp ? 'Generuj kod OTP i kopiuj' : t('dashboard.copyLink')}
            >
              {generatingOtp === link.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : copiedId === link.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default InfoLinksWidget;
