import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAdminPresence } from '@/hooks/useAdminPresence';
import { AdminPresenceWidget } from '@/components/admin/AdminPresenceWidget';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { useDebounce } from '@/hooks/use-debounce';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { convertSupabaseSections, convertSupabaseSection } from '@/lib/typeUtils';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Plus, Trash2, LogOut, Home, Save, ChevronUp, ChevronDown, Palette, Type, Settings2, Users, CheckCircle, Clock, Mail, FileText, Download, SortAsc, UserPlus, Key, BookOpen, Award, Layout, Search, X, FolderOpen, Cookie, Compass, Sparkles, AlertTriangle, Languages, Bell, Menu } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { SecureMedia } from '@/components/SecureMedia';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { RichTextEditor } from '@/components/RichTextEditor';
import { TextEditor } from '@/components/cms/TextEditor';
import { FontEditor } from '@/components/cms/FontEditor';
import { ColorSchemeEditor } from '@/components/cms/ColorSchemeEditor';
import { SectionEditor } from '@/components/cms/SectionEditor';
import { ItemEditor } from '@/components/cms/ItemEditor';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LivePreviewEditor } from '@/components/dnd/LivePreviewEditor';
import { GroupEmailSender } from '@/components/GroupEmailSender';
import TrainingManagement from '@/components/admin/TrainingManagement';
import CertificateEditor from '@/components/admin/CertificateEditor';
import { ReflinksManagement } from '@/components/admin/ReflinksManagement';
import { KnowledgeResourcesManagement } from '@/components/admin/KnowledgeResourcesManagement';
import { CookieConsentManagement } from '@/components/admin/CookieConsentManagement';
import { AiCompassManagement } from '@/components/admin/AiCompassManagement';
import { DailySignalManagement } from '@/components/admin/DailySignalManagement';
import { ImportantInfoManagement } from '@/components/admin/ImportantInfoManagement';
import TranslationsManagement from '@/components/admin/TranslationsManagement';
import { TeamContactsManagement } from '@/components/admin/TeamContactsManagement';
import { NotificationSystemManagement } from '@/components/admin/NotificationSystemManagement';
import EmailTemplatesManagement from '@/components/admin/EmailTemplatesManagement';
import MaintenanceModeManagement from '@/components/admin/MaintenanceModeManagement';
import { UserEditDialog } from '@/components/admin/UserEditDialog';
import { CompactUserCard } from '@/components/admin/CompactUserCard';
import { UserStatusLegend } from '@/components/admin/UserStatusLegend';
import { BulkUserActions } from '@/components/admin/BulkUserActions';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
// Heavy libraries imported dynamically when needed
// import jsPDF from 'jspdf';
// import * as XLSX from 'xlsx';
// import JSZip from 'jszip';
import { ContentCell, CMSItem, CMSSection } from '@/types/cms';

// Remove duplicate interfaces - using shared types from @/types/cms

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  eq_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string | null;
  confirmation_sent_at?: string | null;
  guardian_approved?: boolean;
  guardian_approved_at?: string | null;
  admin_approved?: boolean;
  admin_approved_at?: string | null;
  upline_eq_id?: string | null;
  guardian_name?: string | null;
  email_activated?: boolean;
  email_activated_at?: string | null;
  // Extended profile data
  phone_number?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  specialization?: string | null;
  profile_description?: string | null;
  upline_first_name?: string | null;
  upline_last_name?: string | null;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  content_formatting: any | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  visible_to_partners: boolean;
  visible_to_clients: boolean;
  visible_to_everyone: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
}

