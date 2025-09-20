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
import { supabase } from '@/integrations/supabase/client';
import { Pencil, Plus, Trash2, LogOut, Home, Save, ChevronUp, ChevronDown, Palette, Type, Settings2, Users, CheckCircle, Clock, Mail, FileText, Download, SortAsc, UserPlus } from 'lucide-react';
import { MediaUpload } from '@/components/MediaUpload';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { TextEditor } from '@/components/cms/TextEditor';
import { FontEditor } from '@/components/cms/FontEditor';
import { ColorSchemeEditor } from '@/components/cms/ColorSchemeEditor';
import { ThemeSelector } from '@/components/ThemeSelector';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

interface CMSSection {
  id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
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
}

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
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
  const [newItem, setNewItem] = useState({
    type: 'button',
    title: '',
    description: '',
    url: '',
    icon: '',
    media_url: '',
    media_type: '' as 'image' | 'video' | '',
    media_alt_text: '',
  });
  const [newSection, setNewSection] = useState({
    title: '',
    position: 0,
  });
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: false,
    position: 0,
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
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // New user creation state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'client' | 'admin' | 'partner'
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  
  // User sorting state
  const [userSortBy, setUserSortBy] = useState<'email' | 'role' | 'created_at' | 'is_active'>('created_at');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Enable security preventions
  useSecurityPreventions();

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
        title: "Błąd",
        description: "Nie udało się załadować klientów.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'client' | 'admin' | 'partner') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: "Sukces",
        description: `Rola klienta została zmieniona na ${getRoleDisplayName(newRole)}.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić roli klienta.",
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
          title: "Sukces",
          description: "Email klienta został potwierdzony.",
        });
        // Refresh users list to show updated status
        fetchUsers();
      } else {
        toast({
          title: "Informacja",
          description: "Email był już wcześniej potwierdzony.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error confirming user email:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się potwierdzić emaila klienta.",
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
        title: "Błąd",
        description: error.message || "Nie udało się zmienić statusu klienta.",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      toast({
        title: "Błąd",
        description: "Podaj aktualne hasło.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Błąd",
        description: "Hasła nie są identyczne.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Błąd", 
        description: "Hasło musi mieć co najmniej 6 znaków.",
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
          title: "Błąd",
          description: "Aktualne hasło jest nieprawidłowe.",
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
        title: "Sukces",
        description: "Hasło zostało zmienione.",
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zmienić hasła.",
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
        title: "Błąd",
        description: "Wypełnij wszystkie pola.",
        variant: "destructive",
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Błąd",
        description: "Hasło musi mieć co najmniej 6 znaków.",
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
        // Update the user role if admin or partner
        if (newUser.role === 'admin' || newUser.role === 'partner') {
          const { error: roleError } = await supabase
            .from('profiles')
            .update({ role: newUser.role })
            .eq('user_id', data.user.id);

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
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć klienta.",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
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
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
    if (activeTab === 'pages' && isAdmin) {
      fetchPages();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Przekierowanie",
        description: "Zostaniesz przekierowany na stronę Moje konto.",
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

      setSections(sectionsData || []);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching CMS data:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych CMS.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSection = async () => {
    try {
      const maxPosition = Math.max(...sections.map(s => s.position), 0);
      
      const { data, error } = await supabase
        .from('cms_sections')
        .insert({
          title: newSection.title,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setSections([...sections, data]);
      setNewSection({ title: '', position: 0 });
      toast({
        title: "Sukces",
        description: "Nowa sekcja została utworzona.",
      });
    } catch (error) {
      console.error('Error creating section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć sekcji.",
        variant: "destructive",
      });
    }
  };

  const deleteSection = async (sectionId: string) => {
    try {
      // First delete all items in the section
      const { error: itemsError } = await supabase
        .from('cms_items')
        .delete()
        .eq('section_id', sectionId);

      if (itemsError) throw itemsError;

      // Then delete the section
      const { error: sectionError } = await supabase
        .from('cms_sections')
        .delete()
        .eq('id', sectionId);

      if (sectionError) throw sectionError;

      setSections(sections.filter(s => s.id !== sectionId));
      setItems(items.filter(i => i.section_id !== sectionId));
      toast({
        title: "Sukces",
        description: "Sekcja została usunięta.",
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sekcji.",
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
        title: "Pozycja zmieniona",
        description: "Sekcja została przesunięta w górę.",
      });
    } catch (error) {
      console.error('Error moving section up:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić pozycji sekcji.",
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
        title: "Pozycja zmieniona", 
        description: "Sekcja została przesunięta w dół.",
      });
    } catch (error) {
      console.error('Error moving section down:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić pozycji sekcji.",
        variant: "destructive",
      });
    }
  };

  const updateSection = async (sectionId: string, updates: Partial<CMSSection>) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update(updates)
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
      setEditingSection(null);
      toast({
        title: "Sukces",
        description: "Sekcja została zaktualizowana.",
      });
    } catch (error) {
      console.error('Error updating section:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować sekcji.",
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

      setItems([...items, data]);
      setNewItem({ 
        type: 'button', 
        title: '', 
        description: '', 
        url: '', 
        icon: '',
        media_url: '',
        media_type: '' as 'image' | 'video' | '',
        media_alt_text: '',
      });
      setNewItemTitleStyle(null);
      setNewItemTextStyle(null);
      setNewItemTitleMode(false);
      setNewItemTextMode(false);
      toast({
        title: "Sukces",
        description: "Element został dodany.",
      });
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać elementu.",
        variant: "destructive",
      });
    }
  };

  const updateItem = async (itemId: string, updates: Partial<CMSItem>) => {
    try {
      console.log('Updating item with data:', updates);
      
      const { error } = await supabase
        .from('cms_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.map(i => i.id === itemId ? { ...i, ...updates } : i));
      setEditingItem(null);
      toast({
        title: "Sukces",
        description: "Element został zaktualizowany.",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować elementu.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter(i => i.id !== itemId));
      toast({
        title: "Sukces",
        description: "Element został usunięty.",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć elementu.",
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
      });
      
      toast({
        title: "Strona utworzona",
        description: "Nowa strona została pomyślnie utworzona.",
      });
    } catch (error) {
      console.error('Create page error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć strony.",
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
        title: "Strona zaktualizowana",
        description: "Strona została pomyślnie zaktualizowana.",
      });
    } catch (error) {
      console.error('Update page error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować strony.",
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
        title: "Strona usunięta",
        description: "Strona została pomyślnie usunięta.",
      });
    } catch (error) {
      console.error('Delete page error:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć strony.",
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
          <p className="text-muted-foreground">Ładowanie panelu administracyjnego...</p>
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
                <h1 className="text-lg font-bold text-foreground">Panel CMS - Pure Life</h1>
              </div>
              <ThemeSelector />
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant="secondary" className="text-xs self-start">Administrator</Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Strona główna
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1">
                  <LogOut className="w-4 h-4 mr-2" />
                  Wyloguj
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop layout - horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={newPureLifeLogo} alt="Pure Life" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-foreground">Panel CMS - Pure Life</h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-xs">Administrator</Badge>
              <div className="flex gap-2">
                <ThemeSelector />
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  <Home className="w-4 h-4 mr-2" />
                  Strona główna
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Wyloguj
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* CMS Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Zawartość</span>
            </TabsTrigger>
            <TabsTrigger value="fonts" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Czcionki</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Kolory</span>
            </TabsTrigger>
            <TabsTrigger value="text-editor" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Edytor</span>
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Strony</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Konto</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Użytkownicy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            {/* Section Management */}
            <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold">Zarządzanie sekcjami</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj sekcję
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Dodaj nową sekcję</DialogTitle>
                  <DialogDescription className="text-sm">
                    Utwórz nową sekcję CMS
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="section-title" className="text-sm font-medium">Tytuł sekcji</Label>
                    <Input
                      id="section-title"
                      value={newSection.title}
                      onChange={(e) => setNewSection({...newSection, title: e.target.value})}
                      placeholder="Nazwa sekcji"
                      className="mt-1 h-10"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={createSection} 
                    disabled={!newSection.title.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Utwórz sekcję
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
                              {section.is_active ? "Aktywna" : "Nieaktywna"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Pozycja: {section.position} | Elementów: {sectionItems.length}
                          </CardDescription>
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
                          <span className="hidden sm:inline">Edytuj</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteSection(section.id)} className="flex-1 sm:flex-none">
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Usuń</span>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                              <Plus className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Dodaj element</span>
                              <span className="sm:hidden">Dodaj</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Dodaj nowy element</DialogTitle>
                              <DialogDescription className="text-sm">
                                Dodaj nowy element do sekcji "{section.title}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div>
                                <Label htmlFor="type" className="text-sm font-medium">Typ</Label>
                                <Select value={newItem.type} onValueChange={(value) => setNewItem({...newItem, type: value})}>
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
                                   <Label htmlFor="title" className="text-sm font-medium">Tytuł</Label>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setNewItemTitleMode(!newItemTitleMode)}
                                     className="h-7"
                                   >
                                     <Type className="w-3 h-3 mr-1" />
                                     {newItemTitleMode ? 'Prosty' : 'Zaawansowany'}
                                   </Button>
                                 </div>
                                 
                                 {newItemTitleMode ? (
                                   <TextEditor
                                     initialText={newItem.title}
                                     initialStyle={newItemTitleStyle}
                                     onSave={(text, style) => {
                                       setNewItem({...newItem, title: text});
                                       setNewItemTitleStyle(style);
                                       setNewItemTitleMode(false);
                                     }}
                                     placeholder="Sformatuj tytuł za pomocą edytora..."
                                   />
                                 ) : (
                                   <Input
                                     id="title"
                                     value={newItem.title}
                                     onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                                     placeholder="Nazwa elementu"
                                     className="mt-1 h-10"
                                   />
                                 )}
                               </div>
                               <div>
                                 <div className="flex items-center justify-between mb-2">
                                   <Label htmlFor="description" className="text-sm font-medium">Opis</Label>
                                   <Button
                                     variant="outline"
                                     size="sm"
                                     onClick={() => setNewItemTextMode(!newItemTextMode)}
                                     className="h-7"
                                   >
                                     <Type className="w-3 h-3 mr-1" />
                                     {newItemTextMode ? 'Prosty' : 'Zaawansowany'}
                                   </Button>
                                 </div>
                                 
                                 {newItemTextMode ? (
                                    <TextEditor
                                      initialText={newItem.description}
                                      initialStyle={newItemTextStyle}
                                      onSave={(text, style) => {
                                        console.log('New item text save:', { text, style });
                                        setNewItem({...newItem, description: text});
                                        setNewItemTextStyle(style);
                                        setNewItemTextMode(false);
                                        toast({
                                          title: "Tekst sformatowany",
                                          description: "Kliknij 'Zapisz zmiany' aby zapisać element",
                                        });
                                      }}
                                      placeholder="Sformatuj tekst za pomocą edytora..."
                                    />
                                 ) : (
                                   <Textarea
                                     id="description"
                                     value={newItem.description}
                                     onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                     placeholder="Aby zaprosić nową osobę, kliknij przycisk udostępnij i podziel się materiałami."
                                     className="mt-1 min-h-[80px] resize-none"
                                     rows={3}
                                   />
                                 )}
                               </div>
                              <div>
                                <Label htmlFor="url" className="text-sm font-medium">URL</Label>
                                <Input
                                  id="url"
                                  value={newItem.url}
                                  onChange={(e) => setNewItem({...newItem, url: e.target.value})}
                                  placeholder="https://..."
                                  className="mt-1 h-10"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Plik multimedialny</Label>
                                <div className="mt-1">
                                  <MediaUpload
                                    onMediaUploaded={(url, type, altText) => setNewItem({
                                      ...newItem, 
                                      media_url: url, 
                                      media_type: type, 
                                      media_alt_text: altText || ''
                                    })}
                                    currentMediaUrl={newItem.media_url}
                                    currentMediaType={newItem.media_type as 'image' | 'video' | undefined}
                                    currentAltText={newItem.media_alt_text}
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                              <Button onClick={() => createItem(section.id)} className="w-full sm:w-auto">
                                <Save className="w-4 h-4 mr-2" />
                                Zapisz zmiany
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
                                   {item.is_active ? "Aktywny" : "Nieaktywny"}
                                 </Badge>
                               </div>
                               <h4 className="font-medium text-sm sm:text-base text-gray-900 mb-1 break-words">
                                 {item.title || 'Bez tytułu'}
                               </h4>
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
                             <Button 
                               variant="outline" 
                               size="sm" 
                onClick={() => {
                  console.log('Setting editing item:', item);
                  console.log('Item formatting:', {
                    text_formatting: item.text_formatting,
                    title_formatting: item.title_formatting
                  });
                  setEditingItem(item);
                  setItemTextStyle(item.text_formatting);
                  setItemTitleStyle(item.title_formatting);
                  setEditingItemTextMode(false);
                  setEditingItemTitleMode(false);
                }}
                               className="flex-1 sm:flex-none"
                             >
                               <Pencil className="w-4 h-4 sm:mr-2" />
                               <span className="hidden sm:inline">Edytuj</span>
                             </Button>
                             <Button 
                               variant="destructive" 
                               size="sm" 
                               onClick={() => deleteItem(item.id)}
                               className="flex-1 sm:flex-none"
                             >
                               <Trash2 className="w-4 h-4 sm:mr-2" />
                               <span className="hidden sm:inline">Usuń</span>
                             </Button>
                           </div>
                       </div>
                     ))}
                     {sectionItems.length === 0 && (
                       <p className="text-center text-muted-foreground py-8">
                         Brak elementów w tej sekcji
                       </p>
                     )}
                   </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          </TabsContent>

          <TabsContent value="fonts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>Zarządzanie czcionkami</span>
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
                  <span>Schemat kolorów</span>
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
                  <span>Edytor tekstu</span>
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
                  <span>Ustawienia konta</span>
                </CardTitle>
                <CardDescription>
                  Zarządzaj swoim kontem administratora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Informacje o koncie</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Rola:</strong> Administrator</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Zmiana hasła</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label htmlFor="current-password">Aktualne hasło</Label>
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
                      <Label htmlFor="new-password">Nowe hasło</Label>
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
                      <Label htmlFor="confirm-password">Potwierdź hasło</Label>
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
                  <span>Zarządzanie stronami</span>
                </CardTitle>
                <CardDescription>
                  Dodawaj, edytuj i usuwaj strony w systemie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Page */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dodaj nową stronę</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="page-title">Tytuł strony</Label>
                      <Input
                        id="page-title"
                        value={newPage.title}
                        onChange={(e) => setNewPage({...newPage, title: e.target.value})}
                        placeholder="Wprowadź tytuł strony"
                      />
                    </div>
                    <div>
                      <Label htmlFor="page-slug">Slug (URL)</Label>
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
                      <Label htmlFor="page-meta-title">Meta tytuł (SEO)</Label>
                      <Input
                        id="page-meta-title"
                        value={newPage.meta_title}
                        onChange={(e) => setNewPage({...newPage, meta_title: e.target.value})}
                        placeholder="Tytuł SEO"
                      />
                    </div>
                    <div>
                      <Label htmlFor="page-meta-description">Meta opis (SEO)</Label>
                      <Input
                        id="page-meta-description"
                        value={newPage.meta_description}
                        onChange={(e) => setNewPage({...newPage, meta_description: e.target.value})}
                        placeholder="Opis SEO"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="page-content">Treść strony</Label>
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
                    <Label htmlFor="page-published">Opublikuj stronę</Label>
                  </div>
                  <Button onClick={createPage} disabled={!newPage.title}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj stronę
                  </Button>
                </div>

                <Separator />

                {/* Pages List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Istniejące strony</h3>
                  {pagesLoading ? (
                    <div className="text-center py-4">Ładowanie stron...</div>
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
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingPage(page); setPageContentStyle((page as any).content_formatting || null); }}
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
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Zarządzanie klientami</span>
                </CardTitle>
                <CardDescription>
                  Zarządzaj klientami i ich rolami w systemie
                </CardDescription>
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
                                  <span className="font-medium text-sm">{userProfile.email}</span>
                                  <Badge variant={userProfile.role === 'admin' ? 'default' : userProfile.role === 'partner' ? 'outline' : 'secondary'} className="text-xs">
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
                    currentMediaType={editingItem.media_type as 'image' | 'video' | undefined}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edytuj sekcję</DialogTitle>
              <DialogDescription>
                Modyfikuj dane sekcji
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-section-title">Tytuł sekcji</Label>
                <Input
                  value={editingSection.title || ''}
                  onChange={(e) => setEditingSection({...editingSection, title: e.target.value})}
                  placeholder="Nazwa sekcji"
                />
              </div>
              <div>
                <Label htmlFor="edit-section-position">Pozycja</Label>
                <Input
                  type="number"
                  value={editingSection.position}
                  onChange={(e) => setEditingSection({...editingSection, position: parseInt(e.target.value) || 0})}
                  placeholder="Pozycja sekcji"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Anuluj
              </Button>
              <Button onClick={() => updateSection(editingSection.id, {
                title: editingSection.title,
                position: editingSection.position,
              })}>
                <Save className="w-4 h-4 mr-2" />
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Page Dialog */}
      {editingPage && (
        <Dialog open={!!editingPage} onOpenChange={() => setEditingPage(null)}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>Edytuj stronę</DialogTitle>
              <DialogDescription>
                Modyfikuj dane strony
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-6 pb-6">
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
                          ✨ Formatowanie tekstu
                        </Button>
                        {!editingPageRichText && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      const imageUrl = e.target?.result as string;
                                      const imageTag = `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`;
                                      setEditingPage({
                                        ...editingPage, 
                                        content: (editingPage.content || '') + imageTag
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                            >
                              📷 Dodaj obraz
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const videoUrl = prompt('Wprowadź URL wideo (YouTube, Vimeo itp.):');
                                if (videoUrl) {
                                  let embedTag = '';
                                  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                                    const videoId = videoUrl.includes('youtu.be') 
                                      ? videoUrl.split('/').pop()?.split('?')[0]
                                      : videoUrl.split('v=')[1]?.split('&')[0];
                                    embedTag = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="max-width: 100%;"></iframe>`;
                                  } else if (videoUrl.includes('vimeo.com')) {
                                    const videoId = videoUrl.split('/').pop();
                                    embedTag = `<iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" frameborder="0" allowfullscreen style="max-width: 100%;"></iframe>`;
                                  } else {
                                    embedTag = `<video controls style="max-width: 100%;"><source src="${videoUrl}" type="video/mp4">Twoja przeglądarka nie obsługuje elementu video.</video>`;
                                  }
                                  setEditingPage({
                                    ...editingPage, 
                                    content: (editingPage.content || '') + embedTag
                                  });
                                }
                              }}
                            >
                              📹 Dodaj wideo
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const linkUrl = prompt('Wprowadź URL:');
                                const linkText = prompt('Wprowadź tekst linku:');
                                if (linkUrl && linkText) {
                                  const linkTag = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
                                  setEditingPage({
                                    ...editingPage, 
                                    content: (editingPage.content || '') + linkTag
                                  });
                                }
                              }}
                            >
                              🔗 Dodaj link
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {editingPageRichText ? (
                        <div className="p-4">
                          <TextEditor
                            initialText={editingPage.content || ''}
                            initialStyle={pageContentStyle}
                            onSave={(text, style) => {
                              console.log('Page content rich text save:', { text, style });
                              setEditingPage({...editingPage, content: text});
                              setPageContentStyle(style);
                              setEditingPageRichText(false);
                              toast({
                                title: "Tekst sformatowany",
                                description: "Kliknij 'Zapisz zmiany' aby zapisać stronę",
                              });
                            }}
                            placeholder="Sformatuj treść strony za pomocą edytora..."
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
                        ? "Użyj edytora tekstu aby sformatować treść z zaawansowanymi opcjami stylowania."
                        : "Obsługiwane są podstawowe tagi HTML. Użyj przycisków powyżej aby dodać multimedia lub przełącz na edytor tekstu."
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
              </div>
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