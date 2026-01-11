import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Youtube,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Users2
} from 'lucide-react';

interface SocialLink {
  id: string;
  title: string;
  description: string | null;
  link_url: string | null;
  clipboard_content: string | null;
  link_type: string;
}

const platformConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  whatsapp: { icon: MessageCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  facebook: { icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  instagram: { icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  twitter: { icon: Twitter, color: 'text-sky-500', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  linkedin: { icon: Linkedin, color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  youtube: { icon: Youtube, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  default: { icon: Link2, color: 'text-primary', bgColor: 'bg-primary/10' },
};

const detectPlatform = (title: string, url: string | null): string => {
  const text = `${title} ${url || ''}`.toLowerCase();
  if (text.includes('whatsapp') || text.includes('wa.me')) return 'whatsapp';
  if (text.includes('facebook') || text.includes('fb.com')) return 'facebook';
  if (text.includes('instagram')) return 'instagram';
  if (text.includes('twitter') || text.includes('x.com')) return 'twitter';
  if (text.includes('linkedin')) return 'linkedin';
  if (text.includes('youtube') || text.includes('youtu.be')) return 'youtube';
  return 'default';
};

export const SocialMediaWidget: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const role = userRole?.role || 'client';
        
        // Build visibility filter based on role
        let visibilityFilter = 'visible_to_client.eq.true';
        if (role === 'partner') visibilityFilter = 'visible_to_partner.eq.true';
        if (role === 'specjalista') visibilityFilter = 'visible_to_specjalista.eq.true';
        if (role === 'admin') visibilityFilter = 'visible_to_admin.eq.true';

        const { data, error } = await supabase
          .from('reflinks')
          .select('id, title, description, link_url, clipboard_content, link_type')
          .eq('is_active', true)
          .or(visibilityFilter)
          .or(`title.ilike.%whatsapp%,title.ilike.%facebook%,title.ilike.%instagram%,title.ilike.%social%,title.ilike.%grupa%,title.ilike.%community%,link_url.ilike.%wa.me%,link_url.ilike.%facebook.com%`)
          .order('position', { ascending: true });

        if (error) throw error;
        setSocialLinks(data || []);
      } catch (error) {
        console.error('Error fetching social links:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialLinks();
  }, [user, userRole]);

  const handleClick = async (link: SocialLink) => {
    if (link.link_type === 'clipboard' && link.clipboard_content) {
      try {
        await navigator.clipboard.writeText(link.clipboard_content);
        setCopiedId(link.id);
        toast({
          title: t('common.copied') || 'Skopiowano!',
          description: link.title,
        });
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        toast({
          title: t('common.error') || 'Błąd',
          description: t('common.copyFailed') || 'Nie udało się skopiować',
          variant: 'destructive',
        });
      }
    } else if (link.link_url) {
      window.open(link.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Don't render if no links
  if (!loading && socialLinks.length === 0) {
    return null;
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users2 className="h-5 w-5 text-primary" />
          {t('dashboard.socialMedia') || 'Społeczność'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {socialLinks.slice(0, 6).map((link) => {
              const platform = detectPlatform(link.title, link.link_url);
              const config = platformConfig[platform] || platformConfig.default;
              const Icon = config.icon;
              const isCopied = copiedId === link.id;

              return (
                <Button
                  key={link.id}
                  variant="ghost"
                  className={`h-auto flex-col gap-2 p-3 ${config.bgColor} hover:opacity-80 transition-all`}
                  onClick={() => handleClick(link)}
                  title={link.description || link.title}
                >
                  <div className="relative">
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    {link.link_type === 'clipboard' && (
                      <div className="absolute -bottom-1 -right-1">
                        {isCopied ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    {link.link_type !== 'clipboard' && (
                      <ExternalLink className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-2 leading-tight">
                    {link.title.replace(/whatsapp|facebook|instagram|social/gi, '').trim() || link.title}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
