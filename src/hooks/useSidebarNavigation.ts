import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, GraduationCap, FolderOpen, Users, Users2,
  Newspaper, CalendarDays, HelpCircle, Link2, Settings, Shield,
  Info, Contact, Search, Target, Facebook, Globe, ExternalLink,
  Video, UserRound, Calculator, Heart, Sparkles, Ticket, FileText,
  Crown, icons as LucideIcons,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useLeaderPermissions } from '@/hooks/useLeaderPermissions';
import { useCalculatorAccess } from '@/hooks/useCalculatorSettings';
import { usePartnerPageAccess } from '@/hooks/usePartnerPageAccess';
import { useChatSidebarVisibility, isRoleVisibleForChat } from '@/hooks/useChatSidebarVisibility';
import { usePureBoxVisibility } from '@/hooks/usePureBoxVisibility';
import { usePaidEventsVisibility, isRoleVisibleForPaidEvents } from '@/hooks/usePaidEventsVisibility';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import React from 'react';

export interface SubMenuItem {
  id: string;
  labelKey: string;
  path: string;
  icon?: React.ElementType;
  isExternal?: boolean;
  clipboardContent?: string | null;
  isDynamic?: boolean;
}

export interface MenuItem {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  path?: string;
  tab?: string;
  action?: () => void;
  visibleFor?: string[];
  hasSubmenu?: boolean;
  submenuItems?: SubMenuItem[];
}

interface HtmlPageSidebar {
  id: string;
  title: string;
  slug: string;
  sidebar_icon: string | null;
  sidebar_position: number | null;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_everyone: boolean;
}

const detectPlatform = (title: string, url: string): string => {
  const text = `${title} ${url}`.toLowerCase();
  if (text.includes('whatsapp') || text.includes('wa.me') || text.includes('chat.whatsapp')) return 'whatsapp';
  if (text.includes('facebook') || text.includes('fb.com')) return 'facebook';
  return 'default';
};

const platformIcons: Record<string, React.ElementType> = {
  whatsapp: WhatsAppIcon,
  facebook: Facebook,
  default: ExternalLink,
};

