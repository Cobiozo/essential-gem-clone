import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  GraduationCap,
  FolderOpen,
  Users,
  Users2,
  Newspaper,
  CalendarDays,
  MessageSquare,
  HelpCircle,
  Link2,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Info,
  Contact,
  Search,
  Facebook,
  ExternalLink,
  Video,
  UserRound,
  Calculator,
  Heart,
  icons as LucideIcons,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserProfileCard } from './UserProfileCard';
import { supabase } from '@/integrations/supabase/client';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useCalculatorAccess } from '@/hooks/useCalculatorSettings';

// Tooltip descriptions for navigation items (2s delay)
const menuTooltipDescriptions: Record<string, string> = {
  dashboard: 'Twoja strona główna z podglądem wszystkich najważniejszych informacji',
  academy: 'Szkolenia i materiały edukacyjne - zdobywaj wiedzę i certyfikaty',
  'healthy-knowledge': 'Materiały o zdrowym stylu życia i produktach',
  resources: 'Biblioteka dokumentów, grafik i materiałów do pobrania',
  pureContacts: 'Zarządzaj kontaktami prywatnymi i zespołowymi',
  news: 'Aktualności i ważne ogłoszenia od zespołu',
  events: 'Webinary, spotkania zespołowe i indywidualne konsultacje',
  chat: 'Komunikacja z upline i zespołem',
  support: 'Potrzebujesz pomocy? Wyślij zgłoszenie do zespołu wsparcia',
  reflinks: 'Twoje unikalne linki polecające - śledź kliknięcia',
  infolinks: 'Przydatne linki i materiały informacyjne',
  community: 'Dołącz do społeczności na różnych platformach',
  settings: 'Ustawienia profilu, powiadomień i preferencji',
  calculator: 'Kalkulator prowizji i symulacje zarobków',
  admin: 'Panel administracyjny - zarządzanie systemem',
  'individual-meetings-setup': 'Zarządzaj spotkaniami indywidualnymi',
};

interface SubMenuItem {
  id: string;
  labelKey: string;
  path: string;
  icon?: React.ElementType;
  isExternal?: boolean;
  clipboardContent?: string | null;
  isDynamic?: boolean;
}

interface MenuItem {
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

// Helper to detect platform from title/url
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

export const DashboardSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isPartner, isSpecjalista, isClient, userRole, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Calculator access
  const { data: calculatorAccess } = useCalculatorAccess();

  // Visibility settings
  const [aiCompassVisible, setAiCompassVisible] = useState(false);
  const [canGenerateReflinks, setCanGenerateReflinks] = useState(false);
  const [hasInfoLinks, setHasInfoLinks] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  
  // Individual meetings permissions for partners
  const [individualMeetingsEnabled, setIndividualMeetingsEnabled] = useState({
    tripartite: false,
    consultation: false,
  });
  
  // Dynamic submenu data
  const [infoLinks, setInfoLinks] = useState<Array<{
    id: string;
    title: string;
    link_url: string | null;
    clipboard_content: string | null;
  }>>([]);
  const [communityLinks, setCommunityLinks] = useState<Array<{
    id: string;
    title: string;
    url: string;
    icon_name?: string;
    icon_color?: string | null;
    image_url?: string | null;
  }>>([]);

  useEffect(() => {
    const fetchVisibility = async () => {
      // AI Compass visibility
      const { data: compassSettings } = await supabase
        .from('ai_compass_settings')
        .select('is_enabled, enabled_for_clients, enabled_for_partners, enabled_for_specjalista')
        .limit(1)
        .maybeSingle();

      if (compassSettings?.is_enabled) {
        const role = userRole?.role?.toLowerCase();
        const visible =
          (role === 'client' && compassSettings.enabled_for_clients) ||
          (role === 'partner' && compassSettings.enabled_for_partners) ||
          (role === 'specjalista' && compassSettings.enabled_for_specjalista);
        setAiCompassVisible(visible);
      }

      // Reflinks visibility
      if (userRole?.role) {
        const { data: reflinkSettings } = await supabase
          .from('reflink_generation_settings')
          .select('can_generate')
          .eq('role', userRole.role as 'admin' | 'partner' | 'specjalista' | 'client' | 'user')
          .single();
        setCanGenerateReflinks(reflinkSettings?.can_generate || false);

        // Fetch info links for submenu
        const { data: infoLinksData } = await supabase
          .from('reflinks')
          .select('id, title, link_url, clipboard_content')
          .eq('is_active', true)
          .contains('visible_to_roles', [userRole.role])
          .order('position', { ascending: true });

        setInfoLinks(infoLinksData || []);
        setHasInfoLinks((infoLinksData?.length || 0) > 0);

        // Fetch sidebar footer icons from new dedicated table
        const role = userRole?.role?.toLowerCase();
        const { data: footerIconsData } = await supabase
          .from('sidebar_footer_icons')
          .select('*')
          .eq('is_active', true)
          .order('position', { ascending: true });

        // Filter by visibility based on user role
        const filteredIcons = (footerIconsData || []).filter(icon => {
          if (role === 'admin' && icon.visible_to_admin) return true;
          if (role === 'partner' && icon.visible_to_partner) return true;
          if ((role === 'client' || role === 'user') && icon.visible_to_client) return true;
          if (role === 'specjalista' && icon.visible_to_specjalista) return true;
          return false;
        });

        setCommunityLinks(filteredIcons.map(icon => ({
          id: icon.id,
          title: icon.title,
          url: icon.url,
          icon_name: icon.icon_name,
          icon_color: icon.icon_color,
          image_url: icon.image_url,
        })));

        // Fetch individual meetings permissions for partners
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
      }
    };

    if (userRole) {
      fetchVisibility();
    }
  }, [userRole]);

