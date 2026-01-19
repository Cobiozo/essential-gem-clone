import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BookOpen, 
  Users,
  Clock,
  FileText,
  ExternalLink,
  Send,
  UserPlus,
  Award,
  RefreshCw,
  Download,
  Calendar,
  Video,
  Music,
  Image as ImageIcon,
  AlignLeft,
  AlertCircle,
  Link,
  Play,
  Search,
  CheckCircle,
  MoreVertical,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/MediaUpload";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ActionButtonsEditor } from "./ActionButtonsEditor";
import { ModuleResourcesSelector } from "./ModuleResourcesSelector";
import { LessonActionButton } from "@/types/training";
// jsPDF imported dynamically when generating certificates

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  position: number;
  is_active: boolean;
  visible_to_everyone: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  resource_ids?: string[];
  created_at: string;
}

interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  media_alt_text: string;
  position: number;
  min_time_seconds: number;
  video_duration_seconds?: number;
  is_required: boolean;
  is_active: boolean;
  action_buttons?: LessonActionButton[];
}

interface UserProgress {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  eq_id?: string;
  modules: {
    module_id: string;
    module_title: string;
    assigned_at: string;
    total_lessons: number;
    completed_lessons: number;
    progress_percentage: number;
  }[];
}

interface CertificateHistory {
  id: string;
  module_id: string;
  created_at: string;
  file_url: string;
}