const formatLabel = (text: string): string => {
  return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const useSidebarNavigation = () => {
  const { isPartner, isSpecjalista, isClient, userRole, isAdmin } = useAuth();
  const { tf } = useLanguage();
  const { data: calculatorAccess } = useCalculatorAccess();
  const { hasAccess: hasPartnerPageAccess } = usePartnerPageAccess();
  const { isAnyLeaderFeatureEnabled } = useLeaderPermissions();
  const { data: chatVisibility } = useChatSidebarVisibility();
  const { data: paidEventsVisibility } = usePaidEventsVisibility();
  const { isVisible: isPureBoxVisible } = usePureBoxVisibility();

  const [canGenerateReflinks, setCanGenerateReflinks] = useState(false);
  const [infoLinks, setInfoLinks] = useState<Array<{ id: string; title: string; link_url: string | null; clipboard_content: string | null; }>>([]);
  const [communityLinks, setCommunityLinks] = useState<Array<{ id: string; title: string; url: string; icon_name?: string; icon_color?: string | null; image_url?: string | null; }>>([]);
  const [individualMeetingsEnabled, setIndividualMeetingsEnabled] = useState({ tripartite: false, consultation: false });

  const { data: htmlPages } = useQuery({
    queryKey: ['html-pages-sidebar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('html_pages')
        .select('id, title, slug, sidebar_icon, sidebar_position, visible_to_clients, visible_to_partners, visible_to_specjalista, visible_to_everyone')
        .eq('is_published', true).eq('is_active', true).eq('show_in_sidebar', true)
        .order('sidebar_position', { ascending: true });
      if (error) throw error;
      return data as HtmlPageSidebar[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const fetchVisibility = async () => {
      if (!userRole?.role) return;
      const { data: reflinkSettings } = await supabase
        .from('reflink_generation_settings')
        .select('can_generate')
        .eq('role', userRole.role as any)
        .single();
      setCanGenerateReflinks(reflinkSettings?.can_generate || false);

      const { data: infoLinksData } = await supabase
        .from('reflinks')
        .select('id, title, link_url, clipboard_content')
        .eq('is_active', true)
        .contains('visible_to_roles', [userRole.role])
        .order('position', { ascending: true });
      setInfoLinks(infoLinksData || []);

      const role = userRole?.role?.toLowerCase();
      const { data: footerIconsData } = await supabase
        .from('sidebar_footer_icons')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      const filteredIcons = (footerIconsData || []).filter(icon => {
        if (role === 'admin' && icon.visible_to_admin) return true;
        if (role === 'partner' && icon.visible_to_partner) return true;
        if ((role === 'client' || role === 'user') && icon.visible_to_client) return true;
        if (role === 'specjalista' && icon.visible_to_specjalista) return true;
        return false;
      });
      setCommunityLinks(filteredIcons.map(icon => ({
        id: icon.id, title: icon.title, url: icon.url,
        icon_name: icon.icon_name, icon_color: icon.icon_color, image_url: icon.image_url,
      })));

      if (role === 'partner') {
        const { data: leaderPerm } = await supabase
          .from('leader_permissions')
          .select('tripartite_meeting_enabled, partner_consultation_enabled')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
          .maybeSingle();
        setIndividualMeetingsEnabled({
          tripartite: leaderPerm?.tripartite_meeting_enabled || false,
          consultation: leaderPerm?.partner_consultation_enabled || false,
        });
      }
    };
    if (userRole) fetchVisibility();
  }, [userRole]);

  const menuLabelFallbacks: Record<string, string> = {
    'dashboard.menu.dashboard': 'Dashboard',
    'dashboard.menu.academy': 'Akademia',
    'dashboard.menu.healthyKnowledge': 'Zdrowa Wiedza',
    'dashboard.menu.resources': 'Biblioteka',
    'dashboard.menu.pureContacts': 'Pure-Kontakty',
    'dashboard.menu.privateContacts': 'Kontakty prywatne',
    'dashboard.menu.teamContacts': 'Kontakty zespołu',
    'dashboard.menu.searchSpecialist': 'Szukaj specjalisty',
    'dashboard.menu.news': 'Aktualności',
    'dashboard.menu.events': 'Eventy',
    'dashboard.menu.webinars': 'Webinary',
    'dashboard.menu.teamMeetings': 'Spotkania zespołu',
    'dashboard.menu.individualMeetings': 'Spotkania indywidualne',
    'dashboard.menu.paidEvents': 'Eventy płatne',
    'dashboard.menu.chat': 'Chat',
    'dashboard.menu.support': 'Wsparcie i pomoc',
    'dashboard.pureLinki': 'PureLinki',
    'dashboard.menu.infolinks': 'PureLinki',
    'dashboard.menu.community': 'Społeczność',
    'dashboard.menu.settings': 'Ustawienia',
    'dashboard.menu.calculator': 'Kalkulator',
    'dashboard.menu.forInfluencers': 'Dla Influenserów',
    'dashboard.menu.forSpecialists': 'Dla Specjalistów',
    'dashboard.menu.admin': 'CMS Panel',
  };

  const getLabel = (key: string) => tf(key, menuLabelFallbacks[key] || key);

  const infoLinksSubmenuItems: SubMenuItem[] = infoLinks.map(link => ({
    id: link.id, labelKey: formatLabel(link.title), path: link.link_url || '#',
    isExternal: !!link.link_url, clipboardContent: link.clipboard_content, isDynamic: true, icon: ExternalLink,
  }));

  const communitySubmenuItems: SubMenuItem[] = communityLinks.map(link => {
    const platform = detectPlatform(link.title, link.url);
    return {
      id: link.id, labelKey: formatLabel(link.title), path: link.url,
      isExternal: true, isDynamic: true, icon: platformIcons[platform] || ExternalLink,
    };
  });

  const dynamicHtmlPageItems: MenuItem[] = (htmlPages || [])
    .filter(page => {
      const role = userRole?.role?.toLowerCase();
      if (page.visible_to_everyone) return true;
      if (role === 'admin') return true;
      if (role === 'client' && page.visible_to_clients) return true;
      if (role === 'partner' && page.visible_to_partners) return true;
      if (role === 'specjalista' && page.visible_to_specjalista) return true;
      return false;
    })
    .map(page => {
      const IconComponent = page.sidebar_icon
        ? (LucideIcons as Record<string, React.ElementType>)[page.sidebar_icon] || FileText
        : FileText;
      return { id: `html-${page.slug}`, icon: IconComponent, labelKey: page.title, path: `/html/${page.slug}` };
    });

  // All menu items (full list for mega-menu)
  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard.menu.dashboard', path: '/dashboard' },
    ...(isPartner && isAnyLeaderFeatureEnabled ? [{
      id: 'leader-panel', icon: Crown, labelKey: 'Panel Lidera', path: '/leader',
    }] : []) as MenuItem[],
    { id: 'academy', icon: GraduationCap, labelKey: 'dashboard.menu.academy', path: '/training' },
    { id: 'healthy-knowledge', icon: Heart, labelKey: 'dashboard.menu.healthyKnowledge', path: '/zdrowa-wiedza' },
    { id: 'resources', icon: FolderOpen, labelKey: 'dashboard.menu.resources', path: '/knowledge' },
    ...(() => {
      const pureBoxSubs = [
        { id: 'skills-assessment', labelKey: 'Ocena umiejętności', path: '/skills-assessment', icon: Target },
        { id: 'moje-testy', labelKey: 'Moje Testy', path: '/moje-testy', icon: Heart },
      ].filter(sub => isPureBoxVisible(sub.id));
      if (pureBoxSubs.length === 0) return [];
      return [{ id: 'purebox', icon: Sparkles, labelKey: 'PureBox', hasSubmenu: true, submenuItems: pureBoxSubs }] as MenuItem[];
    })(),
    {
      id: 'pureContacts', icon: Users, labelKey: 'dashboard.menu.pureContacts', hasSubmenu: true,
      submenuItems: [
        { id: 'private-contacts', labelKey: 'dashboard.menu.privateContacts', path: '/my-account?tab=team-contacts&subTab=private', icon: Contact },
        { id: 'team-contacts', labelKey: 'dashboard.menu.teamContacts', path: '/my-account?tab=team-contacts&subTab=team', icon: Users },
        { id: 'search-specialist', labelKey: 'dashboard.menu.searchSpecialist', path: '/my-account?tab=team-contacts&subTab=search', icon: Search },
      ],
      visibleFor: ['partner', 'specjalista', 'admin'],
    },
    { id: 'news', icon: Newspaper, labelKey: 'dashboard.menu.news', path: '/page/aktualnosci' },
    {
      id: 'events', icon: CalendarDays, labelKey: 'dashboard.menu.events', hasSubmenu: true,
      submenuItems: [
        { id: 'webinars', labelKey: 'dashboard.menu.webinars', path: '/events/webinars', icon: Video },
        { id: 'team-meetings', labelKey: 'dashboard.menu.teamMeetings', path: '/events/team-meetings', icon: Users2 },
        { id: 'individual-meetings', labelKey: 'dashboard.menu.individualMeetings', path: '/events/individual-meetings', icon: UserRound },
      ],
    },
    { id: 'paid-events', icon: Ticket, labelKey: 'dashboard.menu.paidEvents', path: '/paid-events' },
    { id: 'reflinks', icon: Link2, labelKey: 'dashboard.pureLinki', path: '/my-account', tab: 'reflinks' },
    ...(hasPartnerPageAccess ? [{ id: 'moja-strona', icon: Globe, labelKey: 'Moja Strona-Biznes Partner', path: '/moja-strona' }] : []) as MenuItem[],
    {
      id: 'infolinks', icon: Info, labelKey: 'dashboard.menu.infolinks',
      hasSubmenu: infoLinksSubmenuItems.length > 0, submenuItems: infoLinksSubmenuItems,
    },
    ...dynamicHtmlPageItems,
    { id: 'settings', icon: Settings, labelKey: 'dashboard.menu.settings', path: '/my-account', tab: 'profile' },
    { id: 'support', icon: HelpCircle, labelKey: 'dashboard.menu.support', action: () => { window.dispatchEvent(new CustomEvent('openSupportForm')); } },
    ...(calculatorAccess?.hasAccess && !isPartner ? [{
      id: 'calculator', icon: Calculator, labelKey: 'dashboard.menu.calculator', hasSubmenu: true,
      submenuItems: [
        { id: 'calculator-influencer', labelKey: 'dashboard.menu.forInfluencers', path: '/calculator/influencer', icon: Users },
        { id: 'calculator-specialist', labelKey: 'dashboard.menu.forSpecialists', path: '/calculator/specialist', icon: UserRound },
      ],
    }] : []) as MenuItem[],
    { id: 'admin', icon: Shield, labelKey: 'dashboard.menu.admin', path: '/admin', visibleFor: ['admin'] },
  ];

  // Filter menu items based on visibility
  const visibleMenuItems = allMenuItems.filter(item => {
    if (item.visibleFor) {
      const role = userRole?.role?.toLowerCase();
      if (!item.visibleFor.includes(role || '')) {
        if (item.id === 'team' && isClient) return true;
        return false;
      }
    }
    if (item.id === 'reflinks' && !canGenerateReflinks) return false;
    if (item.id === 'infolinks' && infoLinksSubmenuItems.length === 0) return false;
    if (item.id === 'community' && communitySubmenuItems.length === 0) return false;
    if (item.id === 'chat' && !isRoleVisibleForChat(chatVisibility, userRole?.role)) return false;
    if (item.id === 'paid-events' && !isRoleVisibleForPaidEvents(paidEventsVisibility, userRole?.role)) return false;
    return true;
  });

  // Group items for mega-menu categories
  const knowledgeIds = ['academy', 'healthy-knowledge', 'resources', 'purebox'];
  const communityIds = ['news', 'events', 'paid-events', 'pureContacts'];
  const toolsIds = ['reflinks', 'moja-strona', 'infolinks', 'calculator'];
  const systemIds = ['settings', 'support', 'admin'];
  const primaryIds = ['dashboard', 'leader-panel'];

  const groupedItems = {
    primary: visibleMenuItems.filter(i => primaryIds.includes(i.id)),
    knowledge: visibleMenuItems.filter(i => knowledgeIds.includes(i.id)),
    community: visibleMenuItems.filter(i => communityIds.includes(i.id)),
    tools: visibleMenuItems.filter(i => toolsIds.includes(i.id) || i.id.startsWith('html-')),
    system: visibleMenuItems.filter(i => systemIds.includes(i.id)),
  };

  return {
    visibleMenuItems,
    groupedItems,
    communityLinks,
    getLabel,
    detectPlatform,
    platformIcons,
  };
};