  // Format label to title case for consistent styling
  const formatLabel = (text: string): string => {
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Build dynamic submenu items for InfoLinki
  const infoLinksSubmenuItems: SubMenuItem[] = infoLinks.map(link => ({
    id: link.id,
    labelKey: formatLabel(link.title),
    path: link.link_url || '#',
    isExternal: !!link.link_url,
    clipboardContent: link.clipboard_content,
    isDynamic: true,
    icon: ExternalLink,
  }));

  // Build dynamic submenu items for Społeczność with platform icons
  const communitySubmenuItems: SubMenuItem[] = communityLinks.map(link => {
    const platform = detectPlatform(link.title, link.url);
    return {
      id: link.id,
      labelKey: formatLabel(link.title),
      path: link.url,
      isExternal: true,
      isDynamic: true,
      icon: platformIcons[platform] || ExternalLink,
    };
  });

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard.menu.dashboard', path: '/dashboard' },
    { id: 'academy', icon: GraduationCap, labelKey: 'dashboard.menu.academy', path: '/training' },
    { id: 'healthy-knowledge', icon: Heart, labelKey: 'Zdrowa Wiedza', path: '/zdrowa-wiedza' },
    { id: 'resources', icon: FolderOpen, labelKey: 'dashboard.menu.resources', path: '/knowledge' },
    { 
      id: 'pureContacts', 
      icon: Users, 
      labelKey: 'dashboard.menu.pureContacts',
      hasSubmenu: true,
      submenuItems: [
        { id: 'private-contacts', labelKey: 'dashboard.menu.privateContacts', path: '/my-account?tab=team-contacts&subTab=private', icon: Contact },
        { id: 'team-contacts', labelKey: 'dashboard.menu.teamContacts', path: '/my-account?tab=team-contacts&subTab=team', icon: Users },
        { id: 'search-specialist', labelKey: 'dashboard.menu.searchSpecialist', path: '/my-account?tab=team-contacts&subTab=search', icon: Search },
      ],
      visibleFor: ['partner', 'specjalista', 'admin']
    },
    { id: 'news', icon: Newspaper, labelKey: 'dashboard.menu.news', path: '/page/aktualnosci' },
    { 
      id: 'events', 
      icon: CalendarDays, 
      labelKey: 'dashboard.menu.events',
      hasSubmenu: true,
      submenuItems: [
        { id: 'webinars', labelKey: 'dashboard.menu.webinars', path: '/events/webinars', icon: Video },
        { id: 'team-meetings', labelKey: 'dashboard.menu.teamMeetings', path: '/events/team-meetings', icon: Users2 },
        { id: 'individual-meetings', labelKey: 'dashboard.menu.individualMeetings', path: '/events/individual-meetings', icon: UserRound },
      ],
    },
    // Individual meetings for partners with permissions
    ...(isPartner && (individualMeetingsEnabled.tripartite || individualMeetingsEnabled.consultation) ? [{
      id: 'individual-meetings-setup',
      icon: UserRound,
      labelKey: 'Spotkanie indywidualne',
      hasSubmenu: true,
      submenuItems: [
        ...(individualMeetingsEnabled.tripartite ? [{
          id: 'tripartite-meeting',
          labelKey: 'Ustaw spotkanie trójstronne',
          path: '/my-account?tab=individual-meetings&type=tripartite',
          icon: Users,
        }] : []),
        ...(individualMeetingsEnabled.consultation ? [{
          id: 'partner-consultation',
          labelKey: 'Ustaw konsultacje dla partnerów',
          path: '/my-account?tab=individual-meetings&type=consultation',
          icon: UserRound,
        }] : []),
      ] as SubMenuItem[],
    }] : []) as MenuItem[],
    { 
      id: 'chat', 
      icon: MessageSquare, 
      labelKey: 'dashboard.menu.chat', 
      path: '/my-account', 
      tab: 'communication',
    },
    { id: 'support', icon: HelpCircle, labelKey: 'dashboard.menu.support', action: () => {
      // Open support form dialog - dispatch custom event
      window.dispatchEvent(new CustomEvent('openSupportForm'));
    }},
    { 
      id: 'reflinks', 
      icon: Link2, 
      labelKey: 'dashboard.pureLinki', 
      path: '/my-account', 
      tab: 'reflinks',
    },
    { 
      id: 'infolinks', 
      icon: Info, 
      labelKey: 'dashboard.menu.infolinks',
      hasSubmenu: infoLinksSubmenuItems.length > 0,
      submenuItems: infoLinksSubmenuItems,
    },
    { 
      id: 'community', 
      icon: Users2, 
      labelKey: 'dashboard.menu.community',
      hasSubmenu: communitySubmenuItems.length > 0,
      submenuItems: communitySubmenuItems,
    },
    { id: 'settings', icon: Settings, labelKey: 'dashboard.menu.settings', path: '/my-account', tab: 'profile' },
    // Calculator - conditional based on access with submenu
    ...(calculatorAccess?.hasAccess ? [{
      id: 'calculator',
      icon: Calculator,
      labelKey: 'Kalkulator',
      hasSubmenu: true,
      submenuItems: [
        { 
          id: 'calculator-influencer', 
          labelKey: 'Dla Influenserów', 
          path: '/calculator/influencer', 
          icon: Users,
        },
        { 
          id: 'calculator-specialist', 
          labelKey: 'Dla Specjalistów', 
          path: '/calculator/specialist', 
          icon: UserRound,
        },
      ],
    }] : []) as MenuItem[],
    { 
      id: 'admin', 
      icon: Shield, 
      labelKey: 'dashboard.menu.admin', 
      path: '/admin',
      visibleFor: ['admin']
    },
  ];