const TrainingManagement = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<TrainingLesson | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedModuleForUsers, setSelectedModuleForUsers] = useState<string>("");
  const [activeTab, setActiveTab] = useState("modules");
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [certificateHistory, setCertificateHistory] = useState<Record<string, CertificateHistory[]>>({});
  const [regeneratingCert, setRegeneratingCert] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const { toast } = useToast();
  const { t } = useTranslations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { generateCertificate } = useCertificateGeneration();
  const { deleteFile } = useLocalStorage();

  // Filter users by search query
  const filteredUserProgress = useMemo(() => {
    if (!userSearchQuery.trim()) return userProgress;
    const query = userSearchQuery.toLowerCase();
    return userProgress.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      (u as any).eq_id?.toLowerCase().includes(query)
    );
  }, [userProgress, userSearchQuery]);

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      fetchLessons(selectedModule);
    }
  }, [selectedModule]);

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchUserProgress();
      fetchAllCertificates();
    }
  }, [activeTab]);

  // Real-time subscription for training progress updates
  useEffect(() => {
    if (activeTab !== 'progress') return;

    const progressChannel = supabase
      .channel('training-progress-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_progress'
        },
        () => {
          console.log('📊 Training progress changed, refreshing...');
          fetchUserProgress();
        }
      )
      .subscribe();

    const assignmentsChannel = supabase
      .channel('training-assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_assignments'
        },
        () => {
          console.log('📋 Training assignments changed, refreshing...');
          fetchUserProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [activeTab]);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('training_modules')
        .select('*')
        .order('position');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotLoadModules'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from('training_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('position');

      if (error) throw error;
      // Map action_buttons from JSON to typed array (with proper casting)
      const mappedData = (data || []).map(lesson => ({
        ...lesson,
        action_buttons: (Array.isArray(lesson.action_buttons) ? lesson.action_buttons : []) as unknown as LessonActionButton[]
      }));
      setLessons(mappedData);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotLoadLessons'),
        variant: "destructive"
      });
    }
  };

  const saveModule = async (moduleData: Partial<TrainingModule>) => {
    try {
      if (editingModule) {
        const { error } = await supabase
          .from('training_modules')
          .update(moduleData)
          .eq('id', editingModule.id);
        
        if (error) throw error;
        toast({ title: t('admin.training.success'), description: t('admin.training.moduleUpdated') });
      } else {
        const { error } = await supabase
          .from('training_modules')
          .insert([{ ...moduleData, position: modules.length, title: moduleData.title || t('admin.training.newModule') }]);
        
        if (error) throw error;
        toast({ title: t('admin.training.success'), description: t('admin.training.moduleCreated') });
      }

      await fetchModules();
      setShowModuleForm(false);
      setEditingModule(null);
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotSaveModule'),
        variant: "destructive"
      });
    }
  };

  const saveLesson = async (lessonData: Partial<TrainingLesson>) => {
    try {
      // Prepare data for Supabase (cast action_buttons to Json)
      const dbData = {
        ...lessonData,
        action_buttons: lessonData.action_buttons as unknown as any
      };

      if (editingLesson) {
        // Check if media_url changed - delete old file if replaced
        const oldMediaUrl = editingLesson.media_url;
        const newMediaUrl = lessonData.media_url;
        
        if (oldMediaUrl && newMediaUrl && oldMediaUrl !== newMediaUrl) {
          // Delete old media file from VPS/Supabase
          console.log('🗑️ Deleting old media file:', oldMediaUrl);
          const deleteResult = await deleteFile(oldMediaUrl);
          if (!deleteResult.success) {
            console.warn('Could not delete old media file:', deleteResult.error);
          }
        }
        
        const { error } = await supabase
          .from('training_lessons')
          .update(dbData)
          .eq('id', editingLesson.id);
        
        if (error) throw error;
        toast({ title: t('admin.training.success'), description: t('admin.training.lessonUpdated') });
      } else {
        const { error } = await supabase
          .from('training_lessons')
          .insert([{ 
            ...dbData, 
            module_id: selectedModule,
            position: lessons.length,
            title: lessonData.title || t('admin.training.newLesson')
          }]);
        
        if (error) throw error;
        toast({ title: t('admin.training.success'), description: t('admin.training.lessonCreated') });
      }

      await fetchLessons(selectedModule);
      setShowLessonForm(false);
      setEditingLesson(null);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotSaveLesson'),
        variant: "destructive"
      });
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm(t('admin.training.confirmDeleteModule'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      toast({ title: t('admin.training.success'), description: t('admin.training.moduleDeleted') });
      await fetchModules();
      
      if (selectedModule === moduleId) {
        setSelectedModule("");
        setLessons([]);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotDeleteModule'),
        variant: "destructive"
      });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm(t('admin.training.confirmDeleteLesson'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      
      toast({ title: t('admin.training.success'), description: t('admin.training.lessonDeleted') });
      await fetchLessons(selectedModule);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotDeleteLesson'),
        variant: "destructive"
      });
    }
  };

  const fetchUserProgress = async () => {
    setProgressLoading(true);
    try {
      // Fetch all assignments with user and module info
      const { data: assignments, error: assignmentsError } = await supabase
        .from('training_assignments')
        .select(`
          user_id,
          module_id,
          assigned_at,
          profiles!training_assignments_user_id_fkey (
            email,
            first_name,
            last_name
          ),
          training_modules!training_assignments_module_id_fkey (
            title
          )
        `);

      if (assignmentsError) throw assignmentsError;

      // Fetch all progress
      const { data: progressData, error: progressError } = await supabase
        .from('training_progress')
        .select('user_id, lesson_id, is_completed');

      if (progressError) throw progressError;

      // Fetch all lessons per module
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('training_lessons')
        .select('id, module_id')
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      // Group lessons by module
      const lessonsByModule: Record<string, string[]> = {};
      lessonsData?.forEach(lesson => {
        if (!lessonsByModule[lesson.module_id]) {
          lessonsByModule[lesson.module_id] = [];
        }
        lessonsByModule[lesson.module_id].push(lesson.id);
      });

      // Group progress by user
      const progressByUser: Record<string, Set<string>> = {};
      progressData?.forEach(progress => {
        if (progress.is_completed) {
          if (!progressByUser[progress.user_id]) {
            progressByUser[progress.user_id] = new Set();
          }
          progressByUser[progress.user_id].add(progress.lesson_id);
        }
      });

      // Build user progress structure
      const userProgressMap: Record<string, UserProgress> = {};

      assignments?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const moduleId = assignment.module_id;
        const profile = assignment.profiles;
        const module = assignment.training_modules;

        if (!profile || !module) return;

        if (!userProgressMap[userId]) {
          userProgressMap[userId] = {
            user_id: userId,
            email: profile.email,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            modules: []
          };
        }

        const totalLessons = lessonsByModule[moduleId]?.length || 0;
        const userCompletedLessons = progressByUser[userId] 
          ? lessonsByModule[moduleId]?.filter(lessonId => 
              progressByUser[userId].has(lessonId)
            ).length || 0
          : 0;

        userProgressMap[userId].modules.push({
          module_id: moduleId,
          module_title: module.title,
          assigned_at: assignment.assigned_at,
          total_lessons: totalLessons,
          completed_lessons: userCompletedLessons,
          progress_percentage: totalLessons > 0 
            ? Math.round((userCompletedLessons / totalLessons) * 100)
            : 0
        });
      });

      setUserProgress(Object.values(userProgressMap));
    } catch (error) {
      console.error('Error fetching user progress:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.cannotLoadProgress'),
        variant: "destructive"
      });
    } finally {
      setProgressLoading(false);
    }
  };

  // Fetch all certificates for history display
  const fetchAllCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, user_id, module_id, created_at, file_url')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user_id-module_id
      const historyMap: Record<string, CertificateHistory[]> = {};
      data?.forEach(cert => {
        const key = `${cert.user_id}-${cert.module_id}`;
        if (!historyMap[key]) {
          historyMap[key] = [];
        }
        historyMap[key].push({
          id: cert.id,
          module_id: cert.module_id,
          created_at: cert.created_at,
          file_url: cert.file_url
        });
      });

      setCertificateHistory(historyMap);
    } catch (error) {
      console.error('Error fetching certificate history:', error);
    }
  };

  // Regenerate certificate with correct template
  const regenerateCertificateAdmin = async (userId: string, moduleId: string, moduleTitle: string, userName: string) => {
    const key = `${userId}-${moduleId}`;
    setRegeneratingCert(key);

    try {
      toast({
        title: t('admin.training.regeneratingCertificate'),
        description: `${t('admin.training.generatingCertificateFor')} ${userName}`,
      });

      const result = await generateCertificate(userId, moduleId, moduleTitle, true);

      if (!result.success) {
        throw new Error(result.error || t('admin.training.certificateGenerationError'));
      }

      toast({
        title: t('admin.training.success'),
        description: `${t('admin.training.certificateGeneratedFor')} ${userName}`,
      });

      // Refresh data
      await fetchAllCertificates();
      await fetchUserProgress();
    } catch (error) {
      console.error('Error regenerating certificate:', error);
      toast({
        title: t('admin.training.error'),
        description: error instanceof Error ? error.message : t('admin.training.certificateGenerationFailed'),
        variant: "destructive"
      });
    } finally {
      setRegeneratingCert(null);
    }
  };

  // Download certificate for admin
  const downloadCertificateAdmin = async (certificateId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-certificate-url', {
        body: { certificateId }
      });

      if (error) throw error;

      if (data?.url) {
        const response = await fetch(data.url);
        const blob = await response.blob();
        
        const timestamp = new Date().getTime();
        const filename = `certyfikat-purelife-${timestamp}.pdf`;
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: t('admin.training.error'),
        description: t('admin.training.certificateDownloadFailed'),
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="h-64 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('admin.training.title')}</h2>
        <Button onClick={() => setShowModuleForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('admin.training.newModule')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">{t('admin.training.modules')}</TabsTrigger>
          <TabsTrigger value="lessons">{t('admin.training.lessons')}</TabsTrigger>
          <TabsTrigger value="progress">{t('admin.training.userProgress')}</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          {/* Module Form */}
          {showModuleForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingModule ? t('admin.training.editModule') : t('admin.training.newModule')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ModuleForm
                  module={editingModule}
                  onSave={saveModule}
                  onCancel={() => {
                    setShowModuleForm(false);
                    setEditingModule(null);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Modules Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.training.moduleName') || 'Nazwa modułu'}</TableHead>
                  <TableHead className="w-20 text-center">{t('admin.training.lessons') || 'Lekcje'}</TableHead>
                  <TableHead className="w-28">{t('admin.training.status') || 'Status'}</TableHead>
                  <TableHead>{t('admin.training.visibleTo') || 'Widoczność'}</TableHead>
                  <TableHead className="text-right w-36">{t('admin.training.actions') || 'Akcje'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('admin.training.noModules') || 'Brak modułów szkoleniowych'}
                    </TableCell>
                  </TableRow>
                ) : (
                  modules.map((module) => {
                    const lessonCount = lessons.filter(l => l.module_id === module.id).length;
                    
                    return (
                      <TableRow key={module.id} className={cn(!module.is_active && "opacity-60")}>
                        <TableCell className="font-medium">{module.title}</TableCell>
                        <TableCell className="text-center">{lessonCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              module.is_active ? "bg-green-500" : "bg-gray-400"
                            )} />
                            <span className={cn(
                              "text-sm",
                              module.is_active ? "text-green-600" : "text-muted-foreground"
                            )}>
                              {module.is_active ? t('admin.training.active') : t('admin.training.inactive')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getVisibilityText(module)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/training/${module.id}`)}
                              title={t('admin.training.preview') || 'Podgląd'}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedModule(module.id);
                                setActiveTab("lessons");
                              }}
                              title={t('admin.training.lessons') || 'Lekcje'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedModuleForUsers(module.id);
                                setShowUserSelector(true);
                              }}
                              title={t('admin.training.send') || 'Wyślij'}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingModule(module);
                                  setShowModuleForm(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('admin.training.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive" 
                                  onClick={() => deleteModule(module.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('admin.training.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          {/* Module Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="module-select">{t('admin.training.selectModule')}:</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={t('admin.training.selectModule')} />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModule && (
                  <Button onClick={() => setShowLessonForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin.training.newLesson')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lesson Form */}
          {showLessonForm && selectedModule && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingLesson ? t('admin.training.editLesson') : t('admin.training.newLesson')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LessonForm
                  lesson={editingLesson}
                  onSave={saveLesson}
                  onCancel={() => {
                    setShowLessonForm(false);
                    setEditingLesson(null);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Lessons List */}
          {selectedModule && (
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        {lesson.media_url ? (
                          lesson.media_type === 'image' ? (
                            <img 
                              src={lesson.media_url} 
                              alt={lesson.media_alt_text || lesson.title}
                              className="w-full h-full object-cover"
                            />
                          ) : lesson.media_type === 'video' ? (
                            <div className="relative w-full h-full bg-muted flex items-center justify-center">
                              <Video className="h-6 w-6 text-muted-foreground" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center">
                                  <Play className="h-3 w-3 text-primary-foreground ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : lesson.media_type === 'audio' ? (
                            <Music className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          )
                        ) : (
                          <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm truncate">
                            {index + 1}. {lesson.title}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant={lesson.is_active ? "default" : "secondary"} className="text-xs">
                              {lesson.is_active ? "Aktywna" : "Nieaktywna"}
                            </Badge>
                            {lesson.min_time_seconds > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.ceil(lesson.min_time_seconds / 60)} min
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Content badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {lesson.media_type && (
                            <Badge variant="outline" className="text-xs gap-1">
                              {lesson.media_type === 'video' && <Video className="h-3 w-3" />}
                              {lesson.media_type === 'audio' && <Music className="h-3 w-3" />}
                              {lesson.media_type === 'image' && <ImageIcon className="h-3 w-3" />}
                              {lesson.media_type === 'document' && <FileText className="h-3 w-3" />}
                              {lesson.media_type === 'video' && 'Wideo'}
                              {lesson.media_type === 'audio' && 'Audio'}
                              {lesson.media_type === 'image' && 'Obraz'}
                              {lesson.media_type === 'document' && 'Dokument'}
                            </Badge>
                          )}
                          {lesson.content && lesson.content.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <AlignLeft className="h-3 w-3" />
                              Treść
                            </Badge>
                          )}
                          {lesson.is_required && (
                            <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              Wymagana
                            </Badge>
                          )}
                          {lesson.action_buttons && lesson.action_buttons.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Link className="h-3 w-3" />
                              {lesson.action_buttons.length} {lesson.action_buttons.length === 1 ? 'przycisk' : 'przyciski'}
                            </Badge>
                          )}
                        </div>

                        {/* Action buttons list */}
                        {lesson.action_buttons && lesson.action_buttons.length > 0 && (
                          <div className="mb-2 space-y-0.5">
                            {lesson.action_buttons.slice(0, 3).map((button, btnIndex) => (
                              <div key={btnIndex} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="truncate">• {button.label}</span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {button.type === 'file' ? 'plik' : 
                                   button.type === 'external' ? 'zewn.' : 
                                   button.type === 'internal' ? 'wewn.' : 'zasób'}
                                </Badge>
                              </div>
                            ))}
                            {lesson.action_buttons.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{lesson.action_buttons.length - 3} więcej...
                              </div>
                            )}
                          </div>
                        )}

                        {/* Admin actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingLesson(lesson);
                              setShowLessonForm(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edytuj
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => deleteLesson(lesson.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {lessons.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Brak lekcji w tym module</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj użytkownika (imię, nazwisko, EQID)..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {progressLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : filteredUserProgress.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{userSearchQuery ? 'Nie znaleziono użytkowników' : 'Brak przypisanych szkoleń'}</p>
                  {!userSearchQuery && <p className="text-sm mt-2">Przypisz moduły szkoleniowe użytkownikom w zakładce "Moduły"</p>}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUserProgress.map((progressUser) => {
                const overallProgress = progressUser.modules.length > 0
                  ? Math.round(progressUser.modules.reduce((acc, m) => acc + m.progress_percentage, 0) / progressUser.modules.length)
                  : 0;
                
                return (
                  <Collapsible key={progressUser.user_id}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm">
                              {progressUser.first_name?.[0]}{progressUser.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <div className="font-medium">{progressUser.first_name} {progressUser.last_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {progressUser.eq_id ? `EQID: ${progressUser.eq_id}` : progressUser.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={overallProgress === 100 ? "default" : "secondary"}>
                            {overallProgress}%
                          </Badge>
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2 px-4 pb-4 space-y-3 border rounded-lg bg-card/50">
                      <div className="pt-3 space-y-3">
                        {progressUser.modules.map((module) => {
                          const key = `${progressUser.user_id}-${module.module_id}`;
                          const history = certificateHistory[key];
                          const latestCert = history?.[0];
                          
                          return (
                            <div key={module.module_id} className="border rounded-lg p-3 bg-background">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-sm">{module.module_title}</div>
                                <Badge variant={module.progress_percentage === 100 ? "default" : "secondary"} className="text-xs">
                                  {module.progress_percentage}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Clock className="h-3 w-3" />
                                <span>Ukończono {module.completed_lessons} z {module.total_lessons} lekcji</span>
                              </div>
                              <div className="bg-secondary rounded-full h-1.5">
                                <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${module.progress_percentage}%` }} />
                              </div>
                              
                              {module.progress_percentage === 100 && (
                                <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2">
                                  {latestCert ? (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Award className="h-3 w-3" />
                                      <span>{new Date(latestCert.created_at).toLocaleDateString('pl-PL')}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Brak certyfikatu</span>
                                  )}
                                  <div className="flex gap-1">
                                    {latestCert && (
                                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadCertificateAdmin(latestCert.id)}>
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => regenerateCertificateAdmin(progressUser.user_id, module.module_id, module.module_title, `${progressUser.first_name} ${progressUser.last_name}`.trim() || progressUser.email)}
                                      disabled={regeneratingCert === key}
                                    >
                                      {regeneratingCert === key ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Selector Modal */}
      {showUserSelector && selectedModuleForUsers && (
        <UserSelectorModal
          module={modules.find(m => m.id === selectedModuleForUsers)!}
          onClose={() => {
            setShowUserSelector(false);
            setSelectedModuleForUsers("");
          }}
        />
      )}
    </div>
  );
};

// Helper function to get visibility text
const getVisibilityText = (module: TrainingModule) => {
  const roles = [];
  if (module.visible_to_everyone) roles.push("wszyscy");
  if (module.visible_to_clients) roles.push("klienci");
  if (module.visible_to_partners) roles.push("partnerzy");
  if (module.visible_to_specjalista) roles.push("specjaliści");
  if (module.visible_to_anonymous) roles.push("anonimowi");
  
  return roles.length > 0 ? roles.join(", ") : "nikt";
};

// Module Form Component
const ModuleForm = ({ 
  module, 
  onSave, 
  onCancel 
}: { 
  module: TrainingModule | null;
  onSave: (data: Partial<TrainingModule>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: module?.title || "",
    description: module?.description || "",
    icon_name: module?.icon_name || "",
    is_active: module?.is_active ?? true,
    visible_to_everyone: module?.visible_to_everyone ?? false,
    visible_to_clients: module?.visible_to_clients ?? false,
    visible_to_partners: module?.visible_to_partners ?? false,
    visible_to_specjalista: module?.visible_to_specjalista ?? false,
    visible_to_anonymous: module?.visible_to_anonymous ?? false,
    resource_ids: module?.resource_ids || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Tytuł *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="icon_name">Nazwa ikony</Label>
        <Input
          id="icon_name"
          value={formData.icon_name}
          onChange={(e) => setFormData(prev => ({ ...prev, icon_name: e.target.value }))}
          placeholder="np. BookOpen"
        />
      </div>

      <div className="space-y-3">
        <Label>Widoczność</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible_to_everyone"
              checked={formData.visible_to_everyone}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, visible_to_everyone: checked as boolean }))
              }
            />
            <Label htmlFor="visible_to_everyone">Wszyscy</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible_to_clients"
              checked={formData.visible_to_clients}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, visible_to_clients: checked as boolean }))
              }
            />
            <Label htmlFor="visible_to_clients">Klienci</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible_to_partners"
              checked={formData.visible_to_partners}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, visible_to_partners: checked as boolean }))
              }
            />
            <Label htmlFor="visible_to_partners">Partnerzy</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible_to_specjalista"
              checked={formData.visible_to_specjalista}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, visible_to_specjalista: checked as boolean }))
              }
            />
            <Label htmlFor="visible_to_specjalista">Specjaliści</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visible_to_anonymous"
              checked={formData.visible_to_anonymous}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, visible_to_anonymous: checked as boolean }))
              }
            />
            <Label htmlFor="visible_to_anonymous">Anonimowi użytkownicy</Label>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, is_active: checked as boolean }))
          }
        />
        <Label htmlFor="is_active">Aktywny</Label>
      </div>

      {/* Module Resources Selector */}
      <ModuleResourcesSelector
        selectedIds={formData.resource_ids}
        onChange={(ids) => setFormData(prev => ({ ...prev, resource_ids: ids }))}
      />

      <div className="flex gap-2">
        <Button type="submit">Zapisz</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
};

