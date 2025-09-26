import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { convertSupabaseSections, convertSupabaseSection } from '@/lib/typeUtils';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Plus, Trash2, LogOut, Home, Save, ChevronUp, ChevronDown, Palette, Type, Settings2, Users, CheckCircle, Clock, Mail, FileText, Download, SortAsc, UserPlus, Key } from 'lucide-react';
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
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
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

  const { user, isAdmin, signOut } = useAuth();
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
    // Enhanced styling defaults
    background_color: 'hsl(var(--background))',
    text_color: 'hsl(var(--foreground))',
    font_size: 16,
    alignment: 'left' as const,
    padding: 16,
    margin: 8,
    border_radius: 8,
    style_class: '',
    background_gradient: '',
    border_width: 0,
    border_color: 'hsl(var(--border))',
    border_style: 'solid' as const,
    box_shadow: 'none',
    opacity: 100,
    width_type: 'full' as const,
    custom_width: 600,
    height_type: 'auto' as const,
    custom_height: 200,
    max_width: 1200,
    font_weight: 400,
    line_height: 1.5,
    letter_spacing: 0,
    text_transform: 'none' as const,
    display_type: 'block' as const,
    justify_content: 'start' as const,
    align_items: 'start' as const,
    gap: 16,
    // New enhanced defaults
    section_margin_top: 24,
    section_margin_bottom: 24,
    background_image: '',
    background_image_opacity: 100,
    background_image_position: 'center',
    background_image_size: 'cover',
    icon_name: '',
    icon_position: 'left',
    icon_size: 24,
    icon_color: 'hsl(var(--foreground))',
    show_icon: false,
    content_direction: 'column',
    content_wrap: 'nowrap',
    min_height: 0,
    overflow_behavior: 'visible',
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
  
  // User sorting state
  const [userSortBy, setUserSortBy] = useState<'email' | 'role' | 'created_at' | 'is_active'>('created_at');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  
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
      setUsers((data as UserProfile[]) || []);
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
      const { data, error } = await supabase
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
      
      // Check if header text exists
      const { data: existingItem } = await supabase
        .from('system_texts')
        .select('id')
        .eq('type', 'header_text')
        .eq('is_active', true)
        .maybeSingle();

      if (existingItem) {
        // Update existing item
        const { error } = await supabase
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
        const { error } = await supabase
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
      const { data, error } = await supabase
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
      
      // Check if author text exists
      const { data: existingItem } = await supabase
        .from('system_texts')
        .select('id')
        .eq('type', 'author')
        .eq('is_active', true)
        .maybeSingle();

      if (existingItem) {
        // Update existing item
        const { error } = await supabase
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
        const { error } = await supabase
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

  // Sort users function
  const sortedUsers = [...users].sort((a, b) => {
    let aValue: any = a[userSortBy];
    let bValue: any = b[userSortBy];

    if (userSortBy === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (userSortBy === 'is_active') {
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (userSortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

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

  const exportToPDF = () => {
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

  const exportToXLSX = () => {
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
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
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
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: t('toast.redirect'),
        description: t('success.redirectToAccount'),
        variant: "default",
      });
      navigate('/my-account');
      return;
    }

    fetchData();
  }, [user, isAdmin, navigate, toast]);

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
        // Reset styling defaults
        background_color: 'hsl(var(--background))',
        text_color: 'hsl(var(--foreground))',
        font_size: 16,
        alignment: 'left' as const,
        padding: 16,
        margin: 8,
        border_radius: 8,
        style_class: '',
        background_gradient: '',
        border_width: 0,
        border_color: 'hsl(var(--border))',
        border_style: 'solid' as const,
        box_shadow: 'none',
        opacity: 100,
        width_type: 'full' as const,
        custom_width: 600,
        height_type: 'auto' as const,
        custom_height: 200,
        max_width: 1200,
        font_weight: 400,
        line_height: 1.5,
        letter_spacing: 0,
        text_transform: 'none' as const,
        display_type: 'block' as const,
        justify_content: 'start' as const,
        align_items: 'start' as const,
        gap: 16,
        // Reset new enhanced defaults
        section_margin_top: 24,
        section_margin_bottom: 24,
        background_image: '',
        background_image_opacity: 100,
        background_image_position: 'center',
        background_image_size: 'cover',
        icon_name: '',
        icon_position: 'left',
        icon_size: 24,
        icon_color: 'hsl(var(--foreground))',
        show_icon: false,
        content_direction: 'column',
        content_wrap: 'nowrap',
        min_height: 0,
        overflow_behavior: 'visible',
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
      const maxPosition = Math.max(...items.filter(i => i.section_id === sectionId).map(i => i.position), 0);
      
      console.log('Creating item with formatting:', {
        title_formatting: newItemTitleStyle,
        text_formatting: newItemTextStyle,
        item: newItem
      });

      const { data, error } = await supabase
        .from('cms_items')
        .insert({
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
      const { error } = await supabase
        .from('cms_items')
        .update({
          ...updates,
          cells: updates.cells ? convertCellsToDatabase(updates.cells) : undefined
        })
        .eq('id', itemId);

      if (error) throw error;

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
          <img src={newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile layout - stacked */}
          <div className="flex flex-col gap-4 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={newPureLifeLogo} alt="Pure Life" className="w-6 h-6" />
                <h1 className="text-lg font-bold text-foreground">{t('admin.title')}</h1>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <ThemeSelector />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="secondary" className="text-xs self-start">Administrator</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  {t('nav.home')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop layout - horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={newPureLifeLogo} alt="Pure Life" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-foreground">{t('admin.title')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-xs">Administrator</Badge>
              <div className="flex gap-2">
                <LanguageSelector />
                <ThemeSelector />
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  <Home className="w-4 h-4 mr-2" />
                  {t('nav.home')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* CMS Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-1 sm:gap-2">
              <Settings2 className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline text-xs sm:text-sm">{t('admin.main')}</span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Layout</span>
            </TabsTrigger>
            <TabsTrigger value="fonts" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.fonts')}</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.colors')}</span>
            </TabsTrigger>
            <TabsTrigger value="text-editor" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.textEditor')}</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.pages')}</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.account')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{t('admin.users')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
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
            </div>
            
            {/* Section Management */}
            <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">{t('admin.sectionManagement')}</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin.addSection')}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">{t('admin.addSection')}</DialogTitle>
                  <DialogDescription className="text-sm">
                    Utwórz nową sekcję CMS
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

        <div className="grid gap-4 sm:gap-6 lg:gap-8">
          {sections.map((section) => {
            const sectionItems = items.filter(i => i.section_id === section.id);
            
            return (
              <Card key={section.id}>
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                           <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-base sm:text-lg">
                             <span className="break-words">{section.title}</span>
                              <Badge variant={section.is_active ? "default" : "secondary"} className="w-fit">
                                {section.is_active ? t('admin.active') : t('admin.inactive')}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {t('common.position')}: {section.position} | Elementów: {sectionItems.length}
                            </CardDescription>
                           <div className="flex flex-wrap gap-2 mt-2">
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
                                 <label htmlFor={`section-anonymous-${section.id}`} className="text-sm">Widoczny dla niezalogowanych</label>
                               </div>
                           </div>
                         </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center gap-1">
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
                          </div>
                          <Switch
                            checked={section.is_active}
                            onCheckedChange={(checked) => updateSection(section.id, { is_active: checked })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setEditingSection(section)} className="flex-1 sm:flex-none">
                          <Pencil className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">{t('admin.edit')}</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteSection(section.id)} className="flex-1 sm:flex-none">
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">{t('admin.delete')}</span>
                        </Button>
                        <ItemEditor
                          sectionId={section.id}
                          onSave={async (newItem) => {
                            try {
                              const { data, error } = await supabase
                                .from('cms_items')
                                .insert([{
                                  type: newItem.type,
                                  title: newItem.title,
                                  description: newItem.description,
                                  url: newItem.url,
                                  icon: newItem.icon,
                                  section_id: section.id,
                                  position: (items.filter(i => i.section_id === section.id).length || 0) + 1,
                                  is_active: newItem.is_active,
                                  media_url: newItem.media_url,
                                  media_type: newItem.media_type,
                                  media_alt_text: newItem.media_alt_text,
                                  cells: convertCellsToDatabase(newItem.cells || [])
                                }])
                                .select()
                                .single();

                              if (error) {
                                console.error('Error creating item:', error);
                                toast({
                                  title: "Błąd",
                                  description: "Nie udało się dodać elementu",
                                  variant: "destructive",
                                });
                              } else {
                                setItems([...items, convertDatabaseItemToCMSItem(data)]);
                                toast({
                                  title: "Element dodany",
                                  description: "Element został pomyślnie dodany do sekcji",
                                });
                              }
                            } catch (error) {
                              console.error('Error creating item:', error);
                              toast({
                                title: "Błąd",
                                description: "Nie udało się dodać elementu",
                                variant: "destructive",
                              });
                            }
                          }}
                          isNew={true}
                          trigger={
                              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                <Plus className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t('admin.addItem')}</span>
                                <span className="sm:hidden">{t('admin.addItem')}</span>
                              </Button>
                          }
                        />
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {sectionItems.map((item) => (
                       <div key={item.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-gray-50/50">
                           <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                             <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{item.type}</Badge>
                              <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                                {item.is_active ? t('admin.active') : t('admin.inactive')}
                              </Badge>
                            </div>
                           <h4 className="font-medium text-sm sm:text-base text-gray-900 mb-1 break-words">
                             {item.title || 'Bez tytułu'}
                           </h4>
                                {item.media_url && (
                                  <div className="mt-2 mb-2">
                                    <SecureMedia
                                      mediaUrl={item.media_url}
                                      mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                                      altText={item.media_alt_text || ''}
                                      className="w-20 h-20 object-cover rounded border"
                                    />
                                  </div>
                                )}
                                {item.description && (
                                  <p className="text-xs sm:text-sm text-gray-600 break-words line-clamp-3">
                                    {item.description.length > 100 
                                      ? `${item.description.substring(0, 100)}...` 
                                      : item.description
                                    }
                                  </p>
                                )}
                               {item.url && (
                                 <p className="text-xs text-blue-600 mt-1 break-all">
                                   {item.url.length > 50 ? `${item.url.substring(0, 50)}...` : item.url}
                                 </p>
                               )}
                             </div>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             <Switch
                               checked={item.is_active}
                               onCheckedChange={(checked) => updateItem(item.id, { is_active: checked })}
                               className="mr-2"
                             />
                              <ItemEditor
                                item={{
                                  ...item,
                                  media_type: item.media_type as "" | "audio" | "video" | "image" | "document" | "other"
                                }}
                                sectionId={item.section_id}
                                onSave={(updatedItem) => {
                                  updateItem(updatedItem.id!, {
                                    type: updatedItem.type,
                                    title: updatedItem.title,
                                    description: updatedItem.description,
                                    url: updatedItem.url,
                                    position: updatedItem.position,
                                    is_active: updatedItem.is_active,
                                    media_url: updatedItem.media_url,
                                    media_type: updatedItem.media_type as any,
                                    media_alt_text: updatedItem.media_alt_text,
                                    cells: updatedItem.cells
                                  });
                                }}
                                trigger={
                                 <Button 
                                   variant="outline" 
                                   size="sm" 
                                   className="flex-1 sm:flex-none"
                                 >
                                   <Pencil className="w-4 h-4 sm:mr-2" />
                                   <span className="hidden sm:inline">{t('admin.edit')}</span>
                                 </Button>
                                }
                              />
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => deleteItem(item.id)}
                              className="flex-1 sm:flex-none"
                            >
                              <Trash2 className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">{t('admin.delete')}</span>
                            </Button>
                           </div>
                       </div>
                     ))}
                      {sectionItems.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {t('admin.noElementsInSection')}
                        </p>
                      )}
                   </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          </TabsContent>

          <TabsContent value="layout">
            <LivePreviewEditor />
          </TabsContent>

          <TabsContent value="fonts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>{t('admin.fonts')}</span>
                </CardTitle>
                <CardDescription>
                  Dostosuj czcionki używane w aplikacji
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FontEditor />
              </CardContent>
            </Card>
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

          <TabsContent value="text-editor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>{t('admin.textEditor')}</span>
                </CardTitle>
                <CardDescription>
                  Zaawansowany edytor do formatowania treści
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TextEditor 
                  placeholder="Używaj tego edytora do formatowania zawartości..."
                  onSave={(text, style) => {
                    toast({
                      title: "Tekst sformatowany",
                      description: "Skopiuj sformatowany tekst do elementów CMS",
                    });
                  }}
                />
              </CardContent>
            </Card>
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
                     <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0">
                       <div className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           id="new-page-partners"
                           checked={newPage.visible_to_partners}
                           onChange={(e) => setNewPage({...newPage, visible_to_partners: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                         <Label htmlFor="new-page-partners">{t('admin.visibleToPartners')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           id="new-page-clients"
                           checked={newPage.visible_to_clients}
                           onChange={(e) => setNewPage({...newPage, visible_to_clients: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                         <Label htmlFor="new-page-clients">{t('admin.visibleToClients')}</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           id="new-page-everyone"
                           checked={newPage.visible_to_everyone}
                           onChange={(e) => setNewPage({...newPage, visible_to_everyone: e.target.checked})}
                           className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                         />
                          <Label htmlFor="new-page-everyone">{t('admin.visibleToEveryone')}</Label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <input
                             type="checkbox"
                             id="new-page-specjalista"
                             checked={newPage.visible_to_specjalista}
                             onChange={(e) => setNewPage({...newPage, visible_to_specjalista: e.target.checked})}
                             className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                           />
                           <Label htmlFor="new-page-specjalista">{t('admin.visibleToSpecialists')}</Label>
                         </div>
                         <div className="flex items-center space-x-2">
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
                                 <div className="flex flex-wrap gap-2 mt-2">
                                   <div className="flex items-center space-x-2">
                                     <input
                                       type="checkbox"
                                       id={`partner-${page.id}`}
                                       checked={page.visible_to_partners}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_partners: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                     <label htmlFor={`partner-${page.id}`} className="text-sm">{t('admin.visibleToPartners')}</label>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                     <input
                                       type="checkbox"
                                       id={`client-${page.id}`}
                                       checked={page.visible_to_clients}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_clients: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                     <label htmlFor={`client-${page.id}`} className="text-sm">{t('admin.visibleToClients')}</label>
                                   </div>
                                   <div className="flex items-center space-x-2">
                                     <input
                                       type="checkbox"
                                       id={`everyone-${page.id}`}
                                       checked={page.visible_to_everyone}
                                       onChange={(e) => updatePageVisibility(page.id, { visible_to_everyone: e.target.checked })}
                                       className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                     />
                                      <label htmlFor={`everyone-${page.id}`} className="text-sm">{t('admin.visibleToEveryone')}</label>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                       <input
                                         type="checkbox"
                                         id={`specjalista-${page.id}`}
                                         checked={page.visible_to_specjalista}
                                         onChange={(e) => updatePageVisibility(page.id, { visible_to_specjalista: e.target.checked })}
                                         className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                       />
                                       <label htmlFor={`specjalista-${page.id}`} className="text-sm">{t('admin.visibleToSpecialists')}</label>
                                     </div>
                                     <div className="flex items-center space-x-2">
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
              <CardHeader>
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
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                          Łączna liczba klientów: {users.length}
                        </p>
                        <Button variant="outline" size="sm" onClick={fetchUsers}>
                          Odśwież listę
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => setShowCreateUserDialog(true)}
                          size="sm"
                          className="gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Dodaj klienta
                        </Button>
                        
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={exportToPDF}>
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={exportToXLSX}>
                            <Download className="w-4 h-4 mr-1" />
                            XLS
                          </Button>
                          <Button variant="outline" size="sm" onClick={exportToXML}>
                            <Download className="w-4 h-4 mr-1" />
                            XML
                          </Button>
                          <Button variant="outline" size="sm" onClick={exportToZIP}>
                            <Download className="w-4 h-4 mr-1" />
                            ZIP
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Sorting Controls */}
                    <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <SortAsc className="w-4 h-4" />
                      <span className="text-sm font-medium">Sortuj według:</span>
                      <Select value={userSortBy} onValueChange={(value: any) => setUserSortBy(value)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="role">Rola</SelectItem>
                          <SelectItem value="is_active">Status</SelectItem>
                          <SelectItem value="created_at">Data utworzenia</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={userSortOrder} onValueChange={(value: any) => setUserSortOrder(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Rosnąco</SelectItem>
                          <SelectItem value="desc">Malejąco</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      {sortedUsers.map((userProfile) => (
                        <Card key={userProfile.id} className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{userProfile.email}</span>
                                    {userProfile.first_name && userProfile.last_name && (
                                      <span className="text-xs text-muted-foreground">
                                        {userProfile.first_name} {userProfile.last_name}
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant={
                                    userProfile.role === 'admin' ? 'default' : 
                                    userProfile.role === 'partner' ? 'outline' : 
                                    userProfile.role === 'specjalista' ? 'outline' : 
                                    'secondary'
                                  } className="text-xs">
                                    {getRoleDisplayName(userProfile.role)}
                                  </Badge>
                                  <Badge variant={userProfile.is_active ? 'default' : 'destructive'} className="text-xs">
                                    {userProfile.is_active ? 'Aktywny' : 'Nieaktywny'}
                                  </Badge>
                                  {userProfile.email_confirmed_at ? (
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Email potwierdzony
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Oczekuje potwierdzenia
                                    </Badge>
                                  )}
                                </div>
                               <p className="text-xs text-muted-foreground">
                                  Utworzono: {new Date(userProfile.created_at).toLocaleDateString('pl-PL')}
                                </p>
                                {userProfile.eq_id && (
                                  <p className="text-xs text-muted-foreground">
                                    EQ ID: {userProfile.eq_id}
                                  </p>
                                )}
                                {userProfile.email_confirmed_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Email potwierdzony: {new Date(userProfile.email_confirmed_at).toLocaleDateString('pl-PL')}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  ID: {userProfile.user_id.slice(0, 8)}...
                                </p>
                             </div>
                            
                              <div className="flex flex-col sm:flex-row gap-2">
                                {!userProfile.email_confirmed_at && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => confirmUserEmail(userProfile.user_id)}
                                    className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                                  >
                                    <Mail className="w-3 h-3 mr-1" />
                                    Potwierdź email
                                  </Button>
                                )}
                                
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => resetUserPassword(userProfile.email)}
                                   disabled={passwordLoading}
                                   className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                 >
                                   <Key className="w-3 h-3 mr-1" />
                                   {passwordLoading ? 'Generowanie...' : 'Resetuj hasło'}
                                 </Button>
                                 
                                 {userProfile.user_id !== user?.id && (
                                   <Button
                                     variant={userProfile.is_active ? "destructive" : "default"}
                                     size="sm"
                                     onClick={() => toggleUserStatus(userProfile.user_id, userProfile.is_active)}
                                     className="text-xs"
                                   >
                                     {userProfile.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                                   </Button>
                                 )}
                                
                                {userProfile.role === 'user' || userProfile.role === 'client' ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateUserRole(userProfile.user_id, 'admin')}
                                      className="text-xs"
                                    >
                                      <Users className="w-3 h-3 mr-1" />
                                      Awansuj na Admin
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateUserRole(userProfile.user_id, 'partner')}
                                      className="text-xs"
                                    >
                                      <Users className="w-3 h-3 mr-1" />
                                      Ustaw jako Partner
                                    </Button>
                                  </>
                                ) : userProfile.role === 'partner' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateUserRole(userProfile.user_id, 'user')}
                                    className="text-xs"
                                  >
                                    <Users className="w-3 h-3 mr-1" />
                                    Zmień na Klienta
                                  </Button>
                                ) : userProfile.role === 'admin' ? (
                                  userProfile.user_id === user?.id ? (
                                    <Badge variant="default" className="text-xs">
                                      Twoje konto
                                    </Badge>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateUserRole(userProfile.user_id, 'user')}
                                      className="text-xs"
                                    >
                                      <Users className="w-3 h-3 mr-1" />
                                      Zmień na Klienta
                                    </Button>
                                  )
                                ) : null}
                              </div>
                          </div>
                        </Card>
                      ))}
                      
                      {users.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Brak klientów w systemie</p>
                        </div>
                      )}
                    </div>
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
                     <div className="flex items-center justify-between">
                       <h3 className="text-lg font-medium">Zarządzanie zawartością CMS</h3>
                       <p className="text-sm text-muted-foreground">
                         Dodawaj sekcje i elementy do tej strony
                       </p>
                     </div>

                     {/* Add New Section and Element */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base">Dodaj nową sekcję</CardTitle>
                           <CardDescription>
                             Utwórz nową sekcję z pełnym edytorem stylów i opcji
                           </CardDescription>
                         </CardHeader>
                         <CardContent>
                           <Button 
                             onClick={() => setShowAddPageSectionEditor(true)}
                             className="w-full"
                           >
                             <Plus className="w-4 h-4 mr-2" />
                             Dodaj sekcję
                           </Button>
                         </CardContent>
                       </Card>

                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base">Dodaj nowy element</CardTitle>
                         <CardDescription>
                           Dodaj element bezpośrednio do strony (bez sekcji)
                         </CardDescription>
                         </CardHeader>
                         <CardContent>
                           <ItemEditor
                             sectionId="" // Empty for page-level items
                             onSave={async (newItem) => {
                               try {
                                 const { data, error } = await supabase
                                   .from('cms_items')
                                   .insert([{
                                     type: newItem.type,
                                     title: newItem.title,
                                     description: newItem.description,
                                     url: newItem.url,
                                     icon: newItem.icon,
                                     section_id: null, // No section, directly to page
                                     page_id: editingPage.id,
                                     position: (pageItems.filter(i => !i.section_id).length || 0) + 1,
                                     is_active: newItem.is_active,
                                     media_url: newItem.media_url,
                                     media_type: newItem.media_type,
                                     media_alt_text: newItem.media_alt_text,
                                     background_color: newItem.background_color,
                                     text_color: newItem.text_color,
                                     font_size: newItem.font_size,
                                     font_weight: newItem.font_weight,
                                     border_radius: newItem.border_radius,
                                     padding: newItem.padding,
                                     style_class: newItem.style_class,
                                     cells: convertCellsToDatabase(newItem.cells || [])
                                   }])
                                   .select()
                                   .single();

                                 if (error) {
                                   console.error('Error creating page item:', error);
                                   toast({
                                     title: "Błąd",
                                     description: "Nie udało się dodać elementu",
                                     variant: "destructive",
                                   });
                                 } else {
                                   setPageItems([...pageItems, convertDatabaseItemToCMSItem(data)]);
                                   toast({
                                     title: "Element dodany",
                                     description: "Element został pomyślnie dodany do strony",
                                   });
                                 }
                               } catch (error) {
                                 console.error('Error creating page item:', error);
                                 toast({
                                   title: "Błąd",
                                   description: "Nie udało się dodać elementu",
                                   variant: "destructive",
                                 });
                               }
                             }}
                             isNew={true}
                             trigger={
                               <Button className="w-full">
                                 <Plus className="w-4 h-4 mr-2" />
                                 Dodaj element
                               </Button>
                             }
                           />
                         </CardContent>
                       </Card>
                     </div>

                     {/* Page-level Items (without sections) */}
                     {pageItems.filter(item => !item.section_id).length > 0 && (
                       <Card>
                         <CardHeader>
                           <CardTitle className="text-base">Elementy strony</CardTitle>
                           <CardDescription>
                             Elementy dodane bezpośrednio do strony (bez sekcji)
                           </CardDescription>
                         </CardHeader>
                         <CardContent>
                           <div className="space-y-3">
                             {pageItems
                               .filter(item => !item.section_id)
                               .map((item) => (
                                 <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                   <div className="flex-1">
                                     <div className="flex items-center space-x-2">
                                       <Badge variant="outline">{item.type}</Badge>
                                       <h5 className="font-medium">{item.title}</h5>
                                     </div>
                                     {item.media_url && (
                                       <div className="mt-2 mb-2">
                                         <SecureMedia
                                           mediaUrl={item.media_url}
                                           mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                                           altText={item.media_alt_text || ''}
                                           className="w-16 h-16 object-cover rounded border"
                                         />
                                       </div>
                                     )}
                                     {item.description && (
                                       <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                         <span dangerouslySetInnerHTML={{ __html: item.description }} />
                                       </p>
                                     )}
                                   </div>
                                   <div className="flex items-center space-x-2">
                                     <ItemEditor
                                       item={{
                                         ...item,
                                         media_type: item.media_type as "" | "audio" | "video" | "image" | "document" | "other"
                                       }}
                                       sectionId="" // Empty for page-level items
                                       onSave={(updatedItem) => {
                                         updatePageItem(updatedItem.id!, {
                                           type: updatedItem.type,
                                           title: updatedItem.title,
                                           description: updatedItem.description,
                                           url: updatedItem.url,
                                           position: updatedItem.position,
                                           is_active: updatedItem.is_active,
                                           media_url: updatedItem.media_url,
                                           media_type: updatedItem.media_type as any,
                                           media_alt_text: updatedItem.media_alt_text,
                                           background_color: updatedItem.background_color,
                                           text_color: updatedItem.text_color,
                                           font_size: updatedItem.font_size,
                                           font_weight: updatedItem.font_weight,
                                           border_radius: updatedItem.border_radius,
                                           padding: updatedItem.padding,
                                           style_class: updatedItem.style_class,
                                           cells: updatedItem.cells
                                         });
                                       }}
                                       trigger={
                                         <Button variant="outline" size="sm">
                                           <Pencil className="w-4 h-4" />
                                         </Button>
                                       }
                                     />
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => deletePageItem(item.id)}
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </Button>
                                   </div>
                                 </div>
                               ))}
                           </div>
                         </CardContent>
                       </Card>
                     )}

                     {/* Existing Sections */}
                     <div className="space-y-4">
                       <h4 className="text-lg font-medium">Sekcje ze strukturą</h4>
                       {pageSections.length === 0 ? (
                         <div className="text-center py-8 text-muted-foreground">
                           <p>Brak sekcji. Dodaj pierwszą sekcję aby rozpocząć.</p>
                         </div>
                       ) : (
                         pageSections.map((section) => (
                          <Card key={section.id}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{section.title}</CardTitle>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingPageSection(section)}
                                  title="Edytuj sekcję"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deletePageSection(section.id)}
                                  title="Usuń sekcję"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <SectionEditor
                                  onSave={async (newSection) => {
                                    try {
                                      const { data, error } = await supabase
                                        .from('cms_sections')
                                        .insert([{
                                          ...newSection,
                                          page_id: editingPage.id,
                                          parent_id: section.id, // Ustawia sekcję jako zagnieżdżoną w obecnej sekcji
                                          position: (pageSections.filter(s => s.parent_id === section.id).length || 0) + 1
                                        }])
                                        .select()
                                        .single();

                                      if (error) {
                                        console.error('Error creating nested section:', error);
                                        toast({
                                          title: "Błąd",
                                          description: "Nie udało się dodać sekcji zagnieżdżonej",
                                          variant: "destructive",
                                        });
                                       } else {
                                         // Aktualizuj sekcje zagnieżdżone w stanie
                                         const currentNested = nestedSections[section.id] || [];
                                          setNestedSections({
                                            ...nestedSections,
                                            [section.id]: [...currentNested, convertSupabaseSection(data)]
                                          });
                                         toast({
                                           title: "Sekcja zagnieżdżona dodana",
                                           description: "Sekcja została pomyślnie dodana jako zagnieżdżona w obecnej sekcji",
                                         });
                                       }
                                    } catch (error) {
                                      console.error('Error creating nested section:', error);
                                      toast({
                                        title: "Błąd",
                                        description: "Nie udało się dodać sekcji zagnieżdżonej",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  isNew={true}
                                  allowSizeEditing={false}
                                  trigger={
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      title="Dodaj sekcję zagnieżdżoną"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Sekcja
                                    </Button>
                                  }
                                />
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => setSelectedPageSection(selectedPageSection?.id === section.id ? null : section)}
                                   title={t('admin.addElementToSection')}
                                 >
                                   <Plus className="w-4 h-4 mr-1" />
                                   {t('admin.addElement')}
                                 </Button>
                              </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {/* Add Item Form */}
                              {selectedPageSection?.id === section.id && (
                                 <div className="mb-6 p-4 border rounded-lg bg-muted/50">
                                   <h4 className="font-medium mb-4">{t('admin.addElementToSection')}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="new-page-item-type">Typ elementu</Label>
                                      <Select value={newPageItem.type} onValueChange={(value) => setNewPageItem({...newPageItem, type: value})}>
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
                                      <Label htmlFor="new-page-item-title">Tytuł</Label>
                                      <Input
                                        id="new-page-item-title"
                                        value={newPageItem.title}
                                        onChange={(e) => setNewPageItem({...newPageItem, title: e.target.value})}
                                        placeholder="Tytuł elementu"
                                      />
                                    </div>
                                  </div>
                                   <div className="mt-4">
                                     <Label htmlFor="new-page-item-description">Opis Elementu</Label>
                                     <RichTextEditor
                                       value={newPageItem.description}
                                       onChange={(value) => setNewPageItem({...newPageItem, description: value})}
                                       placeholder="Opis elementu"
                                       rows={3}
                                       className="mt-1"
                                     />
                                   </div>
                                  {newPageItem.type === 'button' && (
                                    <div className="mt-4">
                                      <Label htmlFor="new-page-item-url">URL</Label>
                                      <Input
                                        id="new-page-item-url"
                                        value={newPageItem.url}
                                        onChange={(e) => setNewPageItem({...newPageItem, url: e.target.value})}
                                        placeholder="https://example.com"
                                      />
                                    </div>
                                  )}
                                  <div className="flex gap-2 mt-4">
                                    <ItemEditor
                                      sectionId={section.id}
                                      onSave={async (newItem) => {
                                        try {
                                          const { data, error } = await supabase
                                            .from('cms_items')
                                            .insert([{
                                              type: newItem.type,
                                              title: newItem.title,
                                              description: newItem.description,
                                              url: newItem.url,
                                              icon: newItem.icon,
                                              section_id: section.id,
                                              page_id: editingPage.id,
                                              position: (pageItems.filter(i => i.section_id === section.id).length || 0) + 1,
                                              is_active: newItem.is_active,
                                              media_url: newItem.media_url,
                                              media_type: newItem.media_type,
                                              media_alt_text: newItem.media_alt_text,
                                              cells: convertCellsToDatabase(newItem.cells || [])
                                            }])
                                            .select()
                                            .single();

                                          if (error) {
                                            console.error('Error creating item:', error);
                                            toast({
                                              title: "Błąd",
                                              description: "Nie udało się dodać elementu",
                                              variant: "destructive",
                                            });
                                          } else {
                                            setPageItems([...pageItems, convertDatabaseItemToCMSItem(data)]);
                                            toast({
                                              title: "Element dodany",
                                              description: "Element został pomyślnie dodany do sekcji",
                                            });
                                          }
                                        } catch (error) {
                                          console.error('Error creating item:', error);
                                          toast({
                                            title: "Błąd",
                                            description: "Nie udało się dodać elementu",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      isNew={true}
                                       trigger={
                                         <Button disabled={false}>
                                           <Plus className="w-4 h-4 mr-2" />
                                           {t('admin.addElementWithCells')}
                                         </Button>
                                       }
                                    />
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedPageSection(null)}
                                    >
                                      Anuluj
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Section Items */}
                              <div className="space-y-3">
                                {pageItems
                                  .filter(item => item.section_id === section.id)
                                  .map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                       <div className="flex-1">
                                         <div className="flex items-center space-x-2">
                                           <Badge variant="outline">{item.type}</Badge>
                                           <h5 className="font-medium">{item.title}</h5>
                                         </div>
                                         {item.media_url && (
                                           <div className="mt-2 mb-2">
                                             <SecureMedia
                                               mediaUrl={item.media_url}
                                               mediaType={item.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                                               altText={item.media_alt_text || ''}
                                               className="w-16 h-16 object-cover rounded border"
                                             />
                                           </div>
                                         )}
                                         {item.description && (
                                           <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                             {item.description}
                                           </p>
                                         )}
                                       </div>
                                      <div className="flex items-center space-x-2">
                                        <ItemEditor
                                          item={{
                                            ...item,
                                            media_type: item.media_type as "" | "audio" | "video" | "image" | "document" | "other"
                                          }}
                                          sectionId={item.section_id}
                                          onSave={(updatedItem) => {
                                            updatePageItem(updatedItem.id!, {
                                              type: updatedItem.type,
                                              title: updatedItem.title,
                                              description: updatedItem.description,
                                              url: updatedItem.url,
                                              position: updatedItem.position,
                                              is_active: updatedItem.is_active,
                                              media_url: updatedItem.media_url,
                                              media_type: updatedItem.media_type as any,
                                              media_alt_text: updatedItem.media_alt_text,
                                              cells: updatedItem.cells
                                            });
                                          }}
                                          trigger={
                                            <Button variant="outline" size="sm">
                                              <Pencil className="w-4 h-4" />
                                            </Button>
                                          }
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => deletePageItem(item.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                               </div>
                               
                                {/* Sekcje zagnieżdżone */}
                                {nestedSections[section.id] && nestedSections[section.id].length > 0 && (
                                  <div className="mt-6 pl-4 border-l-2 border-muted">
                                    <h5 className="font-medium mb-3 text-sm text-muted-foreground">{t('admin.nestedSections')}:</h5>
                                   <div className="space-y-2">
                                     {nestedSections[section.id].map((nestedSection) => (
                                       <div key={nestedSection.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                                         <div className="flex-1">
                                           <h6 className="font-medium text-sm">{nestedSection.title}</h6>
                                           {nestedSection.description && (
                                             <p className="text-xs text-muted-foreground">{nestedSection.description}</p>
                                           )}
                                         </div>
                                         <div className="flex items-center space-x-1">
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               onClick={() => setEditingPageSection(nestedSection)}
                                               title={t('admin.editNestedSection')}
                                             >
                                               <Pencil className="w-3 h-3" />
                                             </Button>
                                             <Button
                                               variant="ghost"
                                               size="sm"
                                               onClick={() => deletePageSection(nestedSection.id)}
                                               title={t('admin.deleteNestedSection')}
                                             >
                                               <Trash2 className="w-3 h-3" />
                                             </Button>
                                         </div>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               )}
                             </CardContent>
                          </Card>
                        ))
                       )}
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
    </div>
  );
};

export default Admin;