  // Filter menu items based on visibility
  const visibleMenuItems = menuItems.filter(item => {
    // Check role-based visibility
    if (item.visibleFor) {
      const role = userRole?.role?.toLowerCase();
      if (!item.visibleFor.includes(role || '')) {
        // Special case for team - also visible to clients with specialist search access
        if (item.id === 'team' && isClient) {
          return true; // Client can see if they have search access (handled in component)
        }
        return false;
      }
    }

    // Check reflinks visibility
    if (item.id === 'reflinks' && !canGenerateReflinks) {
      return false;
    }

    // Check infolinks visibility - hide if no submenu items
    if (item.id === 'infolinks' && infoLinksSubmenuItems.length === 0) {
      return false;
    }

    // Check community visibility - hide if no submenu items
    if (item.id === 'community' && communitySubmenuItems.length === 0) {
      return false;
    }

    return true;
  });

  const handleMenuClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      const url = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
      navigate(url);
    }
    setOpenMobile(false);
  };

  const handleSubmenuClick = async (subItem: SubMenuItem) => {
    // If has clipboard_content - copy to clipboard
    if (subItem.clipboardContent) {
      try {
        await navigator.clipboard.writeText(subItem.clipboardContent);
        toast({
          title: t('common.copied') || 'Skopiowano!',
          description: subItem.labelKey,
        });
      } catch (error) {
        console.error('Failed to copy:', error);
      }
      setOpenMobile(false);
      return;
    }
    
    // If external link - open in new tab
    if (subItem.isExternal && subItem.path && subItem.path !== '#') {
      window.open(subItem.path, '_blank', 'noopener,noreferrer');
      setOpenMobile(false);
      return;
    }
    
    // Default - internal navigation
    navigate(subItem.path);
    setOpenMobile(false);
  };

  const isActive = (item: MenuItem) => {
    // Handle external page paths (like /page/terminarz)
    if (item.path?.startsWith('/page/')) {
      return location.pathname === item.path;
    }
    if (item.path === '/dashboard' && !item.tab) {
      return location.pathname === '/dashboard';
    }
    if (item.tab) {
      const searchParams = new URLSearchParams(location.search);
      return location.pathname === item.path && searchParams.get('tab') === item.tab;
    }
    return location.pathname === item.path;
  };

  const isSubmenuActive = (subItem: SubMenuItem) => {
    // Dynamic items (external links) are never "active" in navigation sense
    if (subItem.isDynamic) {
      return false;
    }
    
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab');
    const currentSubTab = searchParams.get('subTab');
    
    if (subItem.id === 'private-contacts') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'private';
    }
    if (subItem.id === 'team-contacts') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'team';
    }
    if (subItem.id === 'search-specialist') {
      return location.pathname === '/my-account' && currentTab === 'team-contacts' && currentSubTab === 'search';
    }
    // Events submenu items
    if (subItem.id === 'webinars') {
      return location.pathname === '/events/webinars';
    }
    if (subItem.id === 'team-meetings') {
      return location.pathname === '/events/team-meetings';
    }
    if (subItem.id === 'individual-meetings') {
      return location.pathname === '/events/individual-meetings';
    }
    if (subItem.id === 'tripartite-meeting') {
      return location.pathname === '/my-account' && currentTab === 'individual-meetings' && searchParams.get('type') === 'tripartite';
    }
    if (subItem.id === 'partner-consultation') {
      return location.pathname === '/my-account' && currentTab === 'individual-meetings' && searchParams.get('type') === 'consultation';
    }
    // Calculator submenu items
    if (subItem.id === 'calculator-influencer') {
      return location.pathname === '/calculator/influencer';
    }
    if (subItem.id === 'calculator-specialist') {
      return location.pathname === '/calculator/specialist';
    }
    return false;
  };

  const isSubmenuParentActive = (item: MenuItem) => {
    if (!item.submenuItems) return false;
    return item.submenuItems.some(sub => isSubmenuActive(sub));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar data-tour="sidebar" collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className={`flex-shrink-0 flex items-center justify-center ${
            isCollapsed ? 'h-8 w-8 min-w-[32px] min-h-[32px]' : 'h-10 w-10 min-w-[40px] min-h-[40px]'
          }`}>
            <img 
              src={newPureLifeLogo} 
              alt="Pure Life" 
              className="max-h-full max-w-full object-contain"
              style={{ aspectRatio: '1/1' }}
            />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
              PURE LIFE
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Card */}
      <UserProfileCard />

      {/* Navigation Menu */}
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.id} data-tour={`menu-${item.id}`}>
              {item.hasSubmenu && item.submenuItems && item.submenuItems.length > 0 ? (
                <Collapsible
                  open={openSubmenu === item.id || isSubmenuParentActive(item)}
                  onOpenChange={(open) => setOpenSubmenu(open ? item.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t(item.labelKey)}
                      isActive={isSubmenuParentActive(item)}
                      className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{t(item.labelKey)}</span>
                      <ChevronDown 
                        className={`h-4 w-4 transition-transform ${openSubmenu === item.id || isSubmenuParentActive(item) ? 'rotate-180' : ''}`} 
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.submenuItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id}>
                          <SidebarMenuSubButton
                            onClick={() => handleSubmenuClick(subItem)}
                            isActive={isSubmenuActive(subItem)}
                            className="cursor-pointer h-auto min-h-8 py-1.5"
                            title={subItem.isDynamic ? subItem.labelKey : t(subItem.labelKey)}
                          >
                            {subItem.icon && (
                              <subItem.icon 
                                className={`h-4 w-4 shrink-0 ${
                                  subItem.path?.includes('whatsapp') || subItem.path?.includes('wa.me') || subItem.path?.includes('chat.whatsapp')
                                    ? 'text-green-500' 
                                    : subItem.path?.includes('facebook') || subItem.path?.includes('fb.com')
                                      ? 'text-blue-600' 
                                      : ''
                                }`} 
                              />
                            )}
                            <span className="whitespace-normal break-words leading-tight text-left">
                              {subItem.isDynamic ? subItem.labelKey : t(subItem.labelKey)}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Tooltip delayDuration={2000}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={() => handleMenuClick(item)}
                      isActive={isActive(item)}
                      tooltip={t(item.labelKey)}
                      className="transition-colors hover:bg-primary/10 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {menuTooltipDescriptions[item.id] && (
                    <TooltipContent side="right" className="max-w-xs">
                      {menuTooltipDescriptions[item.id]}
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Social Media and Sign Out */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {/* Social Media Buttons - visible when expanded and links exist */}
        {!isCollapsed && communityLinks.length > 0 && (
          <div className="px-2 py-2 border-b border-sidebar-border mb-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {communityLinks.map((link) => {
                // Check if custom image exists
                const hasCustomImage = !!link.image_url;
                
                // Use icon from database, fallback to platform detection
                const IconComponent = link.icon_name 
                  ? (LucideIcons as Record<string, React.ElementType>)[link.icon_name] || ExternalLink
                  : platformIcons[detectPlatform(link.title, link.url)] || ExternalLink;
                
                return (
                  <Button
                    key={link.id}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-primary/10 overflow-hidden"
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                    title={link.title}
                  >
                    {hasCustomImage ? (
                      <img 
                        src={link.image_url!} 
                        alt={link.title} 
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <IconComponent 
                        className="h-5 w-5"
                        style={{ color: link.icon_color || undefined }}
                      />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip={t('nav.logout')}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};