// Lesson Form Component
const LessonForm = ({ 
  lesson, 
  onSave, 
  onCancel 
}: { 
  lesson: TrainingLesson | null;
  onSave: (data: Partial<TrainingLesson>) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: lesson?.title || "",
    content: lesson?.content || "",
    media_url: lesson?.media_url || "",
    media_type: lesson?.media_type || "",
    media_alt_text: lesson?.media_alt_text || "",
    min_time_seconds: lesson?.min_time_seconds || 60,
    video_duration_seconds: lesson?.video_duration_seconds || 0,
    is_required: lesson?.is_required ?? true,
    is_active: lesson?.is_active ?? true,
    action_buttons: lesson?.action_buttons || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleActionButtonsChange = (buttons: LessonActionButton[]) => {
    setFormData(prev => ({ ...prev, action_buttons: buttons }));
  };

  const handleMediaUploaded = (url: string, type: string, altText?: string, durationSeconds?: number) => {
    setFormData(prev => ({
      ...prev,
      media_url: url,
      media_type: type,
      media_alt_text: altText || "",
      video_duration_seconds: durationSeconds || prev.video_duration_seconds
    }));
  };

  // Format seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="lesson-title">Tytuł *</Label>
        <Input
          id="lesson-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="lesson-content">Treść</Label>
        <RichTextEditor
          value={formData.content}
          onChange={(content) => setFormData(prev => ({ ...prev, content }))}
          placeholder="Wprowadź treść lekcji..."
        />
      </div>

      <div>
        <Label>Media</Label>
        <MediaUpload
          onMediaUploaded={handleMediaUploaded}
          currentMediaUrl={formData.media_url}
          currentMediaType={formData.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
          currentAltText={formData.media_alt_text}
          allowedTypes={['video', 'document', 'audio']}
          maxSizeMB={null}
        />
        {formData.video_duration_seconds > 0 && (
          <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <span>Wykryty czas wideo: <strong>{formatDuration(formData.video_duration_seconds)}</strong></span>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="min_time">Minimalny czas (sekundy)</Label>
        <Input
          id="min_time"
          type="number"
          min="0"
          value={formData.min_time_seconds}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
            setFormData(prev => ({ 
              ...prev, 
              min_time_seconds: isNaN(value) ? 0 : value
            }));
          }}
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lesson-is_required"
            checked={formData.is_required}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_required: checked as boolean }))
            }
          />
          <Label htmlFor="lesson-is_required">Wymagana</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="lesson-is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, is_active: checked as boolean }))
            }
          />
          <Label htmlFor="lesson-is_active">Aktywna</Label>
        </div>
      </div>

      {/* Action Buttons Editor */}
      <ActionButtonsEditor
        buttons={formData.action_buttons}
        onChange={handleActionButtonsChange}
      />

      <div className="flex gap-2">
        <Button type="submit">Zapisz</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
};

