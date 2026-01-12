import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, BookOpen, FolderOpen, LayoutDashboard, Menu, Link2, Copy, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardPreference } from '@/hooks/useDashboardPreference';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  siteLogo: string;
  publishedPages?: any[];
}

interface Reflink {
  id: string;
  target_role: string;
  reflink_code: string;
  title: string | null;
  link_url: string | null;
  link_type: string;
  visible_to_roles: string[];
  position: number;
  clipboard_content: string | null;
}

export const Header: React.FC<HeaderProps> = ({ siteLogo, publishedPages = [] }) => {
  const { user, isAdmin, isPartner, isSpecjalista, isClient, signOut, userRole } = useAuth();
  const { t } = useLanguage();
  const { setViewMode } = useDashboardPreference();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Reflinks state
  const [reflinks, setReflinks] = useState<Reflink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isReflinksVisible, setIsReflinksVisible] = useState<boolean>(false);

  // Check reflinks visibility and fetch reflinks
  useEffect(() => {
    const checkReflinksVisibility = async () => {
      if (!isPartner && !isSpecjalista) {
        setIsReflinksVisible(false);
        return;
      }

      const currentRole = userRole?.role;
      if (currentRole === 'admin') {
        setIsReflinksVisible(true);
        fetchReflinks();
        return;
      }

      const roleMapping: Record<string, string> = {
        'partner': 'partner',
        'specjalista': 'specjalista',
        'client': 'client',
        'klient': 'client',
      };
      const mappedRole = currentRole ? roleMapping[currentRole] || currentRole : null;

      if (!mappedRole) {
        setIsReflinksVisible(false);
        return;
      }

      const { data } = await supabase
        .from('reflinks_visibility_settings')
        .select('button_visible')
        .eq('role', mappedRole)
        .maybeSingle();

      setIsReflinksVisible(data?.button_visible ?? false);
      if (data?.button_visible) {
        fetchReflinks();
      }
    };

    const fetchReflinks = async () => {
      const { data } = await supabase
        .from('reflinks')
        .select('id, target_role, reflink_code, title, link_url, link_type, visible_to_roles, position, clipboard_content')
        .eq('is_active', true)
        .order('target_role')
        .order('position');

      const currentRole = userRole?.role || null;
      const filtered = (data || []).filter(reflink => {
        if (currentRole === 'admin') return true;
        const visibleRoles = reflink.visible_to_roles || [];
        const roleMapping: Record<string, string> = {
          'partner': 'partner',
          'specjalista': 'specjalista',
          'client': 'client',
          'klient': 'client',
        };
        const mappedRole = currentRole ? (roleMapping[currentRole] || currentRole) : null;
        return mappedRole && visibleRoles.includes(mappedRole);
      });

      setReflinks(filtered);
    };

    checkReflinksVisibility();
  }, [isPartner, isSpecjalista, userRole]);

  const getFullLink = (reflink: Reflink) => {
    if (reflink.link_type === 'reflink') {
      return `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
    }
    if (reflink.link_type === 'internal') {
      return `${window.location.origin}${reflink.link_url || ''}`;
    }
    return reflink.link_url || '';
  };

  const handleCopyReflink = async (reflink: Reflink) => {
    try {
      let description: string;
      
      if (reflink.link_type === 'clipboard') {
        const content = reflink.clipboard_content || '';
        if (!content) {
          toast({ title: 'Błąd', description: 'Brak treści do skopiowania', variant: 'destructive' });
          return;
        }
        description = 'Treść została skopiowana do schowka';
        
        try {
          const htmlBlob = new Blob([content], { type: 'text/html' });
          const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          const plainBlob = new Blob([plainText], { type: 'text/plain' });
          await navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': plainBlob })
          ]);
        } catch {
          const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          await navigator.clipboard.writeText(plainText);
        }
      } else {
        const textToCopy = getFullLink(reflink);
        description = 'Link został skopiowany do schowka';
        await navigator.clipboard.writeText(textToCopy);
      }
      
      setCopiedId(reflink.id);
      toast({ title: 'Skopiowano!', description });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({ title: 'Błąd kopiowania', description: 'Nie udało się skopiować do schowka', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSwitchToModern = () => {
    setViewMode('modern');
    navigate('/dashboard');
  };

  const roleLabels: Record<string, string> = {
    klient: 'Klient',
    partner: 'Partner',
    specjalista: 'Specjalista',
  };

  const groupedReflinks = reflinks.reduce((acc, reflink) => {
    const role = reflink.target_role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(reflink);
    return acc;
  }, {} as Record<string, Reflink[]>);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-full">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src={siteLogo} 
              alt="Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <span className="font-bold text-sm sm:text-base text-foreground hidden sm:inline uppercase tracking-wide">PURE LIFE</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            <LanguageSelector />
            <ThemeSelector />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-muted h-8 sm:h-9 px-2 sm:px-3">
                    <Menu className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline text-xs sm:text-sm">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border border-border">
                  {/* Moje konto / Panel CMS */}
                  {isAdmin ? (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('nav.admin')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/my-account')} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('nav.myAccount')}
                    </DropdownMenuItem>
                  )}
                  
                  {/* Akademia */}
                  <DropdownMenuItem onClick={() => navigate('/training')} className="cursor-pointer">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('training.title')}
                  </DropdownMenuItem>
                  
                  {/* Centrum Zasobów */}
                  {(isClient || isPartner || isSpecjalista) && (
                    <DropdownMenuItem onClick={() => navigate('/knowledge')} className="cursor-pointer">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      {t('nav.knowledgeCenter')}
                    </DropdownMenuItem>
                  )}
                  
                  {/* Reflinki - jako podmenu */}
                  {isReflinksVisible && Object.keys(groupedReflinks).length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Link2 className="w-4 h-4 mr-2" />
                        InfoLinki
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-background border border-border">
                        {Object.entries(groupedReflinks).map(([role, roleReflinks]) => (
                          <React.Fragment key={role}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {roleLabels[role] || role}
                            </div>
                            {roleReflinks.map(reflink => (
                              <DropdownMenuItem 
                                key={reflink.id} 
                                onClick={() => handleCopyReflink(reflink)}
                                className="cursor-pointer flex items-center justify-between"
                              >
                                <span className="truncate flex-1">{reflink.title}</span>
                                {copiedId === reflink.id ? (
                                  <Check className="w-4 h-4 text-green-500 ml-2" />
                                ) : (
                                  <Copy className="w-4 h-4 ml-2 opacity-50" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Nowy Panel */}
                  <DropdownMenuItem onClick={handleSwitchToModern} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t('dashboard.newDashboard')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Wyloguj się */}
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm">
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