const Admin = () => {
  // Helper functions for type conversion
  const convertCellsFromDatabase = (cells: any): ContentCell[] => {
    if (!cells) return [];
    if (typeof cells === 'string') {
      try {
        return JSON.parse(cells);
      } catch {
        return [];
      }
    }
    if (Array.isArray(cells)) {
      return cells;
    }
    return [];
  };

  const convertCellsToDatabase = (cells: ContentCell[]): any => {
    return cells && cells.length > 0 ? cells : null;
  };

  const convertDatabaseItemToCMSItem = (dbItem: any): CMSItem => {
    return {
      ...dbItem,
      cells: convertCellsFromDatabase(dbItem.cells)
    };
  };

  const { user, isAdmin, signOut, loading: authLoading, rolesReady } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<CMSSection | null>(null);
  const [editingItem, setEditingItem] = useState<CMSItem | null>(null);
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [editingPageRichText, setEditingPageRichText] = useState(false);
  const [editingPageInLayoutEditor, setEditingPageInLayoutEditor] = useState<{ id: string; title: string } | null>(null);
  const [pageContentStyle, setPageContentStyle] = useState<any>(null);
  const [pageSections, setPageSections] = useState<CMSSection[]>([]);
  const [nestedSections, setNestedSections] = useState<{[key: string]: CMSSection[]}>({});
  const [pageItems, setPageItems] = useState<CMSItem[]>([]);
  const [selectedPageSection, setSelectedPageSection] = useState<CMSSection | null>(null);
  const [editingPageItem, setEditingPageItem] = useState<CMSItem | null>(null);
  const [editingPageSection, setEditingPageSection] = useState<CMSSection | null>(null);
  const [showAddPageSectionEditor, setShowAddPageSectionEditor] = useState(false);
  const [newPageItem, setNewPageItem] = useState({
    type: 'button',
    title: '',
    description: '',
    url: '',
    icon: '',
    media_url: '',
    media_type: '' as 'image' | 'video' | 'document' | 'audio' | 'other' | '',
    media_alt_text: '',
  });
  const [newPageSection, setNewPageSection] = useState({
    title: '',
    position: 0,
  });
  const [editingPageItemTextMode, setEditingPageItemTextMode] = useState(false);
  const [editingPageItemTitleMode, setEditingPageItemTitleMode] = useState(false);
  const [newPageItemTextMode, setNewPageItemTextMode] = useState(false);
  const [newPageItemTitleMode, setNewPageItemTitleMode] = useState(false);
  const [pageItemTextStyle, setPageItemTextStyle] = useState<any>(null);
  const [pageItemTitleStyle, setPageItemTitleStyle] = useState<any>(null);
  const [newPageItemTextStyle, setNewPageItemTextStyle] = useState<any>(null);
  const [newPageItemTitleStyle, setNewPageItemTitleStyle] = useState<any>(null);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingUserProfile, setEditingUserProfile] = useState<UserProfile | null>(null);
  const [newItem, setNewItem] = useState({
    type: 'button',
    title: '',
    description: '',
    url: '',
    icon: '',
    media_url: '',
    media_type: '' as 'image' | 'video' | 'document' | 'audio' | 'other' | '',
    media_alt_text: '',
  });
  const [newSection, setNewSection] = useState({
    title: '',
    position: 0,
    visible_to_partners: false,
    visible_to_clients: false,
    visible_to_everyone: true,
    visible_to_specjalista: false,
    visible_to_anonymous: false,
    // Enhanced styling defaults - modern card design
    background_color: '#ffffff',
    text_color: '#ffffff',
    font_size: 20,
    alignment: 'center' as const,
    padding: 32,
    margin: 8,
    border_radius: 16,
    style_class: '',
    background_gradient: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
    border_width: 0,
    border_color: 'hsl(var(--border))',
    border_style: 'solid' as const,
    box_shadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    opacity: 100,
    width_type: 'full' as const,
    custom_width: 600,
    height_type: 'auto' as const,
    custom_height: 200,
    max_width: 1200,
    font_weight: 600,
    line_height: 1.5,
    letter_spacing: 0,
    text_transform: 'none' as const,
    display_type: 'block' as const,
    justify_content: 'center' as const,
    align_items: 'center' as const,
    gap: 16,
    // New enhanced defaults
    section_margin_top: 16,
    section_margin_bottom: 16,
    background_image: '',
    background_image_opacity: 100,
    background_image_position: 'center',
    background_image_size: 'cover',
    icon_name: '',
    icon_position: 'left',
    icon_size: 24,
    icon_color: '#ffffff',
    show_icon: false,
    content_direction: 'column',
    content_wrap: 'nowrap',
    min_height: 200,
    overflow_behavior: 'visible',
    hover_transition_duration: 300,
  });
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: false,
    position: 0,
    visible_to_partners: false,
    visible_to_clients: false,
    visible_to_everyone: true,
    visible_to_specjalista: false,
    visible_to_anonymous: false,
  });
  const [activeTab, setActiveTab] = useState("content");
  
  // Admin presence tracking
  const { admins, currentUserPresence, isConnected, updateActivity } = useAdminPresence(activeTab);
  
  // Update presence when tab changes
  useEffect(() => {
    updateActivity(activeTab);
  }, [activeTab, updateActivity]);
  const [editingItemTextMode, setEditingItemTextMode] = useState(false);
  const [editingItemTitleMode, setEditingItemTitleMode] = useState(false);
  const [newItemTextMode, setNewItemTextMode] = useState(false);
  const [newItemTitleMode, setNewItemTitleMode] = useState(false);
  const [itemTextStyle, setItemTextStyle] = useState<any>(null);
  const [itemTitleStyle, setItemTitleStyle] = useState<any>(null);
  const [newItemTextStyle, setNewItemTextStyle] = useState<any>(null);
  const [newItemTitleStyle, setNewItemTitleStyle] = useState<any>(null);
  
  // Header text management state
  const [headerText, setHeaderText] = useState<string>('');
  const [headerTextFormatting, setHeaderTextFormatting] = useState<any>(null);
  const [headerTextLoading, setHeaderTextLoading] = useState(false);
  
  // Author text management state
  const [authorText, setAuthorText] = useState<string>('');
  const [authorTextFormatting, setAuthorTextFormatting] = useState<any>(null);
  const [authorTextLoading, setAuthorTextLoading] = useState(false);
  
  // Logo management state
  const [siteLogo, setSiteLogo] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  
  // Header image management state
  const [headerImage, setHeaderImage] = useState('');
  const [headerImageUrl, setHeaderImageUrl] = useState('');
  const [headerImageLoading, setHeaderImageLoading] = useState(false);
  const [headerImageUploadLoading, setHeaderImageUploadLoading] = useState(false);
  const [headerImageSize, setHeaderImageSize] = useState<'small' | 'medium' | 'large' | 'xlarge' | 'custom'>('medium');
  const [headerImageCustomWidth, setHeaderImageCustomWidth] = useState<number>(128);
  const [headerImageCustomHeight, setHeaderImageCustomHeight] = useState<number>(128);
  const headerImageSizeInitialized = useRef(false);
  const prevHeaderSizeRef = useRef<string | null>(null);
  
  // Memoize header image size data to prevent unnecessary re-renders
  const headerImageSizeData = useMemo(() => ({
    size: headerImageSize,
    customWidth: headerImageCustomWidth,
    customHeight: headerImageCustomHeight
  }), [headerImageSize, headerImageCustomWidth, headerImageCustomHeight]);
  
  // Debounced header image size for auto-save
  const debouncedHeaderImageSize = useDebounce(headerImageSizeData, 1000);
  
  // Favicon and OG Image management state
  const [faviconUrl, setFaviconUrl] = useState('');
  const [faviconUrlInput, setFaviconUrlInput] = useState('');
  const [faviconLoading, setFaviconLoading] = useState(false);
  const [faviconUploadLoading, setFaviconUploadLoading] = useState(false);
  
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [ogImageUrlInput, setOgImageUrlInput] = useState('');
  const [ogImageLoading, setOgImageLoading] = useState(false);
  const [ogImageUploadLoading, setOgImageUploadLoading] = useState(false);
  
   // Password change state
   const [passwordData, setPasswordData] = useState({
     currentPassword: '',
     newPassword: '',
     confirmPassword: ''
   });
   const [passwordLoading, setPasswordLoading] = useState(false);
   
  
  // Reset user password state
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({
    userEmail: '',
    newPassword: ''
  });
  
  // New user creation state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'client' | 'admin' | 'partner' | 'specjalista'
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  
  // User sorting and filtering state
  const [userSortBy, setUserSortBy] = useState<'email' | 'role' | 'created_at' | 'is_active'>('created_at');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'active' | 'pending'>('pending');
  
  // Bulk user selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string }[]>([]);
  
  // Enable security preventions but allow text selection for CMS editing
  useSecurityPreventions(false);

  // Whitelist of allowed cms_sections columns and sanitizer to prevent DB errors
  const SECTION_DB_FIELDS = [
    'title', 'description', 'position', 'is_active', 'page_id',
    'visible_to_partners', 'visible_to_clients', 'visible_to_everyone', 'visible_to_specjalista', 'visible_to_anonymous',
    'border_width', 'opacity', 'custom_width', 'custom_height', 'max_width',
    'font_weight', 'line_height', 'letter_spacing',
    'overflow_behavior',
    'hover_background_color', 'background_image', 'hover_background_gradient',
    'background_image_position', 'background_gradient', 'background_image_size',
    'border_color', 'border_style', 'box_shadow',
    'icon_name', 'width_type', 'icon_position', 'height_type',
    'hover_text_color', 'icon_color', 'hover_border_color',
    'content_direction', 'content_wrap', 'text_transform', 'display_type',
    'section_margin_bottom', 'section_margin_top', 'gap',
    'align_items', 'justify_content', 'hover_box_shadow',
    'background_image_opacity', 'icon_size', 'show_icon', 'min_height',
    'hover_opacity', 'hover_scale', 'hover_transition_duration',
    // Added columns from the migration
    'background_color', 'text_color', 'font_size', 'alignment', 
    'padding', 'margin', 'border_radius', 'style_class',
    // Default expanded toggle
    'default_expanded'
  ] as const;
  type SectionDbField = typeof SECTION_DB_FIELDS[number];

  const sanitizeSectionPayload = (src: Record<string, any>) => {
    const payload: Record<string, any> = {};

    const intFields = new Set<SectionDbField>([
      'position','border_width','opacity','custom_width','custom_height','max_width',
      'font_weight','gap','section_margin_top','section_margin_bottom','min_height',
      'hover_transition_duration','background_image_opacity','icon_size','hover_opacity',
      // Added integer fields from the migration
      'font_size', 'padding', 'margin', 'border_radius'
    ]);
    const numericFields = new Set<SectionDbField>(['line_height','letter_spacing','hover_scale']);

    for (const key of SECTION_DB_FIELDS) {
      if (src[key] !== undefined) {
        let v = src[key];
        if (typeof v === 'string') v = v.trim();
        if (v === '') v = null;
        if (v !== null) {
          if (intFields.has(key)) {
            const n = Number(v);
            v = Number.isFinite(n) ? Math.round(n) : null;
          } else if (numericFields.has(key)) {
            const n = Number(v);
            v = Number.isFinite(n) ? n : null;
          }
        }
        payload[key] = v;
      }
    }
    return payload;
  };

  // User management functions
  const fetchUsers = async () => {
    if (activeTab !== 'users') return;
    
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_profiles_with_confirmation');

      if (error) throw error;
      console.log('fetchUsers RPC result:', { count: data?.length, sample: data?.[0] });
      
      // Map RPC response to UserProfile interface
      const mappedUsers: UserProfile[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.id, // RPC returns id which is the user_id
        email: row.email,
        role: row.role,
        first_name: row.first_name,
        last_name: row.last_name,
        eq_id: row.eq_id,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.created_at, // Use created_at as fallback
        email_confirmed_at: row.email_confirmed_at,
        guardian_approved: row.guardian_approved,
        admin_approved: row.is_approved, // RPC returns is_approved
        email_activated: !!row.email_confirmed_at,
        // Extended profile data
        phone_number: row.phone_number,
        street_address: row.street_address,
        postal_code: row.postal_code,
        city: row.city,
        country: row.country,
        specialization: row.specialization,
        profile_description: row.profile_description,
        upline_first_name: row.upline_first_name,
        upline_last_name: row.upline_last_name,
        upline_eq_id: row.upline_eq_id,
      }));
      
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('toast.error'),
        description: t('error.loadClients'),
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'client' | 'admin' | 'partner' | 'specjalista') => {
    try {
      const normalizedRole = (newRole || 'user').toLowerCase() as 'user' | 'client' | 'admin' | 'partner' | 'specjalista';

      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        target_role: normalizedRole,
      });

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: normalizedRole } : user
      ));
      
      toast({
        title: "Sukces",
        description: `Rola klienta została zmieniona na ${getRoleDisplayName(normalizedRole)}.`,
      });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('error.changeRole'),
        variant: "destructive",
      });
    }
  };

  const confirmUserEmail = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_confirm_user_email', {
        target_user_id: userId
      });

      if (error) {
        throw error;
      }

      if (data) {
        toast({
          title: t('toast.success'),
          description: t('success.emailConfirmed'),
        });
        // Refresh users list to show updated status
        fetchUsers();
      } else {
        toast({
          title: t('toast.info'),
          description: t('success.emailAlreadyConfirmed'),
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error confirming user email:', error);
      toast({
        title: t('toast.error'),
        description: t('error.confirmEmail'),
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`${t('admin.confirmDeleteUser')} ${userEmail}?`)) {
      return;
    }

    try {
      setDeleteLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });

      if (error) throw error;

      toast({
        title: t('toast.success'),
        description: t('admin.deleteUserSuccess'),
      });

      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('admin.deleteUserError'),
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.rpc('admin_toggle_user_status', {
        target_user_id: userId,
        new_status: !currentStatus
      });

      if (error) throw error;

      if (data) {
        setUsers(users.map(user => 
          user.user_id === userId ? { ...user, is_active: !currentStatus } : user
        ));
        
        toast({
          title: "Sukces",
          description: `Klient został ${!currentStatus ? 'aktywowany' : 'dezaktywowany'}.`,
        });
      }
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('error.changeStatus'),
        variant: "destructive",
      });
    }
  };

  const adminApproveUser = async (userId: string, bypassGuardian: boolean = false) => {
    try {
      const { data, error } = await supabase.rpc('admin_approve_user', {
        target_user_id: userId,
        bypass_guardian: bypassGuardian
      });

      if (error) throw error;

      if (data) {
        const userToApprove = users.find(u => u.user_id === userId);
        
        setUsers(users.map(user => 
          user.user_id === userId ? { 
            ...user, 
            guardian_approved: bypassGuardian ? true : user.guardian_approved,
            guardian_approved_at: bypassGuardian ? new Date().toISOString() : user.guardian_approved_at,
            admin_approved: true, 
            admin_approved_at: new Date().toISOString() 
          } : user
        ));

        // Send welcome email via SMTP
        if (userToApprove) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
              body: {
                userId: userId,
                email: userToApprove.email,
                firstName: userToApprove.first_name,
                lastName: userToApprove.last_name,
                role: userToApprove.role
              }
            });
            
            if (emailError) {
              console.error('Failed to send welcome email:', emailError);
            } else {
              console.log('Welcome email sent successfully to:', userToApprove.email);
            }
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
          }
        }
        
        toast({
          title: "Sukces",
          description: bypassGuardian 
            ? "Użytkownik został zatwierdzony z pominięciem opiekuna."
            : "Użytkownik został zatwierdzony przez administratora.",
        });
      }
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: t('toast.error'),
        description: error.message || 'Nie udało się zatwierdzić użytkownika.',
        variant: "destructive",
      });
    }
  };

  // Fetch email templates for bulk actions
  const fetchEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
    }
  };

  // Bulk user actions
  const handleUserSelectionChange = (userId: string, selected: boolean) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const clearUserSelection = () => {
    setSelectedUserIds(new Set());
  };

  const handleBulkApprove = async () => {
    const selectedIds = Array.from(selectedUserIds);
    let successCount = 0;
    
    for (const userId of selectedIds) {
      try {
        const { data, error } = await supabase.rpc('admin_approve_user', {
          target_user_id: userId,
          bypass_guardian: true
        });
        
        if (!error && data) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error approving user ${userId}:`, error);
      }
    }
    
    if (successCount > 0) {
      toast({
        title: "Sukces",
        description: `Zatwierdzono ${successCount} z ${selectedIds.length} użytkowników.`,
      });
      await fetchUsers();
      clearUserSelection();
    }
  };

  const handleBulkChangeRole = async (role: 'user' | 'client' | 'admin' | 'partner' | 'specjalista') => {
    const selectedIds = Array.from(selectedUserIds);
    let successCount = 0;
    
    for (const userId of selectedIds) {
      try {
        const { data, error } = await supabase.rpc('admin_update_user_role', {
          target_user_id: userId,
          target_role: role
        });
        
        if (!error && data) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error changing role for user ${userId}:`, error);
      }
    }
    
    if (successCount > 0) {
      toast({
        title: "Sukces",
        description: `Zmieniono rolę ${successCount} z ${selectedIds.length} użytkowników.`,
      });
      await fetchUsers();
      clearUserSelection();
    }
  };

  const handleBulkSendEmail = async (templateId: string) => {
    const selectedIds = Array.from(selectedUserIds);
    let successCount = 0;
    
    for (const userId of selectedIds) {
      try {
        const { error } = await supabase.functions.invoke('send-single-email', {
          body: {
            template_id: templateId,
            recipient_user_id: userId
          }
        });
        
        if (!error) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending email to user ${userId}:`, error);
      }
    }
    
    toast({
      title: successCount > 0 ? "Sukces" : "Błąd",
      description: `Wysłano email do ${successCount} z ${selectedIds.length} użytkowników.`,
      variant: successCount > 0 ? "default" : "destructive",
    });
    clearUserSelection();
  };

  const resetUserPassword = (userEmail: string) => {
    setResetPasswordData({
      userEmail: userEmail,
      newPassword: ''
    });
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 8) {
      toast({
        title: t('toast.error'),
        description: 'Hasło musi mieć co najmniej 8 znaków',
        variant: "destructive",
      });
      return;
    }
    
    try {
      setPasswordLoading(true);
      
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          user_email: resetPasswordData.userEmail,
          new_password: resetPasswordData.newPassword,
          admin_name: user?.email || 'Administrator'
        }
      });

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Nowe hasło zostało ustawione i wysłane na adres ${resetPasswordData.userEmail}`,
      });
      
      setShowResetPasswordDialog(false);
      setResetPasswordData({ userEmail: '', newPassword: '' });
    } catch (error: any) {
      console.error('Error resetting user password:', error);
      toast({
        title: t('toast.error'),
        description: error.message || 'Nie udało się zresetować hasła',
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      toast({
        title: t('toast.error'),
        description: t('error.currentPassword'),
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('toast.error'),
        description: t('error.passwordMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: t('toast.error'), 
        description: t('error.passwordLength'),
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (signInError) {
        toast({
          title: t('toast.error'),
          description: t('error.incorrectPassword'),
          variant: "destructive",
        });
        return;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: t('toast.success'),
        description: t('success.passwordChanged'),
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('error.changePassword'),
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Create new user function
  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: t('toast.error'),
        description: t('error.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: t('toast.error'),
        description: t('error.passwordLength'),
        variant: "destructive",
      });
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (error) throw error;

      if (data.user) {
        // Update the user role if admin, partner, or specjalista
        if (newUser.role === 'admin' || newUser.role === 'partner' || newUser.role === 'specjalista') {
          const normalizedRole = (newUser.role || 'user').toLowerCase() as 'user' | 'client' | 'admin' | 'partner' | 'specjalista';
          const { data: rpcData, error: roleError } = await supabase.rpc('admin_update_user_role', {
            target_user_id: data.user.id,
            target_role: normalizedRole,
          });

          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }

        setNewUser({ email: '', password: '', role: 'user' });
        setShowCreateUserDialog(false);
        fetchUsers(); // Refresh users list

        toast({
          title: "Sukces",
          description: `Klient ${newUser.email} został utworzony.`,
        });
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: t('toast.error'),
        description: error.message || t('error.createClient'),
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  // Header text management functions
  const fetchHeaderText = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_texts')
        .select('content, text_formatting')
        .eq('type', 'header_text')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching header text:', error);
        return;
      }
      
      if (data) {
        setHeaderText(data.content || '');
        setHeaderTextFormatting(data.text_formatting || null);
      } else {
        // If no header text exists, set the default text from Index.tsx
        const defaultHeaderText = 'Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.';
        setHeaderText(defaultHeaderText);
        setHeaderTextFormatting(null);
      }
    } catch (error) {
      console.error('Error fetching header text:', error);
      // Set default text even on error
      const defaultHeaderText = 'Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.';
      setHeaderText(defaultHeaderText);
      setHeaderTextFormatting(null);
    }
  };

  const updateHeaderText = async (newText: string) => {
    try {
      setHeaderTextLoading(true);
      
      // Check if header text item exists
      const { data: existingItem } = await (supabase as any)
        .from('system_texts')
        .select('id')
        .eq('type', 'header_text')
        .eq('is_active', true)
        .maybeSingle();

      if (existingItem) {
        // Update existing item
        const { error } = await (supabase as any)
          .from('system_texts')
          .update({ 
            content: newText,
            text_formatting: headerTextFormatting,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Create new header text item
        const { error } = await (supabase as any)
          .from('system_texts')
          .insert({
            type: 'header_text',
            content: newText,
            text_formatting: headerTextFormatting,
            is_active: true
          });

        if (error) throw error;
      }

      setHeaderText(newText);
      
      toast({
        title: "Sukces",
        description: "Tekst nagłówka został zaktualizowany",
      });
    } catch (error: any) {
      console.error('Error updating header text:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować tekstu nagłówka",
        variant: "destructive",
      });
    } finally {
      setHeaderTextLoading(false);
    }
  };

  // Author text management functions
  const fetchAuthorText = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_texts')
        .select('content, text_formatting')
        .eq('type', 'author')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching author text:', error);
        return;
      }
      
      if (data) {
        setAuthorText(data.content || '');
        setAuthorTextFormatting(data.text_formatting || null);
      } else {
        // If no author text exists, set the default text from Index.tsx
        const defaultAuthorText = 'Pozostałem - Dawid Kowalczyk';
        setAuthorText(defaultAuthorText);
        setAuthorTextFormatting(null);
      }
    } catch (error) {
      console.error('Error fetching author text:', error);
      // Set default text even on error
      const defaultAuthorText = 'Pozostałem - Dawid Kowalczyk';
      setAuthorText(defaultAuthorText);
      setAuthorTextFormatting(null);
    }
  };

  const updateAuthorText = async (newText: string) => {
    try {
      setAuthorTextLoading(true);
      
      // Check if author text item exists
      const { data: existingItem } = await (supabase as any)
        .from('system_texts')
        .select('id')
        .eq('type', 'author')
        .eq('is_active', true)
        .maybeSingle();

      if (existingItem) {
        // Update existing item
        const { error } = await (supabase as any)
          .from('system_texts')
          .update({ 
            content: newText,
            text_formatting: authorTextFormatting,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Create new author text item
        const { error } = await (supabase as any)
          .from('system_texts')
          .insert({
            type: 'author',
            content: newText,
            text_formatting: authorTextFormatting,
            is_active: true
          });

        if (error) throw error;
      }

      setAuthorText(newText);
      
      toast({
        title: "Sukces",
        description: "Tekst autora został zaktualizowany",
      });
    } catch (error: any) {
      console.error('Error updating author text:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować tekstu autora",
        variant: "destructive",
      });
     } finally {
       setAuthorTextLoading(false);
     }
   };


  // Logo management functions
  const loadSiteLogo = async () => {
    try {
      const { data: logoData } = await (supabase as any)
        .from('system_texts')
        .select('content')
        .eq('type', 'site_logo')
        .eq('is_active', true)
        .maybeSingle();
      
      if (logoData?.content) {
        setSiteLogo(logoData.content);
      } else {
        // Set default logo if none found
        setSiteLogo(newPureLifeLogo);
      }
    } catch (error) {
      console.error('Error fetching site logo:', error);
      setSiteLogo(newPureLifeLogo);
    }
  };

  const updateSiteLogo = async (logoUrl: string) => {
    try {
      setLogoLoading(true);
      
      // Check if logo setting exists
      const { data: existingLogo } = await (supabase as any)
        .from('system_texts')
        .select('id')
        .eq('type', 'site_logo')
        .eq('is_active', true)
        .maybeSingle();

      if (existingLogo) {
        // Update existing logo
        const { error } = await (supabase as any)
          .from('system_texts')
          .update({ 
            content: logoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLogo.id);

        if (error) throw error;
      } else {
        // Create new logo setting
        const { error } = await (supabase as any)
          .from('system_texts')
          .insert({
            type: 'site_logo',
            content: logoUrl,
            is_active: true
          });

        if (error) throw error;
      }

      setSiteLogo(logoUrl);
      setLogoUrl('');
      
      toast({
        title: "Sukces",
        description: "Logo zostało zaktualizowane",
      });
    } catch (error: any) {
      console.error('Error updating site logo:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować logo",
        variant: "destructive",
      });
    } finally {
      setLogoLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setLogoUploadLoading(true);

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(fileName);

      // Update logo in database
      await updateSiteLogo(publicUrl);
      
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przesłać logo",
        variant: "destructive",
      });
    } finally {
      setLogoUploadLoading(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Błąd",
          description: "Obsługiwane formaty: JPG, PNG, GIF, WEBP",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Błąd",
          description: "Rozmiar pliku nie może przekraczać 5MB",
          variant: "destructive",
        });
        return;
      }

      handleLogoUpload(file);
    }
  };

  // Header image management functions
  const loadHeaderImage = async () => {
    try {
      const { data: headerImageData } = await (supabase as any)
        .from('system_texts')
        .select('content')
        .eq('type', 'header_image')
        .eq('is_active', true)
        .maybeSingle();
      
      if (headerImageData?.content) {
        setHeaderImage(headerImageData.content);
      } else {
        // Set default header image if none found
        setHeaderImage('/src/assets/logo-niezbednika-pure-life.png');
      }
    } catch (error) {
      console.error('Error fetching header image:', error);
      setHeaderImage('/src/assets/logo-niezbednika-pure-life.png');
    }
  };

  const updateHeaderImage = async (imageUrl: string) => {
    try {
      setHeaderImageLoading(true);
      
      // Check if header image setting exists
      const { data: existingHeaderImage } = await (supabase as any)
        .from('system_texts')
        .select('id')
        .eq('type', 'header_image')
        .eq('is_active', true)
        .maybeSingle();

      if (existingHeaderImage) {
        // Update existing header image
        const { error } = await (supabase as any)
          .from('system_texts')
          .update({ 
            content: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingHeaderImage.id);

        if (error) throw error;
      } else {
        // Create new header image setting
        const { error } = await (supabase as any)
          .from('system_texts')
          .insert({
            type: 'header_image',
            content: imageUrl,
            is_active: true
          });

        if (error) throw error;
      }

      setHeaderImage(imageUrl);
      setHeaderImageUrl('');
      
      toast({
        title: "Sukces",
        description: "Zdjęcie nagłówka zostało zaktualizowane",
      });
    } catch (error: any) {
      console.error('Error updating header image:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować zdjęcia nagłówka",
        variant: "destructive",
      });
    } finally {
      setHeaderImageLoading(false);
    }
  };

  const handleHeaderImageUpload = async (file: File) => {
    try {
      setHeaderImageUploadLoading(true);

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `header-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(fileName);

      // Update header image in database
      await updateHeaderImage(publicUrl);
      
    } catch (error: any) {
      console.error('Error uploading header image:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przesłać zdjęcia nagłówka",
        variant: "destructive",
      });
    } finally {
      setHeaderImageUploadLoading(false);
    }
  };

  const handleHeaderImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Błąd",
          description: "Obsługiwane formaty: JPG, PNG, GIF, WEBP",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Błąd",
          description: "Rozmiar pliku nie może przekraczać 5MB",
          variant: "destructive",
        });
        return;
      }

      handleHeaderImageUpload(file);
    }
  };

  // Header image size management
  const loadHeaderImageSize = async () => {
    try {
      const { data } = await supabase
        .from('system_texts')
        .select('content')
        .eq('type', 'header_image_size')
        .eq('is_active', true)
        .maybeSingle();
      
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          setHeaderImageSize(parsed.size || 'medium');
          setHeaderImageCustomWidth(parsed.customWidth || 128);
          setHeaderImageCustomHeight(parsed.customHeight || 128);
        } catch {
          // Invalid JSON, use defaults
        }
      }
      // Mark as initialized after loading to prevent immediate auto-save
      setTimeout(() => {
        headerImageSizeInitialized.current = true;
      }, 1500);
    } catch (error) {
      console.error('Error fetching header image size:', error);
    }
  };

  const saveHeaderImageSize = useCallback(async (sizeData: { size: string; customWidth: number; customHeight: number }) => {
    try {
      setHeaderImageLoading(true);
      
      const sizeSettings = JSON.stringify(sizeData);
      
      const { data: existing } = await supabase
        .from('system_texts')
        .select('id')
        .eq('type', 'header_image_size')
        .eq('is_active', true)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('system_texts')
          .update({ content: sizeSettings, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('system_texts')
          .insert({ type: 'header_image_size', content: sizeSettings, is_active: true });
      }

      toast({
        title: "Zapisano",
        description: "Rozmiar zdjęcia nagłówka został zaktualizowany",
      });
    } catch (error: any) {
      console.error('Error updating header image size:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować rozmiaru",
        variant: "destructive",
      });
    } finally {
      setHeaderImageLoading(false);
    }
  }, [toast]);

  // Auto-save header image size when values change
  useEffect(() => {
    if (!headerImageSizeInitialized.current) return;
    
    // Compare with previous value to prevent unnecessary saves
    const currentValue = JSON.stringify(debouncedHeaderImageSize);
    if (prevHeaderSizeRef.current === currentValue) return;
    
    prevHeaderSizeRef.current = currentValue;
    saveHeaderImageSize(debouncedHeaderImageSize);
  }, [debouncedHeaderImageSize, saveHeaderImageSize]);

  // Page Settings (Favicon & OG Image) Management
  const loadPageSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('page_settings')
        .select('favicon_url, og_image_url')
        .eq('page_type', 'homepage')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setFaviconUrl(data.favicon_url || '');
        setOgImageUrl(data.og_image_url || '');
      }
    } catch (error) {
      console.error('Error loading page settings:', error);
    }
  };

  const updatePageSettings = async (updates: { favicon_url?: string; og_image_url?: string }) => {
    try {
      const { data: existing } = await supabase
        .from('page_settings')
        .select('id')
        .eq('page_type', 'homepage')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('page_settings')
          .update(updates)
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('page_settings')
          .insert({
            page_type: 'homepage',
            ...updates
          });
        
        if (error) throw error;
      }

      toast({
        title: "Sukces",
        description: "Ustawienia zostały zaktualizowane",
      });
    } catch (error: any) {
      console.error('Error updating page settings:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować ustawień",
        variant: "destructive",
      });
    }
  };

  const updateFavicon = async (url: string) => {
    try {
      setFaviconLoading(true);
      await updatePageSettings({ favicon_url: url });
      setFaviconUrl(url);
      setFaviconUrlInput('');
    } finally {
      setFaviconLoading(false);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    try {
      setFaviconUploadLoading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `favicon-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(fileName);

      await updateFavicon(publicUrl);
      
    } catch (error: any) {
      console.error('Error uploading favicon:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przesłać favicon",
        variant: "destructive",
      });
    } finally {
      setFaviconUploadLoading(false);
    }
  };

  const handleFaviconFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/x-icon', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Błąd",
          description: "Obsługiwane formaty: ICO, PNG, SVG",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "Błąd",
          description: "Rozmiar pliku nie może przekraczać 1MB",
          variant: "destructive",
        });
        return;
      }

      handleFaviconUpload(file);
    }
  };

  const updateOgImage = async (url: string) => {
    try {
      setOgImageLoading(true);
      await updatePageSettings({ og_image_url: url });
      setOgImageUrl(url);
      setOgImageUrlInput('');
    } finally {
      setOgImageLoading(false);
    }
  };

  const handleOgImageUpload = async (file: File) => {
    try {
      setOgImageUploadLoading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `og-image-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cms-images')
        .getPublicUrl(fileName);

      await updateOgImage(publicUrl);
      
    } catch (error: any) {
      console.error('Error uploading OG image:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przesłać obrazu OG",
        variant: "destructive",
      });
    } finally {
      setOgImageUploadLoading(false);
    }
  };

  const handleOgImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Błąd",
          description: "Obsługiwane formaty: JPG, PNG, GIF, WEBP",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Błąd",
          description: "Rozmiar pliku nie może przekraczać 5MB",
          variant: "destructive",
        });
        return;
      }

      handleOgImageUpload(file);
    }
  };

  // Sort and filter users function
  const filteredAndSortedUsers = useMemo(() => {
    // First filter by tab
    let filtered = users.filter((user) => {
      if (userFilterTab === 'active') {
        // Fully approved: email_activated && guardian_approved && admin_approved && is_active
        return user.email_activated && user.guardian_approved && user.admin_approved && user.is_active;
      } else if (userFilterTab === 'pending') {
        // Pending: missing email_activated, guardian_approved, admin_approved, or not active
        return !user.email_activated || !user.guardian_approved || !user.admin_approved || !user.is_active;
      }
      return true; // 'all'
    });
    
    // Then filter by search
    filtered = filtered.filter((user) => {
      if (!userSearchQuery) return true;
      const searchLower = userSearchQuery.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
        (user.eq_id && user.eq_id.toLowerCase().includes(searchLower))
      );
    });
    
    // Then sort
    return filtered.sort((a, b) => {
      let aValue: any = a[userSortBy];
      let bValue: any = b[userSortBy];

      if (userSortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (userSortBy === 'is_active') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      } else if (typeof aValue === 'string') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (userSortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [users, userSearchQuery, userSortBy, userSortOrder, userFilterTab]);
  
  // Count users by status for tab badges
  const userCounts = useMemo(() => {
    const pending = users.filter(u => !u.email_activated || !u.guardian_approved || !u.admin_approved || !u.is_active).length;
    const active = users.filter(u => u.email_activated && u.guardian_approved && u.admin_approved && u.is_active).length;
    return { pending, active, all: users.length };
  }, [users]);

  // Export functions
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'partner': return 'Partner';
      case 'specjalista': return 'Specjalista';
      case 'user':
      case 'client':
      default: return 'Klient';
    }
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Lista Klientów', 20, 20);
    
    let yPosition = 40;
    doc.setFontSize(12);
    
    users.forEach((user, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${index + 1}. Email: ${user.email}`, 20, yPosition);
      doc.text(`   Rola: ${getRoleDisplayName(user.role)}`, 20, yPosition + 10);
      doc.text(`   Status: ${user.is_active ? 'Aktywny' : 'Nieaktywny'}`, 20, yPosition + 20);
      doc.text(`   Utworzono: ${new Date(user.created_at).toLocaleDateString('pl-PL')}`, 20, yPosition + 30);
      yPosition += 45;
    });
    
    doc.save('klienci.pdf');
  };

  const exportToXLSX = async () => {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(
      users.map(user => ({
        Email: user.email,
        'Imię': user.first_name || '',
        'Nazwisko': user.last_name || '',
        'EQ ID': user.eq_id || '',
        Rola: getRoleDisplayName(user.role),
        Status: user.is_active ? 'Aktywny' : 'Nieaktywny',
        'Data utworzenia': new Date(user.created_at).toLocaleDateString('pl-PL'),
        'Email potwierdzony': user.email_confirmed_at ? 'Tak' : 'Nie',
        ID: user.user_id
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Klienci');
    XLSX.writeFile(workbook, 'klienci.xlsx');
  };

  const exportToXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<users>\n';
    
    users.forEach(user => {
      xml += '  <user>\n';
      xml += `    <email>${user.email}</email>\n`;
      xml += `    <role>${user.role}</role>\n`;
      xml += `    <is_active>${user.is_active}</is_active>\n`;
      xml += `    <created_at>${user.created_at}</created_at>\n`;
      xml += `    <email_confirmed>${user.email_confirmed_at ? 'true' : 'false'}</email_confirmed>\n`;
      xml += `    <user_id>${user.user_id}</user_id>\n`;
      xml += '  </user>\n';
    });
    
    xml += '</users>';
    
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uzytkownicy.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToZIP = async () => {
    const [{ default: JSZip }, { default: jsPDF }, XLSX] = await Promise.all([
      import('jszip'),
      import('jspdf'),
      import('xlsx'),
    ]);
    
    const zip = new JSZip();
    
    // Add PDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Lista Użytkowników', 20, 20);
    
    let yPosition = 40;
    doc.setFontSize(12);
    
    users.forEach((user, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${index + 1}. Email: ${user.email}`, 20, yPosition);
      doc.text(`   Rola: ${user.role === 'admin' ? 'Administrator' : 'Użytkownik'}`, 20, yPosition + 10);
      doc.text(`   Status: ${user.is_active ? 'Aktywny' : 'Nieaktywny'}`, 20, yPosition + 20);
      doc.text(`   Utworzono: ${new Date(user.created_at).toLocaleDateString('pl-PL')}`, 20, yPosition + 30);
      yPosition += 45;
    });
    
    const pdfBlob = doc.output('blob');
    zip.file('uzytkownicy.pdf', pdfBlob);
    
    // Add XLSX
    const worksheet = XLSX.utils.json_to_sheet(
      users.map(user => ({
        Email: user.email,
        Rola: user.role === 'admin' ? 'Administrator' : 'Użytkownik',
        Status: user.is_active ? 'Aktywny' : 'Nieaktywny',
        'Data utworzenia': new Date(user.created_at).toLocaleDateString('pl-PL'),
        'Email potwierdzony': user.email_confirmed_at ? 'Tak' : 'Nie',
        ID: user.user_id
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Użytkownicy');
    const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    zip.file('uzytkownicy.xlsx', xlsxBuffer);
    
    // Add XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<users>\n';
    
    users.forEach(user => {
      xml += '  <user>\n';
      xml += `    <email>${user.email}</email>\n`;
      xml += `    <role>${user.role}</role>\n`;
      xml += `    <is_active>${user.is_active}</is_active>\n`;
      xml += `    <created_at>${user.created_at}</created_at>\n`;
      xml += `    <email_confirmed>${user.email_confirmed_at ? 'true' : 'false'}</email_confirmed>\n`;
      xml += `    <user_id>${user.user_id}</user_id>\n`;
      xml += '  </user>\n';
    });
    
    xml += '</users>';
    zip.file('uzytkownicy.xml', xml);
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uzytkownicy.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'content' && isAdmin) {
      fetchHeaderText();
      fetchAuthorText();
    }
     if (activeTab === 'settings' && isAdmin) {
       loadSiteLogo();
       loadHeaderImage();
       loadHeaderImageSize();
       loadPageSettings();
     }
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
      fetchEmailTemplates();
    }
    if (activeTab === 'pages' && isAdmin) {
      fetchPages();
    }
  }, [activeTab, isAdmin]);

  // Also fetch header text on component mount if we're on content tab
  useEffect(() => {
    if (isAdmin && activeTab === 'content') {
      fetchHeaderText();
      fetchAuthorText();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Wait for auth to complete before checking user state
    if (authLoading || !rolesReady) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchData();
  }, [user, authLoading, rolesReady, isAdmin, navigate, toast]);

  const fetchData = async () => {
    try {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .order('position');

      if (sectionsError) throw sectionsError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*, text_formatting, title_formatting')
        .order('position');

      if (itemsError) throw itemsError;

      setSections(convertSupabaseSections(sectionsData || []));
      setItems((itemsData || []).map((item: any) => ({
        ...item,
        cells: Array.isArray(item.cells) ? item.cells : (item.cells ? JSON.parse(JSON.stringify(item.cells)) : [])
      })));
    } catch (error) {
      console.error('Error fetching CMS data:', error);
      toast({
        title: t('toast.error'),
        description: t('error.loadCMS'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSection = async () => {
    try {
      const maxPosition = Math.max(...sections.map(s => s.position), 0);
      
      const payload = sanitizeSectionPayload({
        ...newSection,
        title: newSection.title,
        position: maxPosition + 1,
      });

      const { data, error } = await supabase
        .from('cms_sections')
        .insert(payload as any)
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, convertSupabaseSection(data)]);
      setNewSection({ 
        title: '', 
        position: 0,
        visible_to_partners: false,
        visible_to_clients: false,
        visible_to_everyone: true,
        visible_to_specjalista: false,
        visible_to_anonymous: false,
        // Reset styling defaults - modern card design
        background_color: '#ffffff',
        text_color: '#ffffff',
        font_size: 20,
        alignment: 'center' as const,
        padding: 32,
        margin: 8,
        border_radius: 16,
        style_class: '',
        background_gradient: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
        border_width: 0,
        border_color: 'hsl(var(--border))',
        border_style: 'solid' as const,
        box_shadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        opacity: 100,
        width_type: 'full' as const,
        custom_width: 600,
        height_type: 'auto' as const,
        custom_height: 200,
        max_width: 1200,
        font_weight: 600,
        line_height: 1.5,
        letter_spacing: 0,
        text_transform: 'none' as const,
        display_type: 'block' as const,
        justify_content: 'center' as const,
        align_items: 'center' as const,
        gap: 16,
        // Reset new enhanced defaults
        section_margin_top: 16,
        section_margin_bottom: 16,
        background_image: '',
        background_image_opacity: 100,
        background_image_position: 'center',
        background_image_size: 'cover',
        icon_name: '',
        icon_position: 'left',
        icon_size: 24,
        icon_color: '#ffffff',
        show_icon: false,
        content_direction: 'column',
        content_wrap: 'nowrap',
        min_height: 200,
        overflow_behavior: 'visible',
        hover_transition_duration: 300,
      });
      toast({
        title: t('toast.success'),
        description: t('success.sectionCreated'),
      });
    } catch (error) {
      console.error('Error creating section:', error);
      toast({
        title: t('toast.error'),
        description: t('error.createSection'),
        variant: "destructive",
      });
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      // Mark items in the section as inactive instead of deleting
      const { error: itemsError } = await supabase
        .from('cms_items')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('section_id', sectionId);

      if (itemsError) throw itemsError;

      // Mark the section as inactive instead of deleting
      const { error: sectionError } = await supabase
        .from('cms_sections')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', sectionId);

      if (sectionError) throw sectionError;

      setSections(sections.filter(s => s.id !== sectionId));
      setItems(items.filter(i => i.section_id !== sectionId));
      toast({
        title: t('toast.success'),
        description: 'Sekcja została oznaczona jako nieaktywna',
      });
    } catch (error) {
      console.error('Error deactivating section:', error);
      toast({
        title: t('toast.error'),
        description: t('error.deleteSection'),
        variant: "destructive",
      });
    }
  };

  const moveSectionUp = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0) return;

    const currentSection = sections[sectionIndex];
    const previousSection = sections[sectionIndex - 1];

    try {
      // Swap positions in database
      await Promise.all([
        supabase
          .from('cms_sections')
          .update({ position: previousSection.position })
          .eq('id', currentSection.id),
        supabase
          .from('cms_sections')
          .update({ position: currentSection.position })
          .eq('id', previousSection.id)
      ]);

      // Re-fetch data to ensure consistency
      await fetchData();
      
      toast({
        title: t('toast.positionChanged'),
        description: t('success.sectionMovedUp'),
      });
    } catch (error) {
      console.error('Error moving section up:', error);
      toast({
        title: t('toast.error'),
        description: t('error.changeSectionPosition'),
        variant: "destructive",
      });
    }
  };

  const moveSectionDown = async (sectionId: string) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= sections.length - 1) return;

    const currentSection = sections[sectionIndex];
    const nextSection = sections[sectionIndex + 1];

    try {
      // Swap positions in database
      await Promise.all([
        supabase
          .from('cms_sections')
          .update({ position: nextSection.position })
          .eq('id', currentSection.id),
        supabase
          .from('cms_sections')
          .update({ position: currentSection.position })
          .eq('id', nextSection.id)
      ]);

      // Re-fetch data to ensure consistency
      await fetchData();
      
      toast({
        title: t('toast.positionChanged'), 
        description: t('success.sectionMovedDown'),
      });
    } catch (error) {
      console.error('Error moving section down:', error);
      toast({
        title: t('toast.error'),
        description: t('error.changeSectionPosition'),
        variant: "destructive",
      });
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<CMSSection>) => {
    try {
      const payload = sanitizeSectionPayload(updates as Record<string, any>);
      const { error } = await supabase
        .from('cms_sections')
        .update(payload as any)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(s => s.id === sectionId ? { ...s, ...payload } : s));
      setEditingSection(null);
      toast({
        title: t('toast.success'),
        description: t('success.sectionUpdated'),
      });
    } catch (error) {
      console.error('Error updating section:', error);
      toast({
        title: t('toast.error'),
        description: t('error.updateSection'),
        variant: "destructive",
      });
    }
  };

  const createItem = async (sectionId: string) => {
    try {
      // Get page_id from the section
      const section = sections.find(s => s.id === sectionId);
      if (!section?.page_id) {
        toast({
          title: t('toast.error'),
          description: 'Sekcja nie ma przypisanej strony',
          variant: "destructive",
        });
        return;
      }

      const maxPosition = Math.max(...items.filter(i => i.section_id === sectionId).map(i => i.position), 0);
      
      console.log('Creating item with formatting:', {
        title_formatting: newItemTitleStyle,
        text_formatting: newItemTextStyle,
        item: newItem
      });

      const { data, error } = await supabase
        .from('cms_items')
        .insert({
          page_id: section.page_id,
          section_id: sectionId,
          ...newItem,
          position: maxPosition + 1,
          title_formatting: newItemTitleStyle,
          text_formatting: newItemTextStyle,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([...items, convertDatabaseItemToCMSItem(data)]);
      setNewItem({ 
        type: 'button', 
        title: '', 
        description: '', 
        url: '', 
        icon: '',
        media_url: '',
        media_type: '' as 'image' | 'video' | 'document' | 'audio' | 'other' | '',
        media_alt_text: '',
      });
      setNewItemTitleStyle(null);
      setNewItemTextStyle(null);
      setNewItemTitleMode(false);
      setNewItemTextMode(false);
      toast({
        title: t('toast.success'),
        description: t('success.elementAdded'),
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: t('toast.error'),
        description: t('error.addElement'),
        variant: "destructive",
      });
    }
  };

  const updateItem = async (itemId: string, updates: Partial<CMSItem>) => {
    try {
      console.log('Updating item with data:', updates);
      
      const { error } = await supabase
        .from('cms_items')
        .update({
          ...updates,
          font_weight: updates.font_weight ? Number(updates.font_weight) : undefined,
          cells: updates.cells ? convertCellsToDatabase(updates.cells) : undefined
        })
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(i => i.id === itemId ? { ...i, ...updates } : i));
      setEditingItem(null);
      toast({
        title: t('toast.success'),
        description: t('success.elementUpdated'),
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: t('toast.error'),
        description: t('error.updateElement'),
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      // Mark item as inactive instead of deleting
      const { error } = await supabase
        .from('cms_items')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      toast({
        title: t('toast.success'),
        description: 'Element został oznaczony jako nieaktywny',
      });
    } catch (error) {
      console.error('Error deactivating item:', error);
      toast({
        title: t('toast.error'),
        description: t('error.deleteElement'),
        variant: "destructive",
      });
    }
  };

  // Pages management functions
  const fetchPages = async () => {
    if (activeTab !== 'pages') return;
    
    setPagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Fetch pages error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać stron.",
        variant: "destructive",
      });
    } finally {
      setPagesLoading(false);
    }
  };

  const createPage = async () => {
    try {
      const maxPosition = Math.max(...pages.map(p => p.position), 0);
      
      const slug = newPage.slug || newPage.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data, error } = await supabase
        .from('pages')
        .insert([{
          title: newPage.title,
          slug: slug,
          content: newPage.content,
          content_formatting: pageContentStyle,
          meta_title: newPage.meta_title,
          meta_description: newPage.meta_description,
          is_published: newPage.is_published,
          position: maxPosition + 1,
          visible_to_partners: newPage.visible_to_partners,
          visible_to_clients: newPage.visible_to_clients,
          visible_to_everyone: newPage.visible_to_everyone,
          visible_to_specjalista: newPage.visible_to_specjalista,
          visible_to_anonymous: newPage.visible_to_anonymous,
        }])
        .select()
        .single();

      if (error) throw error;

      setPages([...pages, data]);
      setNewPage({
        title: '',
        slug: '',
        content: '',
        meta_title: '',
        meta_description: '',
        is_published: false,
        position: 0,
        visible_to_partners: false,
        visible_to_clients: false,
        visible_to_everyone: true,
        visible_to_specjalista: false,
        visible_to_anonymous: false,
      });
      
      toast({
        title: t('toast.pageCreated'),
        description: t('success.pageCreated'),
      });
    } catch (error) {
      console.error('Create page error:', error);
      toast({
        title: t('toast.error'),
        description: t('error.createPage'),
        variant: "destructive",
      });
    }
  };

  const updatePageVisibility = async (pageId: string, visibilityUpdates: { visible_to_partners?: boolean; visible_to_clients?: boolean; visible_to_everyone?: boolean; visible_to_specjalista?: boolean; visible_to_anonymous?: boolean }) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update(visibilityUpdates)
        .eq('id', pageId);

      if (error) throw error;

      setPages(pages.map(page => 
        page.id === pageId 
          ? { ...page, ...visibilityUpdates }
          : page
      ));

      toast({
        title: t('toast.visibilityUpdated'),
        description: t('success.pageVisibilityUpdated'),
      });
    } catch (error) {
      console.error('Update page visibility error:', error);
      toast({
        title: t('toast.error'),
        description: t('error.updatePageVisibility'),
        variant: "destructive",
      });
    }
  };

  const updateSectionVisibility = async (sectionId: string, visibilityUpdates: { visible_to_partners?: boolean; visible_to_clients?: boolean; visible_to_everyone?: boolean; visible_to_specjalista?: boolean; visible_to_anonymous?: boolean }) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update(visibilityUpdates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(section => 
        section.id === sectionId 
          ? { ...section, ...visibilityUpdates }
          : section
      ));

      toast({
        title: t('toast.visibilityUpdated'),
        description: "Ustawienia widoczności sekcji zostały zaktualizowane.",
      });
    } catch (error) {
      console.error('Update section visibility error:', error);
      toast({
        title: t('toast.error'),
        description: "Nie udało się zaktualizować widoczności sekcji.",
        variant: "destructive",
      });
    }
  };

  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', pageId);

      if (error) throw error;

      setPages(pages.map(page => 
        page.id === pageId ? { ...page, ...updates } : page
      ));
      setEditingPage(null);
      
      toast({
        title: t('toast.pageUpdated'),
        description: t('success.pageUpdated'),
      });
    } catch (error) {
      console.error('Update page error:', error);
      toast({
        title: t('toast.error'),
        description: t('error.updatePage'),
        variant: "destructive",
      });
    }
  };

  const deletePage = async (pageId: string) => {
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      setPages(pages.filter(page => page.id !== pageId));
      
      toast({
        title: t('toast.pageDeleted'),
        description: t('success.pageDeleted'),
      });
    } catch (error) {
      console.error('Delete page error:', error);
      toast({
        title: t('toast.error'),
        description: t('error.deletePage'),
        variant: "destructive",
      });
    }
  };

  // Page CMS management functions
  const fetchPageSections = async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageId)
        .is('parent_id', null) // Pobiera tylko sekcje główne (nie zagnieżdżone)
        .order('position', { ascending: true });

      if (error) throw error;
      setPageSections(convertSupabaseSections(data || []));

      // Pobierz sekcje zagnieżdżone dla każdej sekcji głównej
      const nestedSectionsData: {[key: string]: CMSSection[]} = {};
      for (const section of data || []) {
        const nestedSects = await fetchNestedSections(section.id);
        if (nestedSects.length > 0) {
          nestedSectionsData[section.id] = convertSupabaseSections(nestedSects);
        }
      }
      setNestedSections(nestedSectionsData);
    } catch (error) {
      console.error('Fetch page sections error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać sekcji strony.",
        variant: "destructive",
      });
    }
  };

  // Funkcja do pobierania sekcji zagnieżdżonych
  const fetchNestedSections = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('parent_id', parentId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Fetch nested sections error:', error);
      return [];
    }
  };

  const fetchPageItems = async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });

      if (error) throw error;
      setPageItems((data || []).map(convertDatabaseItemToCMSItem));
    } catch (error) {
      console.error('Fetch page items error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać elementów strony.",
        variant: "destructive",
      });
    }
  };

  const createPageSection = async (pageId: string, sectionData?: Partial<CMSSection>) => {
    try {
      const maxPosition = Math.max(...pageSections.map(s => s.position), 0);
      const payload = {
        ...(sanitizeSectionPayload({
          ...(sectionData || {}),
          title: sectionData?.title || newPageSection.title,
          position: maxPosition + 1,
        } as any)),
        page_id: pageId,
      } as any;

      const { data, error } = await supabase
        .from('cms_sections')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setPageSections([...pageSections, convertSupabaseSection(data)]);
      setNewPageSection({ title: '', position: 0 });
      setShowAddPageSectionEditor(false);
      
      toast({
        title: "Sekcja dodana",
        description: "Nowa sekcja została pomyślnie dodana do strony.",
      });
    } catch (error) {
      console.error('Create page section error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać sekcji.",
        variant: "destructive",
      });
    }
  };

  const createPageItem = async (pageId: string, sectionId: string) => {
    try {
      const sectionItems = pageItems.filter(item => item.section_id === sectionId);
      const maxPosition = Math.max(...sectionItems.map(item => item.position), 0);

      const { data, error } = await supabase
        .from('cms_items')
        .insert([{
          section_id: sectionId,
          page_id: pageId,
          type: newPageItem.type,
          title: newPageItem.title,
          description: newPageItem.description,
          url: newPageItem.url,
          icon: newPageItem.icon,
          position: maxPosition + 1,
          media_url: newPageItem.media_url,
          media_type: newPageItem.media_type || null,
          media_alt_text: newPageItem.media_alt_text,
          text_formatting: newPageItemTextStyle,
          title_formatting: newPageItemTitleStyle,
        }])
        .select()
        .single();

      if (error) throw error;

      setPageItems([...pageItems, convertDatabaseItemToCMSItem(data)]);
      setNewPageItem({
        type: 'button',
        title: '',
        description: '',
        url: '',
        icon: '',
        media_url: '',
        media_type: '',
        media_alt_text: '',
      });
      setNewPageItemTextStyle(null);
      setNewPageItemTitleStyle(null);
      setSelectedPageSection(null);
      
      toast({
        title: "Element dodany",
        description: "Nowy element został pomyślnie dodany.",
      });
    } catch (error) {
      console.error('Create page item error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać elementu.",
        variant: "destructive",
      });
    }
  };

  const updatePageSection = async (sectionId: string, updates: Partial<CMSSection>) => {
    try {
      const payload = sanitizeSectionPayload(updates as Record<string, any>);
      const { error } = await supabase
        .from('cms_sections')
        .update(payload as any)
        .eq('id', sectionId);

      if (error) throw error;

      setPageSections(pageSections.map(section => 
        section.id === sectionId ? { ...section, ...payload } : section
      ));
      setEditingPageSection(null);
      
      toast({
        title: "Sekcja zaktualizowana",
        description: "Sekcja została pomyślnie zaktualizowana.",
      });
    } catch (error) {
      console.error('Update page section error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować sekcji.",
        variant: "destructive",
      });
    }
  };

  const updatePageItem = async (itemId: string, updates: Partial<CMSItem>) => {
    try {
      console.log('🔵 updatePageItem called with:', { itemId, updates });
      
      const updateData = {
        ...updates,
        font_weight: updates.font_weight ? Number(updates.font_weight) : undefined,
        cells: updates.cells ? convertCellsToDatabase(updates.cells) : undefined
      };
      
      console.log('🔵 Sending to database:', updateData);
      
      const { error, data } = await supabase
        .from('cms_items')
        .update(updateData)
        .eq('id', itemId)
        .select();

      if (error) throw error;
      
      console.log('🟢 Database update successful:', data);

      setPageItems(pageItems.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ));
      setEditingPageItem(null);
      
      toast({
        title: "Element zaktualizowany",
        description: "Element został pomyślnie zaktualizowany.",
      });
    } catch (error) {
      console.error('Update page item error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować elementu.",
        variant: "destructive",
      });
    }
  };

  const deletePageSection = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      setPageSections(pageSections.filter(section => section.id !== sectionId));
      setPageItems(pageItems.filter(item => item.section_id !== sectionId));
      
      // Usuń sekcję zagnieżdżoną ze stanu jeśli była zagnieżdżona
      const updatedNestedSections = { ...nestedSections };
      Object.keys(updatedNestedSections).forEach(parentId => {
        updatedNestedSections[parentId] = updatedNestedSections[parentId].filter(
          nested => nested.id !== sectionId
        );
        if (updatedNestedSections[parentId].length === 0) {
          delete updatedNestedSections[parentId];
        }
      });
      setNestedSections(updatedNestedSections);
      
      toast({
        title: "Sekcja usunięta",
        description: "Sekcja i wszystkie jej elementy zostały usunięte.",
      });
    } catch (error) {
      console.error('Delete page section error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sekcji.",
        variant: "destructive",
      });
    }
  };

  const deletePageItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setPageItems(pageItems.filter(item => item.id !== itemId));
      
      toast({
        title: "Element usunięty",
        description: "Element został pomyślnie usunięty.",
      });
    } catch (error) {
      console.error('Delete page item error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć elementu.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={siteLogo || newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Layout Editor for specific page */}
      {editingPageInLayoutEditor && (
        <div className="min-h-screen bg-background">
          <LivePreviewEditor 
            pageId={editingPageInLayoutEditor.id} 
            pageTitle={editingPageInLayoutEditor.title}
            onClose={() => setEditingPageInLayoutEditor(null)}
          />
        </div>
      )}
      
      {/* Main Admin Panel */}
      {!editingPageInLayoutEditor && (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSignOut={handleSignOut}
          siteLogo={siteLogo}
        />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-10">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-lg font-semibold">{t('admin.title')}</h1>
              <div className="ml-auto">
                <AdminPresenceWidget admins={admins} currentUserPresence={currentUserPresence} isConnected={isConnected} />
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6 lg:p-8">
            {/* CMS Tabs - TabsList removed, navigation via sidebar */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          <TabsContent value="content">
            {/* Section Visibility Management - Simplified */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold">{t('admin.sectionManagement')}</h2>
                  <Button 
                    onClick={() => setActiveTab('layout')} 
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    <Type className="w-4 h-4 mr-2" />
                    Otwórz Layout Editor
                  </Button>
                </div>
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('admin.searchSections')}
                    value={sectionSearchQuery}
                    onChange={(e) => setSectionSearchQuery(e.target.value)}
                    className="pl-10 pr-20"
                  />
                  {sectionSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSectionSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      {t('admin.clearSearch')}
                    </Button>
                  )}
                </div>
                
                {/* Add Section Dialog - Simplified */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('admin.addSection')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle className="text-base sm:text-lg">{t('admin.addSection')}</DialogTitle>
                      <DialogDescription className="text-sm">
                        Utwórz nową sekcję - edycja treści w Layout Editor
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label htmlFor="section-title" className="text-sm font-medium">{t('admin.sectionTitle')}</Label>
                        <Input
                          id="section-title"
                          value={newSection.title}
                          onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                          placeholder="Nazwa sekcji"
                          className="mt-1 h-10"
                        />
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">{t('admin.pageVisibility')}:</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="new-section-partners"
                              checked={newSection.visible_to_partners}
                              onChange={(e) => setNewSection({...newSection, visible_to_partners: e.target.checked})}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor="new-section-partners">{t('admin.visibleToPartners')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="new-section-clients"
                              checked={newSection.visible_to_clients}
                              onChange={(e) => setNewSection({...newSection, visible_to_clients: e.target.checked})}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor="new-section-clients">{t('admin.visibleToClients')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="new-section-everyone"
                              checked={newSection.visible_to_everyone}
                              onChange={(e) => setNewSection({...newSection, visible_to_everyone: e.target.checked})}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor="new-section-everyone">{t('admin.visibleToEveryone')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="new-section-specjalista"
                              checked={newSection.visible_to_specjalista}
                              onChange={(e) => setNewSection({...newSection, visible_to_specjalista: e.target.checked})}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor="new-section-specjalista">{t('admin.visibleToSpecialists')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="new-section-anonymous"
                              checked={newSection.visible_to_anonymous}
                              onChange={(e) => setNewSection({...newSection, visible_to_anonymous: e.target.checked})}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <Label htmlFor="new-section-anonymous">Widoczny dla niezalogowanych</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={createSection} 
                        disabled={!newSection.title.trim()}
                        className="w-full sm:w-auto"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {t('admin.save')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Sections List - Only Visibility Controls */}
            <div className="grid gap-4">
              {(() => {
                const filteredSections = sections.filter((section) =>
                  (section.title || '').toLowerCase().includes(sectionSearchQuery.toLowerCase()) ||
                  (section.description && section.description.toLowerCase().includes(sectionSearchQuery.toLowerCase()))
                );

                if (filteredSections.length === 0) {
                  return (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">{t('admin.noSectionsFound')}</p>
                      </CardContent>
                    </Card>
                  );
                }

                return filteredSections.map((section) => (
                  <Card key={section.id} className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Header: Title + Badge + Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-base">{section.title}</span>
                          <Badge variant={section.is_active ? "default" : "secondary"} className="text-xs">
                            {section.is_active ? t('admin.active') : t('admin.inactive')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({t('common.position')}: {section.position})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => moveSectionUp(section.id)}
                            disabled={sections.findIndex(s => s.id === section.id) === 0}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => moveSectionDown(section.id)}
                            disabled={sections.findIndex(s => s.id === section.id) === sections.length - 1}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={section.is_active}
                            onCheckedChange={(checked) => updateSection(section.id, { is_active: checked })}
                          />
                        </div>
                      </div>

                      {/* Visibility Checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`section-partner-${section.id}`}
                            checked={section.visible_to_partners}
                            onChange={(e) => updateSectionVisibility(section.id, { visible_to_partners: e.target.checked })}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`section-partner-${section.id}`} className="text-sm">{t('admin.visibleToPartners')}</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`section-client-${section.id}`}
                            checked={section.visible_to_clients}
                            onChange={(e) => updateSectionVisibility(section.id, { visible_to_clients: e.target.checked })}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`section-client-${section.id}`} className="text-sm">{t('admin.visibleToClients')}</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`section-everyone-${section.id}`}
                            checked={section.visible_to_everyone}
                            onChange={(e) => updateSectionVisibility(section.id, { visible_to_everyone: e.target.checked })}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`section-everyone-${section.id}`} className="text-sm">{t('admin.visibleToEveryone')}</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`section-specjalista-${section.id}`}
                            checked={section.visible_to_specjalista}
                            onChange={(e) => updateSectionVisibility(section.id, { visible_to_specjalista: e.target.checked })}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`section-specjalista-${section.id}`} className="text-sm">{t('admin.visibleToSpecialists')}</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`section-anonymous-${section.id}`}
                            checked={section.visible_to_anonymous}
                            onChange={(e) => updateSectionVisibility(section.id, { visible_to_anonymous: e.target.checked })}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`section-anonymous-${section.id}`} className="text-sm">Niezalogowani</label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ));
              })()}
            </div>
          </TabsContent>

          <TabsContent value="layout">
            <LivePreviewEditor />
          </TabsContent>

          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>{t('admin.colors')}</span>
                </CardTitle>
                <CardDescription>
                  Personalizuj kolorystykę aplikacji
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ColorSchemeEditor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            {/* Header Text Editor */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Edytor tekstu nagłówka
                  </CardTitle>
                  <CardDescription>
                    Edytuj tekst wyświetlany w nagłówku strony głównej
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="header-text-editor" className="text-sm font-medium">
                      Tekst nagłówka strony głównej
                    </Label>
                    <div className="mt-2">
                      <RichTextEditor
                        value={headerText}
                        onChange={setHeaderText}
                        placeholder="Wpisz tekst nagłówka strony głównej..."
                        rows={4}
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateHeaderText(headerText)}
                      disabled={headerTextLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {headerTextLoading ? 'Zapisywanie...' : 'Zapisz tekst nagłówka'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Author Text Editor */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Edytor tekstu autora
                  </CardTitle>
                  <CardDescription>
                    Edytuj tekst autora wyświetlany pod nagłówkiem strony głównej
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="author-text-editor" className="text-sm font-medium">
                      Tekst autora
                    </Label>
                    <div className="mt-2">
                      <RichTextEditor
                        value={authorText}
                        onChange={setAuthorText}
                        placeholder="Wpisz tekst autora..."
                        rows={2}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateAuthorText(authorText)}
                      disabled={authorTextLoading}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {authorTextLoading ? 'Zapisywanie...' : 'Zapisz tekst autora'}
                    </Button>
                  </div>
                </CardContent>
            </Card>
            
            {/* Header Image Editor */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Zdjęcie nagłówka strony głównej</CardTitle>
                <CardDescription>
                  Zmień zdjęcie wyświetlane nad tekstem nagłówka na stronie głównej
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {headerImage && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Aktualne zdjęcie nagłówka:</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/20">
                      <img src={headerImage} alt="Header" className="max-w-full h-auto max-h-32 object-contain mx-auto" />
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="header-image-url">URL zdjęcia nagłówka</Label>
                    <div className="flex mt-1 space-x-2">
                      <Input
                        id="header-image-url"
                        value={headerImageUrl}
                        onChange={(e) => setHeaderImageUrl(e.target.value)}
                        placeholder="https://example.com/header-image.jpg"
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => updateHeaderImage(headerImageUrl)} 
                        disabled={!headerImageUrl || headerImageLoading}
                        size="sm"
                      >
                        {headerImageLoading ? 'Zapisywanie...' : 'Zapisz'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">lub</div>
                  
                  <div>
                    <Label htmlFor="header-image-upload">Prześlij z urządzenia</Label>
                    <div className="mt-1">
                      <Input
                        id="header-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleHeaderImageFileChange}
                        disabled={headerImageUploadLoading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      {headerImageUploadLoading && (
                        <p className="text-sm text-blue-600 mt-2">Przesyłanie zdjęcia nagłówka...</p>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <Label>Rozmiar zdjęcia</Label>
                    <Select value={headerImageSize} onValueChange={(value: 'small' | 'medium' | 'large' | 'xlarge' | 'custom') => setHeaderImageSize(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rozmiar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Mały (64-96px)</SelectItem>
                        <SelectItem value="medium">Średni (80-128px) - domyślny</SelectItem>
                        <SelectItem value="large">Duży (112-192px)</SelectItem>
                        <SelectItem value="xlarge">Bardzo duży (144-256px)</SelectItem>
                        <SelectItem value="custom">Własny rozmiar</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {headerImageSize === 'custom' && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label htmlFor="custom-width">Szerokość (px)</Label>
                          <Input
                            id="custom-width"
                            type="number"
                            min={32}
                            max={512}
                            value={headerImageCustomWidth}
                            onChange={(e) => setHeaderImageCustomWidth(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="custom-height">Wysokość (px)</Label>
                          <Input
                            id="custom-height"
                            type="number"
                            min={32}
                            max={512}
                            value={headerImageCustomHeight}
                            onChange={(e) => setHeaderImageCustomHeight(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                    
                    {headerImageLoading && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Save className="w-4 h-4 animate-pulse" />
                        Zapisywanie...
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
            
            {/* Logo Management */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <img src={siteLogo || newPureLifeLogo} alt="Logo" className="w-5 h-5" />
                    Logo strony
                  </CardTitle>
                  <CardDescription>
                    Zarządzaj logo wyświetlanym w aplikacji
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Logo Display */}
                  <div>
                    <Label className="text-sm font-medium">Aktualny logo</Label>
                    <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50 flex items-center justify-center">
                      <img 
                        src={siteLogo || newPureLifeLogo} 
                        alt="Current Logo" 
                        className="max-w-[200px] max-h-[100px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = newPureLifeLogo;
                        }}
                      />
                    </div>
                  </div>

                  {/* Upload from Device */}
                  <div>
                    <Label className="text-sm font-medium">Prześlij z urządzenia</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        disabled={logoUploadLoading}
                        className="block w-full text-sm text-muted-foreground
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-medium
                          file:bg-primary file:text-primary-foreground
                          hover:file:bg-primary/90
                          file:disabled:opacity-50 file:disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Obsługiwane formaty: JPG, PNG, GIF, WEBP (max 5MB)
                      </p>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div>
                    <Label htmlFor="logo-url" className="text-sm font-medium">
                      Lub podaj adres URL
                    </Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="logo-url"
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        disabled={logoLoading}
                      />
                      <Button
                        onClick={() => updateSiteLogo(logoUrl)}
                        disabled={logoLoading || !logoUrl.trim()}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {logoLoading ? 'Zapisywanie...' : 'Ustaw'}
                      </Button>
                    </div>
                  </div>

                  {/* Loading State */}
                  {(logoUploadLoading || logoLoading) && (
                    <div className="text-center text-sm text-muted-foreground">
                      <div className="animate-pulse">
                        {logoUploadLoading ? 'Przesyłanie logo...' : 'Zapisywanie...'}
                      </div>
                    </div>
                  )}
                 </CardContent>
               </Card>
             </div>
             
             {/* Favicon Management */}
             <div className="mb-8">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Layout className="w-5 h-5" />
                     Favicon strony
                   </CardTitle>
                   <CardDescription>
                     Zarządzaj favicon wyświetlaną w zakładce przeglądarki
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                   {faviconUrl && (
                     <div>
                       <Label className="text-sm font-medium">Aktualna favicon</Label>
                       <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50 flex items-center justify-center">
                         <img 
                           src={faviconUrl} 
                           alt="Current Favicon" 
                           className="max-w-[32px] max-h-[32px] object-contain"
                         />
                       </div>
                     </div>
                   )}

                   <div>
                     <Label className="text-sm font-medium">Prześlij z urządzenia</Label>
                     <div className="mt-2">
                       <input
                         type="file"
                         accept="image/x-icon,image/png,image/svg+xml"
                         onChange={handleFaviconFileChange}
                         disabled={faviconUploadLoading}
                         className="block w-full text-sm text-muted-foreground
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-medium
                           file:bg-primary file:text-primary-foreground
                           hover:file:bg-primary/90
                           file:disabled:opacity-50 file:disabled:cursor-not-allowed"
                       />
                       <p className="text-xs text-muted-foreground mt-1">
                         Obsługiwane formaty: ICO, PNG, SVG (max 1MB, zalecane: 32x32px)
                       </p>
                     </div>
                   </div>

                   <div>
                     <Label htmlFor="favicon-url" className="text-sm font-medium">
                       Lub podaj adres URL
                     </Label>
                     <div className="mt-2 flex gap-2">
                       <Input
                         id="favicon-url"
                         type="url"
                         value={faviconUrlInput}
                         onChange={(e) => setFaviconUrlInput(e.target.value)}
                         placeholder="https://example.com/favicon.ico"
                         disabled={faviconLoading}
                       />
                       <Button
                         onClick={() => updateFavicon(faviconUrlInput)}
                         disabled={faviconLoading || !faviconUrlInput.trim()}
                         className="flex items-center gap-2"
                       >
                         <Save className="w-4 h-4" />
                         {faviconLoading ? 'Zapisywanie...' : 'Ustaw'}
                       </Button>
                     </div>
                   </div>

                   {(faviconUploadLoading || faviconLoading) && (
                     <div className="text-center text-sm text-muted-foreground">
                       <div className="animate-pulse">
                         {faviconUploadLoading ? 'Przesyłanie favicon...' : 'Zapisywanie...'}
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </div>

             {/* OG Image Management */}
             <div className="mb-8">
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Layout className="w-5 h-5" />
                     Open Graph Image
                   </CardTitle>
                   <CardDescription>
                     Zarządzaj obrazem wyświetlanym przy udostępnianiu w mediach społecznościowych
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                   {ogImageUrl && (
                     <div>
                       <Label className="text-sm font-medium">Aktualny obraz OG</Label>
                       <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50 flex items-center justify-center">
                         <img 
                           src={ogImageUrl} 
                           alt="Current OG Image" 
                           className="max-w-full h-auto max-h-48 object-contain"
                         />
                       </div>
                     </div>
                   )}

                   <div>
                     <Label className="text-sm font-medium">Prześlij z urządzenia</Label>
                     <div className="mt-2">
                       <input
                         type="file"
                         accept="image/*"
                         onChange={handleOgImageFileChange}
                         disabled={ogImageUploadLoading}
                         className="block w-full text-sm text-muted-foreground
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-md file:border-0
                           file:text-sm file:font-medium
                           file:bg-primary file:text-primary-foreground
                           hover:file:bg-primary/90
                           file:disabled:opacity-50 file:disabled:cursor-not-allowed"
                       />
                       <p className="text-xs text-muted-foreground mt-1">
                         Obsługiwane formaty: JPG, PNG, GIF, WEBP (max 5MB, zalecane: 1200x630px)
                       </p>
                     </div>
                   </div>

                   <div>
                     <Label htmlFor="og-image-url" className="text-sm font-medium">
                       Lub podaj adres URL
                     </Label>
                     <div className="mt-2 flex gap-2">
                       <Input
                         id="og-image-url"
                         type="url"
                         value={ogImageUrlInput}
                         onChange={(e) => setOgImageUrlInput(e.target.value)}
                         placeholder="https://example.com/og-image.jpg"
                         disabled={ogImageLoading}
                       />
                       <Button
                         onClick={() => updateOgImage(ogImageUrlInput)}
                         disabled={ogImageLoading || !ogImageUrlInput.trim()}
                         className="flex items-center gap-2"
                       >
                         <Save className="w-4 h-4" />
                         {ogImageLoading ? 'Zapisywanie...' : 'Ustaw'}
                       </Button>
                     </div>
                   </div>

                   {(ogImageUploadLoading || ogImageLoading) && (
                     <div className="text-center text-sm text-muted-foreground">
                       <div className="animate-pulse">
                         {ogImageUploadLoading ? 'Przesyłanie obrazu OG...' : 'Zapisywanie...'}
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
              </div>

              {/* Reflinks Management */}
              <div className="mb-8">
                <ReflinksManagement />
              </div>
              
            </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings2 className="w-5 h-5" />
                  <span>{t('admin.account')}</span>
                </CardTitle>
                <CardDescription>
                  Zarządzaj swoim kontem administratora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('account.profile')}</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>{t('auth.email')}:</strong> {user?.email}</p>
                    <p><strong>{t('admin.userRole')}:</strong> Administrator</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('auth.password')}</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="current-password">{t('auth.password')} (aktualne)</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        placeholder="Wprowadź aktualne hasło"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">{t('auth.password')} (nowe)</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Wprowadź nowe hasło"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Potwierdź nowe hasło"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="w-full"
                    >
                      {passwordLoading ? "Zapisywanie..." : "Zmień hasło"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>{t('admin.pages')}</span>
                </CardTitle>
                <CardDescription>
                  Dodawaj, edytuj i usuwaj strony w systemie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Page */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('admin.addPage')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="page-title">{t('admin.pageTitle')}</Label>
                      <Input
                        id="page-title"
                        value={newPage.title}
                        onChange={(e) => setNewPage({...newPage, title: e.target.value})}
                        placeholder="Wprowadź tytuł strony"
                      />
                    </div>
                    <div>
                      <Label htmlFor="page-slug">{t('admin.slug')} (URL)</Label>
                      <Input
                        id="page-slug"
                        value={newPage.slug}
                        onChange={(e) => setNewPage({...newPage, slug: e.target.value})}
                        placeholder="url-strony (zostanie wygenerowany automatycznie)"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="page-meta-title">{t('admin.metaTitle')} (SEO)</Label>
                      <Input
                        id="page-meta-title"
                        value={newPage.meta_title}
                        onChange={(e) => setNewPage({...newPage, meta_title: e.target.value})}
                        placeholder="Tytuł SEO"
                      />
                    </div>
                    <div>
                      <Label htmlFor="page-meta-description">{t('admin.metaDescription')} (SEO)</Label>
                      <Input
                        id="page-meta-description"
                        value={newPage.meta_description}
                        onChange={(e) => setNewPage({...newPage, meta_description: e.target.value})}
                        placeholder="Opis SEO"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="page-content">{t('admin.content')}</Label>
                    <Textarea
                      id="page-content"
                      value={newPage.content}
                      onChange={(e) => setNewPage({...newPage, content: e.target.value})}
                      placeholder="Wprowadź treść strony"
                      rows={6}
                    />
                  </div>
                   <div className="flex items-center space-x-2">
                     <Switch
                       id="page-published"
                       checked={newPage.is_published}
                       onCheckedChange={(checked) => setNewPage({...newPage, is_published: checked})}
                     />
                     <Label htmlFor="page-published">{t('admin.published')}</Label>
                   </div>
                   <div className="space-y-3">
                     <h4 className="text-sm font-medium">{t('admin.pageVisibility')}:</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                       <div className="flex items-center space-x-2 min-h-[44px]">
                         <input
                           type="checkbox"
                           id="new-page-partners"
                           checked={newPage.visible_to_partners}
                           onChange={(e) => setNewPage({...newPage, visible_to_partners: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                         <Label htmlFor="new-page-partners">{t('admin.visibleToPartners')}</Label>
                       </div>
                       <div className="flex items-center space-x-2 min-h-[44px]">
                         <input
                           type="checkbox"
                           id="new-page-clients"
                           checked={newPage.visible_to_clients}
                           onChange={(e) => setNewPage({...newPage, visible_to_clients: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                         <Label htmlFor="new-page-clients">{t('admin.visibleToClients')}</Label>
                       </div>
                       <div className="flex items-center space-x-2 min-h-[44px]">
                         <input
                           type="checkbox"
                           id="new-page-everyone"
                           checked={newPage.visible_to_everyone}
                           onChange={(e) => setNewPage({...newPage, visible_to_everyone: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                          <Label htmlFor="new-page-everyone">{t('admin.visibleToEveryone')}</Label>
                         </div>
                         <div className="flex items-center space-x-2 min-h-[44px]">
                           <input
                             type="checkbox"
                             id="new-page-specjalista"
                             checked={newPage.visible_to_specjalista}
                             onChange={(e) => setNewPage({...newPage, visible_to_specjalista: e.target.checked})}
                             className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                           />
                           <Label htmlFor="new-page-specjalista">{t('admin.visibleToSpecialists')}</Label>
                         </div>
                         <div className="flex items-center space-x-2 min-h-[44px]">
                           <input
                             type="checkbox"
                             id="new-page-anonymous"
                             checked={newPage.visible_to_anonymous}
                             onChange={(e) => setNewPage({...newPage, visible_to_anonymous: e.target.checked})}
                             className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                           />
                           <Label htmlFor="new-page-anonymous">Widoczny dla niezalogowanych</Label>
                         </div>
                     </div>
                   </div>
                   <Button onClick={createPage} disabled={!newPage.title}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj stronę
                  </Button>
                </div>

                <Separator />

                {/* Pages List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('admin.pages')}</h3>
                  {pagesLoading ? (
                    <div className="text-center py-4">{t('admin.loadingPages')}</div>
                  ) : pages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Brak stron do wyświetlenia
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pages.map((page) => (
                        <Card key={page.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{page.title}</h4>
                                  <Badge variant={page.is_published ? "default" : "secondary"}>
                                    {page.is_published ? "Opublikowana" : "Szkic"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Slug: /{page.slug}
                                </p>
                                {page.is_published && (
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      asChild
                                      className="h-auto p-0 text-primary"
                                    >
                                      <Link to={`/page/${page.slug}`} target="_blank">
                                        🔗 Zobacz stronę
                                      </Link>
                                    </Button>
                                    <span className="text-xs text-muted-foreground">|</span>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() => {
                                        const url = `${window.location.origin}/page/${page.slug}`;
                                        navigator.clipboard.writeText(url);
                                        toast({
                                          title: "Link skopiowany",
                                          description: "Link do strony został skopiowany do schowka",
                                        });
                                      }}
                                    >
                                      📋 Kopiuj link
                                    </Button>
                                  </div>
                                )}
                                 {page.meta_description && (
                                   <p className="text-sm text-muted-foreground line-clamp-2">
                                     {page.meta_description}
                                   </p>
                                 )}
                                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                                   <div className="flex items-center space-x-2 min-h-[44px]">
                                     <input
                                       type="checkbox"
                                       id={`partner-${page.id}`}
                                       checked={page.visible_to_partners}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_partners: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                     <label htmlFor={`partner-${page.id}`} className="text-sm">{t('admin.visibleToPartners')}</label>
                                   </div>
                                   <div className="flex items-center space-x-2 min-h-[44px]">
                                     <input
                                       type="checkbox"
                                       id={`client-${page.id}`}
                                       checked={page.visible_to_clients}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_clients: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                     <label htmlFor={`client-${page.id}`} className="text-sm">{t('admin.visibleToClients')}</label>
                                   </div>
                                   <div className="flex items-center space-x-2 min-h-[44px]">
                                     <input
                                       type="checkbox"
                                       id={`everyone-${page.id}`}
                                       checked={page.visible_to_everyone}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_everyone: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                      <label htmlFor={`everyone-${page.id}`} className="text-sm">{t('admin.visibleToEveryone')}</label>
                                     </div>
                                     <div className="flex items-center space-x-2 min-h-[44px]">
                                       <input
                                         type="checkbox"
                                         id={`specjalista-${page.id}`}
                                         checked={page.visible_to_specjalista}
                                         onChange={(e) => updatePageVisibility(page.id, { visible_to_specjalista: e.target.checked })}
                                         className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                       />
                                       <label htmlFor={`specjalista-${page.id}`} className="text-sm">{t('admin.visibleToSpecialists')}</label>
                                     </div>
                                     <div className="flex items-center space-x-2 min-h-[44px]">
                                       <input
                                         type="checkbox"
                                         id={`anonymous-${page.id}`}
                                         checked={page.visible_to_anonymous}
                                         onChange={(e) => updatePageVisibility(page.id, { visible_to_anonymous: e.target.checked })}
                                         className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                       />
                                       <label htmlFor={`anonymous-${page.id}`} className="text-sm">Widoczny dla niezalogowanych</label>
                                     </div>
                                 </div>
                               </div>
                              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { 
                    setEditingPage(page); 
                    setPageContentStyle((page as any).content_formatting || null);
                    fetchPageSections(page.id);
                    fetchPageItems(page.id);
                  }}
                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deletePage(page.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                      </Card>
                      ))}
                  </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>{t('admin.userManagement')}</span>
                    </CardTitle>
                    <CardDescription>
                      Zarządzaj klientami i ich rolami w systemie
                    </CardDescription>
                  </div>
                  <GroupEmailSender />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                 ) : (
                   <div className="space-y-4">
                     {/* Filter Tabs */}
                     <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                       <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                         <button
                           onClick={() => setUserFilterTab('pending')}
                           className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                             userFilterTab === 'pending' 
                               ? 'bg-background text-foreground shadow' 
                               : 'hover:bg-background/50'
                           }`}
                         >
                           Oczekujący
                           {userCounts.pending > 0 && (
                             <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                               {userCounts.pending}
                             </Badge>
                           )}
                         </button>
                         <button
                           onClick={() => setUserFilterTab('active')}
                           className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                             userFilterTab === 'active' 
                               ? 'bg-background text-foreground shadow' 
                               : 'hover:bg-background/50'
                           }`}
                         >
                           Aktywni
                           <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                             {userCounts.active}
                           </Badge>
                         </button>
                         <button
                           onClick={() => setUserFilterTab('all')}
                           className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                             userFilterTab === 'all' 
                               ? 'bg-background text-foreground shadow' 
                               : 'hover:bg-background/50'
                           }`}
                         >
                           Wszyscy
                           <Badge variant="outline" className="ml-2 h-5 px-1.5 text-xs">
                             {userCounts.all}
                           </Badge>
                         </button>
                       </div>
                       
                       <div className="flex flex-wrap gap-2">
                         <Button variant="outline" size="sm" onClick={fetchUsers}>
                           Odśwież
                         </Button>
                         <Button
                           onClick={() => setShowCreateUserDialog(true)}
                           size="sm"
                           className="gap-1.5"
                         >
                           <UserPlus className="w-4 h-4" />
                           Dodaj
                         </Button>
                         
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm">
                               <Download className="w-4 h-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="bg-background">
                             <DropdownMenuItem onClick={exportToPDF}>PDF</DropdownMenuItem>
                             <DropdownMenuItem onClick={exportToXLSX}>Excel</DropdownMenuItem>
                             <DropdownMenuItem onClick={exportToXML}>XML</DropdownMenuItem>
                             <DropdownMenuItem onClick={exportToZIP}>ZIP</DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </div>

                     {/* Search and Sort Bar */}
                     <div className="flex flex-col sm:flex-row gap-2">
                       <div className="relative flex-1">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input
                           type="text"
                           placeholder={t('admin.searchUsers')}
                           value={userSearchQuery}
                           onChange={(e) => setUserSearchQuery(e.target.value)}
                           className="pl-10 pr-10 h-9"
                         />
                         {userSearchQuery && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setUserSearchQuery('')}
                             className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                           >
                             <X className="w-3 h-3" />
                           </Button>
                         )}
                       </div>
                       <div className="flex gap-2">
                         <Select value={userSortBy} onValueChange={(value: any) => setUserSortBy(value)}>
                           <SelectTrigger className="w-32 h-9">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="created_at">Data</SelectItem>
                             <SelectItem value="email">Email</SelectItem>
                             <SelectItem value="role">Rola</SelectItem>
                             <SelectItem value="is_active">Status</SelectItem>
                           </SelectContent>
                         </Select>
                         <Select value={userSortOrder} onValueChange={(value: any) => setUserSortOrder(value)}>
                           <SelectTrigger className="w-28 h-9">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="desc">Najnowsze</SelectItem>
                             <SelectItem value="asc">Najstarsze</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>

                      {/* Results count and legend */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {userSearchQuery || userFilterTab !== 'all'
                            ? `Wyświetlanie ${filteredAndSortedUsers.length} z ${users.length} użytkowników`
                            : `Łącznie: ${users.length} użytkowników`
                          }
                        </p>
                        <UserStatusLegend />
                      </div>

                      {/* Bulk Actions */}
                      {selectedUserIds.size > 0 && (
                        <BulkUserActions
                          selectedCount={selectedUserIds.size}
                          onClearSelection={clearUserSelection}
                          onBulkApprove={handleBulkApprove}
                          onBulkChangeRole={handleBulkChangeRole}
                          onBulkSendEmail={handleBulkSendEmail}
                          emailTemplates={emailTemplates}
                        />
                      )}
                      
                      {/* User List */}
                      {filteredAndSortedUsers.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground border rounded-lg">
                          {userSearchQuery 
                            ? t('admin.noUsersFound') 
                            : userFilterTab === 'pending'
                              ? 'Brak użytkowników oczekujących na zatwierdzenie'
                              : userFilterTab === 'active'
                                ? 'Brak aktywnych użytkowników'
                                : t('admin.noUsers')
                          }
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredAndSortedUsers.map((userProfile) => (
                            <CompactUserCard
                              key={userProfile.id}
                              userProfile={userProfile}
                              currentUserId={user?.id}
                              onConfirmEmail={confirmUserEmail}
                              onEditUser={setEditingUserProfile}
                              onResetPassword={resetUserPassword}
                              onToggleStatus={toggleUserStatus}
                              onDeleteUser={deleteUser}
                              onAdminApprove={adminApproveUser}
                              onUpdateRole={updateUserRole}
                              isDeleting={deleteLoading}
                              isResettingPassword={passwordLoading}
                              isSelected={selectedUserIds.has(userProfile.user_id)}
                              onSelectionChange={handleUserSelectionChange}
                              showCheckbox={true}
                            />
                          ))}
                        </div>
                      )}
                   </div>
                )}
              </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Dodaj nowego klienta</DialogTitle>
                  <DialogDescription>
                    Utwórz nowe konto klienta w systemie
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="new-user-email">Email</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="uzytkownik@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-password">Hasło</Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Minimum 6 znaków"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-role">Rola</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Klient</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="specjalista">Specjalista</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateUserDialog(false);
                      setNewUser({ email: '', password: '', role: 'user' });
                    }}
                  >
                    Anuluj
                  </Button>
                  <Button onClick={createUser} disabled={creatingUser}>
                    {creatingUser ? 'Tworzenie...' : 'Utwórz klienta'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Resetuj hasło użytkownika</DialogTitle>
                  <DialogDescription>
                    Ustaw nowe hasło dla użytkownika: {resetPasswordData.userEmail}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="reset-new-password">Nowe hasło</Label>
                    <Input
                      id="reset-new-password"
                      type="password"
                      value={resetPasswordData.newPassword}
                      onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                      placeholder="Wprowadź bezpieczne hasło (min. 8 znaków)"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hasło zostanie natychmiast ustawione i wysłane emailem do użytkownika
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResetPasswordDialog(false);
                      setResetPasswordData({ userEmail: '', newPassword: '' });
                    }}
                  >
                    Anuluj
                  </Button>
                  <Button onClick={handleResetPassword} disabled={passwordLoading}>
                    {passwordLoading ? 'Resetowanie...' : 'Resetuj hasło'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="training">
            <TrainingManagement />
          </TabsContent>

          <TabsContent value="certificates">
            <CertificateEditor />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeResourcesManagement />
          </TabsContent>

          <TabsContent value="cookies">
            <CookieConsentManagement />
          </TabsContent>

          <TabsContent value="ai-compass">
            <AiCompassManagement />
          </TabsContent>

          <TabsContent value="daily-signal">
            <DailySignalManagement />
          </TabsContent>

          <TabsContent value="important-info">
            <ImportantInfoManagement />
          </TabsContent>

          <TabsContent value="translations">
            <TranslationsManagement />
          </TabsContent>

          <TabsContent value="team-contacts">
            <TeamContactsManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSystemManagement />
          </TabsContent>

          <TabsContent value="emails">
            <EmailTemplatesManagement />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceModeManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => {
          console.log('Closing edit dialog');
          setEditingItem(null);
          setItemTextStyle(null);
          setItemTitleStyle(null);
          setEditingItemTextMode(false);
          setEditingItemTitleMode(false);
        }}>
          <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Edytuj element</DialogTitle>
              <DialogDescription className="text-sm">
                Modyfikuj dane elementu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-type" className="text-sm font-medium">Typ</Label>
                <Select 
                  value={editingItem.type} 
                  onValueChange={(value) => setEditingItem({...editingItem, type: value})}
                >
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="button">Przycisk</SelectItem>
                     <SelectItem value="info_text">Informacja</SelectItem>
                     <SelectItem value="tip">Wskazówka</SelectItem>
                     <SelectItem value="description">Opis</SelectItem>
                     <SelectItem value="contact_info">Info kontaktowe</SelectItem>
                     <SelectItem value="support_info">Info wsparcia</SelectItem>
                     <SelectItem value="header_text">Tekst nagłówka</SelectItem>
                     <SelectItem value="author">Autor</SelectItem>
                   </SelectContent>
                </Select>
              </div>
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <Label htmlFor="edit-title" className="text-sm font-medium">Tytuł</Label>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setEditingItemTitleMode(!editingItemTitleMode)}
                     className="h-7"
                   >
                     <Type className="w-3 h-3 mr-1" />
                     {editingItemTitleMode ? 'Prosty' : 'Zaawansowany'}
                   </Button>
                 </div>
                 
                 {editingItemTitleMode ? (
                   <TextEditor
                     initialText={editingItem.title || ''}
                     initialStyle={itemTitleStyle}
                     onSave={(text, style) => {
                       setEditingItem({...editingItem, title: text});
                       setItemTitleStyle(style);
                       setEditingItemTitleMode(false);
                     }}
                     placeholder="Sformatuj tytuł za pomocą edytora..."
                   />
                 ) : (
                   <Input
                     id="edit-title"
                     value={editingItem.title || ''}
                     onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                     placeholder="Wskazówka"
                     className="mt-1 h-10"
                   />
                 )}
               </div>
               <div>
                 <div className="flex items-center justify-between mb-2">
                   <Label htmlFor="edit-description" className="text-sm font-medium">Opis</Label>
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setEditingItemTextMode(!editingItemTextMode)}
                     className="h-7"
                   >
                     <Type className="w-3 h-3 mr-1" />
                     {editingItemTextMode ? 'Prosty' : 'Zaawansowany'}
                   </Button>
                 </div>
                 
                 {editingItemTextMode ? (
                   <TextEditor
                     initialText={editingItem.description || ''}
                     initialStyle={itemTextStyle}
                     onSave={(text, style) => {
                       console.log('Edit item text save:', { text, style });
                       setEditingItem({...editingItem, description: text});
                       setItemTextStyle(style);
                       setEditingItemTextMode(false);
                       toast({
                         title: "Tekst sformatowany",
                         description: "Kliknij 'Zapisz zmiany' aby zapisać element",
                       });
                     }}
                     placeholder="Sformatuj tekst za pomocą edytora..."
                   />
                 ) : (
                   <Textarea
                     id="edit-description"
                     value={editingItem.description || ''}
                     onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                     placeholder="Aby zaprosić nową osobę, kliknij przycisk udostępnij i podziel się materiałami."
                     className="mt-1 min-h-[80px] resize-none"
                     rows={3}
                   />
                 )}
               </div>
              <div>
                <Label htmlFor="edit-url" className="text-sm font-medium">URL</Label>
                <Input
                  id="edit-url"
                  value={editingItem.url || ''}
                  onChange={(e) => setEditingItem({...editingItem, url: e.target.value})}
                  placeholder="https://..."
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Plik multimedialny</Label>
                <div className="mt-1">
                  <MediaUpload
                    onMediaUploaded={(url, type, altText) => setEditingItem({
                      ...editingItem, 
                      media_url: url, 
                      media_type: type, 
                      media_alt_text: altText || ''
                    })}
                    currentMediaUrl={editingItem.media_url || ''}
                    currentMediaType={editingItem.media_type as 'image' | 'video' | 'document' | 'audio' | 'other' | undefined}
                    currentAltText={editingItem.media_alt_text || ''}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button 
                onClick={() => updateItem(editingItem.id, {
                  ...editingItem,
                  title_formatting: itemTitleStyle,
                  text_formatting: itemTextStyle,
                })} 
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Section Dialog */}
      {editingSection && (
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col gap-0 p-0">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle>Edytuj sekcję</DialogTitle>
              <DialogDescription>
                Skonfiguruj wygląd i zawartość sekcji
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <SectionEditor 
                section={editingSection}
                onSave={(updatedSection) => updateSection(editingSection.id, updatedSection)}
                onCancel={() => setEditingSection(null)}
                isNew={false}
                allowSizeEditing={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Dialog */}
      {editingPage && (
        <Dialog open={!!editingPage} onOpenChange={() => {
          setEditingPage(null);
          setPageSections([]);
          setPageItems([]);
          setSelectedPageSection(null);
          setEditingPageItem(null);
          setEditingPageSection(null);
        }}>
          <DialogContent className="max-w-6xl w-full max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>Edytuj stronę</DialogTitle>
              <DialogDescription>
                Modyfikuj dane strony i zarządzaj jej zawartością CMS
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Podstawowe informacje</TabsTrigger>
                  <TabsTrigger value="cms">Zawartość CMS</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-page-title">Tytuł strony</Label>
                    <Input
                      id="edit-page-title"
                      value={editingPage.title || ''}
                      onChange={(e) => setEditingPage({...editingPage, title: e.target.value})}
                      placeholder="Wprowadź tytuł strony"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-page-slug">Slug (URL)</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md border font-mono text-sm break-all">
                      /{editingPage.slug || 'url-strony'}
                    </div>
                    <Input
                      id="edit-page-slug"
                      value={editingPage.slug || ''}
                      onChange={(e) => setEditingPage({...editingPage, slug: e.target.value})}
                      placeholder="url-strony"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-page-meta-title">Meta tytuł (SEO)</Label>
                    <Input
                      id="edit-page-meta-title"
                      value={editingPage.meta_title || ''}
                      onChange={(e) => setEditingPage({...editingPage, meta_title: e.target.value})}
                      placeholder="Tytuł SEO"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-page-meta-description">Meta opis (SEO)</Label>
                    <Input
                      id="edit-page-meta-description"
                      value={editingPage.meta_description || ''}
                      onChange={(e) => setEditingPage({...editingPage, meta_description: e.target.value})}
                      placeholder="Opis SEO"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-page-content">Treść strony</Label>
                  <div className="mt-2">
                    <div className="border rounded-md">
                       <div className="p-2 border-b bg-muted/50 flex flex-wrap gap-2">
                         <Button
                           type="button"
                           variant={editingPageRichText ? "default" : "outline"}
                           size="sm"
                           onClick={() => setEditingPageRichText(!editingPageRichText)}
                         >
                           ✨ Edytor tekstu
                         </Button>
                         <div className="text-xs text-muted-foreground self-center ml-2">
                           {editingPageRichText 
                             ? "Zaawansowany edytor z formatowaniem, obrazami, linkami i wideo"
                             : "Prosty edytor HTML - przełącz na edytor tekstu dla więcej opcji"
                           }
                         </div>
                       </div>
                      
                       {editingPageRichText ? (
                         <div className="p-4">
                           <RichTextEditor
                             value={editingPage.content || ''}
                             onChange={(content) => {
                               console.log('Page content rich text save:', content);
                               setEditingPage({...editingPage, content});
                             }}
                             placeholder="Sformatuj treść strony za pomocą edytora..."
                             rows={12}
                           />
                         </div>
                       ) : (
                        <Textarea
                          id="edit-page-content"
                          value={editingPage.content || ''}
                          onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                          placeholder="Wprowadź treść strony. Możesz używać podstawowych tagów HTML jak <p>, <h1>, <h2>, <strong>, <em>, <ul>, <li> itp."
                          rows={12}
                          className="border-0 resize-none focus-visible:ring-0"
                        />
                      )}
                    </div>
                     <div className="mt-2 text-xs text-muted-foreground">
                       {editingPageRichText 
                         ? "Zaawansowany edytor tekstu z pełną kontrolą nad formatowaniem, możliwością dodawania obrazów, linków i wideo. Wszystkie opcje dostępne w pasku narzędzi."
                         : "Prosty edytor HTML. Możesz używać podstawowych tagów HTML lub przełączyć na zaawansowany edytor tekstu."
                       }
                     </div>
                  </div>
                </div>
                
                 <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                   <div className="flex items-center space-x-2">
                     <Switch
                       id="edit-page-published"
                       checked={editingPage.is_published}
                       onCheckedChange={(checked) => setEditingPage({...editingPage, is_published: checked})}
                     />
                     <Label htmlFor="edit-page-published">Opublikuj stronę</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Switch
                       id="edit-page-active"
                       checked={editingPage.is_active}
                       onCheckedChange={(checked) => setEditingPage({...editingPage, is_active: checked})}
                     />
                     <Label htmlFor="edit-page-active">Aktywna</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Label htmlFor="edit-page-position" className="whitespace-nowrap">Pozycja:</Label>
                     <Input
                       id="edit-page-position"
                       type="number"
                       value={editingPage.position}
                       onChange={(e) => setEditingPage({...editingPage, position: parseInt(e.target.value) || 0})}
                       placeholder="0"
                       className="w-20"
                     />
                   </div>
                 </div>
                 
                 <div className="space-y-3">
                   <h4 className="text-sm font-medium">Widoczność strony dla ról:</h4>
                   <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
                     <div className="flex items-center space-x-2">
                       <input
                         type="checkbox"
                         id="edit-page-partners"
                         checked={editingPage.visible_to_partners}
                         onChange={(e) => setEditingPage({...editingPage, visible_to_partners: e.target.checked})}
                         className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                       />
                       <Label htmlFor="edit-page-partners">Partner</Label>
                     </div>
                     <div className="flex items-center space-x-2">
                       <input
                         type="checkbox"
                         id="edit-page-clients"
                         checked={editingPage.visible_to_clients}
                         onChange={(e) => setEditingPage({...editingPage, visible_to_clients: e.target.checked})}
                         className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                       />
                       <Label htmlFor="edit-page-clients">Klient</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-page-everyone"
                          checked={editingPage.visible_to_everyone}
                          onChange={(e) => setEditingPage({...editingPage, visible_to_everyone: e.target.checked})}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label htmlFor="edit-page-everyone">Dla wszystkich</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-page-specjalista"
                          checked={editingPage.visible_to_specjalista}
                          onChange={(e) => setEditingPage({...editingPage, visible_to_specjalista: e.target.checked})}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label htmlFor="edit-page-specjalista">Specjalista</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-page-anonymous"
                          checked={editingPage.visible_to_anonymous}
                          onChange={(e) => setEditingPage({...editingPage, visible_to_anonymous: e.target.checked})}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <Label htmlFor="edit-page-anonymous">Dla niezalogowanych</Label>
                      </div>
                   </div>
                 </div>
                 </TabsContent>
                
                <TabsContent value="cms" className="space-y-6 pb-6">
                   {/* CMS Content Management */}
                   <div className="space-y-6">
                     <Card>
                       <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                           <Layout className="w-5 h-5" />
                           Edytuj w Layout Editor
                         </CardTitle>
                         <CardDescription>
                           Otwórz zaawansowany edytor wizualny dla tej strony z funkcjami drag & drop, układem kolumn i pełną kontrolą nad sekcjami i elementami.
                         </CardDescription>
                       </CardHeader>
                       <CardContent>
                         <Button 
                           onClick={() => {
                             setEditingPageInLayoutEditor({ 
                               id: editingPage.id, 
                               title: editingPage.title 
                             });
                             setEditingPage(null);
                             setPageSections([]);
                             setPageItems([]);
                             setSelectedPageSection(null);
                             setEditingPageItem(null);
                             setEditingPageSection(null);
                           }}
                           className="w-full gap-2"
                           size="lg"
                         >
                           <Layout className="w-5 h-5" />
                           Otwórz Layout Editor
                         </Button>
                       </CardContent>
                     </Card>
                     
                     <div className="text-sm text-muted-foreground space-y-2">
                       <p><strong>Layout Editor</strong> pozwala na:</p>
                       <ul className="list-disc list-inside space-y-1 ml-2">
                         <li>Wizualne układanie sekcji i elementów (drag & drop)</li>
                         <li>Tworzenie układów wielokolumnowych</li>
                         <li>Zaawansowane ustawienia stylów i właściwości</li>
                         <li>Podgląd responsywny (desktop, tablet, mobile)</li>
                         <li>Automatyczne zapisywanie zmian</li>
                       </ul>
                     </div>
                   </div>
                 </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingPage(null)}>
                Anuluj
              </Button>
               <Button onClick={() => updatePage(editingPage.id, {
                 title: editingPage.title,
                 slug: editingPage.slug,
                 content: editingPage.content,
                 content_formatting: pageContentStyle,
                 meta_title: editingPage.meta_title,
                 meta_description: editingPage.meta_description,
                 is_published: editingPage.is_published,
                 is_active: editingPage.is_active,
                 position: editingPage.position,
                 visible_to_partners: editingPage.visible_to_partners,
                 visible_to_clients: editingPage.visible_to_clients,
                 visible_to_everyone: editingPage.visible_to_everyone,
               })}>
                 <Save className="w-4 h-4 mr-2" />
                 {t('admin.saveChanges')}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Page Section Dialog */}
      {showAddPageSectionEditor && editingPage && (
        <Dialog open={showAddPageSectionEditor} onOpenChange={() => setShowAddPageSectionEditor(false)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col gap-0 p-0">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle>Dodaj nową sekcję do strony</DialogTitle>
              <DialogDescription>
                Skonfiguruj wygląd i zawartość nowej sekcji dla strony "{editingPage.title}"
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <SectionEditor 
                onSave={(newSection) => createPageSection(editingPage.id, newSection)}
                onCancel={() => setShowAddPageSectionEditor(false)}
                isNew={true}
                allowSizeEditing={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Section Dialog */}
      {editingPageSection && (
        <Dialog open={!!editingPageSection} onOpenChange={() => setEditingPageSection(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] sm:max-h-[90vh] flex flex-col gap-0 p-0">
            <DialogHeader className="p-6 pb-2 shrink-0">
              <DialogTitle>Edytuj sekcję strony</DialogTitle>
              <DialogDescription>
                Skonfiguruj wygląd i zawartość sekcji
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <SectionEditor 
                section={editingPageSection}
                onSave={(updatedSection) => updatePageSection(editingPageSection.id, updatedSection)}
                onCancel={() => setEditingPageSection(null)}
                isNew={false}
                allowSizeEditing={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Item Dialog */}
      {editingPageItem && (
        <Dialog open={!!editingPageItem} onOpenChange={() => setEditingPageItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edytuj element strony</DialogTitle>
              <DialogDescription>
                Modyfikuj dane elementu strony
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-page-item-type">Typ elementu</Label>
                  <Select value={editingPageItem.type} onValueChange={(value) => setEditingPageItem({...editingPageItem, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="button">Przycisk</SelectItem>
                      <SelectItem value="info_text">Tekst informacyjny</SelectItem>
                      <SelectItem value="tip">Wskazówka</SelectItem>
                      <SelectItem value="description">Opis</SelectItem>
                      <SelectItem value="contact_info">Informacje kontaktowe</SelectItem>
                      <SelectItem value="support_info">Informacje o wsparciu</SelectItem>
                      <SelectItem value="header_text">Tekst nagłówka</SelectItem>
                      <SelectItem value="author">Autor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-page-item-title">Tytuł</Label>
                  <Input
                    value={editingPageItem.title || ''}
                    onChange={(e) => setEditingPageItem({...editingPageItem, title: e.target.value})}
                    placeholder="Tytuł elementu"
                  />
                </div>
              </div>
               <div>
                 <Label htmlFor="edit-page-item-description">Opis Elementu</Label>
                 <RichTextEditor
                   value={editingPageItem.description || ''}
                   onChange={(value) => setEditingPageItem({...editingPageItem, description: value})}
                   placeholder="Opis elementu"
                   rows={4}
                   className="mt-1"
                 />
               </div>
              {editingPageItem.type === 'button' && (
                <div>
                  <Label htmlFor="edit-page-item-url">URL</Label>
                  <Input
                    value={editingPageItem.url || ''}
                    onChange={(e) => setEditingPageItem({...editingPageItem, url: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="edit-page-item-position">Pozycja</Label>
                <Input
                  type="number"
                  value={editingPageItem.position}
                  onChange={(e) => setEditingPageItem({...editingPageItem, position: parseInt(e.target.value) || 0})}
                  placeholder="Pozycja elementu"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPageItem(null)}>
                Anuluj
              </Button>
              <Button onClick={() => updatePageItem(editingPageItem.id, {
                type: editingPageItem.type,
                title: editingPageItem.title,
                description: editingPageItem.description,
                url: editingPageItem.url,
                position: editingPageItem.position,
                text_formatting: pageItemTextStyle,
                title_formatting: pageItemTitleStyle,
              })}>
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* User Edit Dialog */}
      <UserEditDialog
        user={editingUserProfile}
        open={!!editingUserProfile}
        onOpenChange={(open) => !open && setEditingUserProfile(null)}
        onSuccess={() => {
          setEditingUserProfile(null);
          fetchUsers();
        }}
      />
        </SidebarInset>
      </div>
    </SidebarProvider>
    )}
    </>
  );
};

export default Admin;