// User Selector Modal Component
interface UserWithAssignment {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  assignment?: {
    notification_sent: boolean;
    assigned_by: string | null;
    assigned_at: string;
    assigned_by_name?: string;
  };
}

const UserSelectorModal = ({ 
  module, 
  onClose 
}: { 
  module: TrainingModule;
  onClose: () => void;
}) => {
  const [users, setUsers] = useState<UserWithAssignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const { toast } = useToast();

  // Determine available roles based on module visibility
  const availableRoles = useMemo(() => {
    const roles: { value: string; label: string }[] = [{ value: 'all', label: 'Wszyscy' }];
    if (module.visible_to_everyone) return roles;
    if (module.visible_to_partners) roles.push({ value: 'partner', label: 'Partnerzy' });
    if (module.visible_to_specjalista) roles.push({ value: 'specjalista', label: 'Specjaliści' });
    if (module.visible_to_clients) roles.push({ value: 'client', label: 'Klienci' });
    return roles;
  }, [module]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with roles from user_roles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .eq('is_active', true)
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch existing assignments for this module
      const { data: assignments, error: assignmentsError } = await supabase
        .from('training_assignments')
        .select('user_id, notification_sent, assigned_by, assigned_at')
        .eq('module_id', module.id);

      if (assignmentsError) throw assignmentsError;

      // Fetch admin profiles for assignment display
      const assignerIds = [...new Set(assignments?.map(a => a.assigned_by).filter(Boolean) || [])];
      let assignerProfiles: Record<string, string> = {};
      if (assignerIds.length > 0) {
        const { data: assigners } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', assignerIds);
        
        assigners?.forEach(a => {
          assignerProfiles[a.user_id] = `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Admin';
        });
      }

      // Combine profiles with roles and assignments
      const usersWithRoles: UserWithAssignment[] = profiles?.map(profile => {
        const userRole = userRoles?.find(ur => ur.user_id === profile.user_id);
        const assignment = assignments?.find(a => a.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'client',
          assignment: assignment ? {
            notification_sent: assignment.notification_sent ?? false,
            assigned_by: assignment.assigned_by,
            assigned_at: assignment.assigned_at,
            assigned_by_name: assignment.assigned_by ? assignerProfiles[assignment.assigned_by] : 'Cron'
          } : undefined
        };
      }) || [];

      // Filter users based on module visibility settings
      const filteredUsers = usersWithRoles.filter(user => {
        // If visible to everyone, show all users
        if (module.visible_to_everyone) return true;

        // Otherwise, check specific role visibility
        const role = user.role.toLowerCase();
        if (module.visible_to_clients && (role === 'client' || role === 'user')) return true;
        if (module.visible_to_partners && role === 'partner') return true;
        if (module.visible_to_specjalista && role === 'specjalista') return true;
        if (module.visible_to_anonymous) return true;

        return false;
      });

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Błąd",
        description: "Nie można załadować użytkowników",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users by search query and role
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = selectedRole === 'all' || user.role.toLowerCase() === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRole]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUsers(filteredUsers.map(user => user.user_id));
  };

  const clearAll = () => {
    setSelectedUsers([]);
  };

  const sendInvitations = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Błąd",
        description: "Wybierz co najmniej jednego użytkownika",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("Nie zalogowany");
      }

      // Create training assignments
      const assignments = selectedUsers.map(userId => ({
        user_id: userId,
        module_id: module.id,
        assigned_by: currentUser.id,
        assigned_at: new Date().toISOString(),
      }));

      const { error: assignmentError } = await supabase
        .from('training_assignments')
        .upsert(assignments, {
          onConflict: 'user_id,module_id',
          ignoreDuplicates: false
        });

      if (assignmentError) throw assignmentError;

      // Send notifications via edge function
      const notifications = selectedUsers.map(userId => 
        supabase.functions.invoke('send-training-notification', {
          body: {
            userId,
            moduleId: module.id,
            assignedBy: currentUser.id
          }
        })
      );

      await Promise.all(notifications);

      toast({
        title: "Sukces",
        description: `Szkolenie zostało wysłane do ${selectedUsers.length} użytkowników`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się wysłać szkoleń",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Wyślij szkolenie do użytkowników</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Moduł: <strong>{module.title}</strong> | Widoczny dla: {getVisibilityText(module)}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po imieniu, nazwisku lub email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role filter tabs */}
            {availableRoles.length > 1 && (
              <Tabs value={selectedRole} onValueChange={setSelectedRole} className="mb-3">
                <TabsList className="w-full justify-start">
                  {availableRoles.map(role => (
                    <TabsTrigger key={role.value} value={role.value} className="text-xs">
                      {role.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={selectAll}>
                <UserPlus className="h-4 w-4 mr-1" />
                Zaznacz widocznych
              </Button>
              <Button size="sm" variant="outline" onClick={clearAll}>
                Odznacz wszystkich
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">
                Wybrano: {selectedUsers.length} z {filteredUsers.length}
              </span>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto flex-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {searchQuery || selectedRole !== 'all' 
                    ? 'Brak wyników dla podanych kryteriów'
                    : 'Brak użytkowników do wyświetlenia'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.user_id} 
                    className={`flex items-center p-3 border-b last:border-b-0 ${
                      user.assignment ? 'bg-muted/30' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={() => toggleUser(user.user_id)}
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {user.first_name} {user.last_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                        {user.assignment && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1"
                            title={`Wysłane przez: ${user.assignment.assigned_by_name || 'Cron'} dnia ${formatDate(user.assignment.assigned_at)}`}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Wysłane {formatDate(user.assignment.assigned_at)}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                Szkolenie już wysłane
              </span>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button 
            onClick={sendInvitations} 
            disabled={sending || selectedUsers.length === 0}
          >
            {sending ? "Wysyłanie..." : `Wyślij (${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingManagement;