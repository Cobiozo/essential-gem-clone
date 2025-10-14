import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MediaUpload } from "@/components/MediaUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import jsPDF from "jspdf";

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
  is_required: boolean;
  is_active: boolean;
}

interface UserProgress {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  modules: {
    module_id: string;
    module_title: string;
    assigned_at: string;
    total_lessons: number;
    completed_lessons: number;
    progress_percentage: number;
  }[];
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
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

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
    }
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
        title: "Błąd",
        description: "Nie można załadować modułów szkoleniowych",
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
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: "Błąd",
        description: "Nie można załadować lekcji",
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
        toast({ title: "Sukces", description: "Moduł został zaktualizowany" });
      } else {
        const { error } = await supabase
          .from('training_modules')
          .insert([{ ...moduleData, position: modules.length, title: moduleData.title || 'Nowy moduł' }]);
        
        if (error) throw error;
        toast({ title: "Sukces", description: "Moduł został utworzony" });
      }

      await fetchModules();
      setShowModuleForm(false);
      setEditingModule(null);
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: "Błąd",
        description: "Nie można zapisać modułu",
        variant: "destructive"
      });
    }
  };

  const saveLesson = async (lessonData: Partial<TrainingLesson>) => {
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from('training_lessons')
          .update(lessonData)
          .eq('id', editingLesson.id);
        
        if (error) throw error;
        toast({ title: "Sukces", description: "Lekcja została zaktualizowana" });
      } else {
        const { error } = await supabase
          .from('training_lessons')
          .insert([{ 
            ...lessonData, 
            module_id: selectedModule,
            position: lessons.length,
            title: lessonData.title || 'Nowa lekcja'
          }]);
        
        if (error) throw error;
        toast({ title: "Sukces", description: "Lekcja została utworzona" });
      }

      await fetchLessons(selectedModule);
      setShowLessonForm(false);
      setEditingLesson(null);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast({
        title: "Błąd",
        description: "Nie można zapisać lekcji",
        variant: "destructive"
      });
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten moduł? Wszystkie powiązane lekcje też zostaną usunięte.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      toast({ title: "Sukces", description: "Moduł został usunięty" });
      await fetchModules();
      
      if (selectedModule === moduleId) {
        setSelectedModule("");
        setLessons([]);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Błąd",
        description: "Nie można usunąć modułu",
        variant: "destructive"
      });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę lekcję?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('training_lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      
      toast({ title: "Sukces", description: "Lekcja została usunięta" });
      await fetchLessons(selectedModule);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: "Błąd",
        description: "Nie można usunąć lekcji",
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
        title: "Błąd",
        description: "Nie można załadować postępów użytkowników",
        variant: "destructive"
      });
    } finally {
      setProgressLoading(false);
    }
  };

  const generateCertificate = async (
    userName: string,
    moduleTitle: string,
    completedDate: string,
    userId: string,
    moduleId: string
  ) => {
    try {
      // Fetch the default certificate template (only one should be active)
      const { data: templates, error: templateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (templateError) {
        console.error('Error fetching template:', templateError);
        toast({
          title: "Błąd",
          description: "Błąd podczas pobierania szablonu certyfikatu",
          variant: "destructive"
        });
        return;
      }

      if (!templates || templates.length === 0) {
        toast({
          title: "Błąd",
          description: "Nie znaleziono aktywnego szablonu certyfikatu. Ustaw szablon jako domyślny w zakładce Certyfikaty.",
          variant: "destructive"
        });
        return;
      }

      const template = templates[0]; // Use the default active template
      console.log('Using certificate template:', template.name, 'ID:', template.id);

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Render template elements
      if (template.layout && typeof template.layout === 'object' && 'elements' in template.layout) {
        const layoutData = template.layout as { elements: any[] };
        layoutData.elements.forEach((element: any) => {
          // Skip images for now as they require async loading
          if (element.type === 'image') return;

          // Replace variables
          let content = element.content || '';
          content = content.replace('{userName}', userName);
          content = content.replace('{moduleTitle}', moduleTitle);
          content = content.replace('{completionDate}', new Date(completedDate).toLocaleDateString('pl-PL'));

          if (element.type === 'text') {
            doc.setFontSize(element.fontSize || 16);
            
            // Convert hex color to RGB
            const color = element.color || '#000000';
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            doc.setTextColor(r, g, b);

            // Convert fontWeight to jsPDF format
            if (element.fontWeight === 'bold' || element.fontWeight === '700') {
              doc.setFont('helvetica', 'bold');
            } else {
              doc.setFont('helvetica', 'normal');
            }

            // Calculate position (Fabric.js uses pixels, jsPDF uses mm at 72 DPI)
            const x = element.x * 0.352778;
            const y = element.y * 0.352778;

            doc.text(content, x, y, { 
              align: element.align || 'left',
              maxWidth: pageWidth - 20
            });
          }
        });
      }

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');
      const fileName = `${userId}/certificate-${moduleId}-${Date.now()}.pdf`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Check if certificate already exists for this user+module
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id, file_url')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      // If exists, delete old file from storage
      if (existingCert) {
        await supabase.storage
          .from('certificates')
          .remove([existingCert.file_url]);
        
        // Delete old certificate record
        await supabase
          .from('certificates')
          .delete()
          .eq('id', existingCert.id);
      }

      // Save new certificate record to database with file path (not signed URL)
      const { error: dbError } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          module_id: moduleId,
          issued_by: user?.id,
          file_url: fileName  // Store just the file path, not signed URL
        });

      if (dbError) throw dbError;

      toast({
        title: "Sukces",
        description: "Certyfikat został wygenerowany i zapisany",
      });

      // Refresh the user progress to show the certificate
      fetchUserProgress();
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się wygenerować certyfikatu",
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
        <h2 className="text-2xl font-bold">Zarządzanie szkoleniami</h2>
        <Button onClick={() => setShowModuleForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowy moduł
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules">Moduły</TabsTrigger>
          <TabsTrigger value="lessons">Lekcje</TabsTrigger>
          <TabsTrigger value="progress">Postępy użytkowników</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          {/* Module Form */}
          {showModuleForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingModule ? "Edytuj moduł" : "Nowy moduł"}
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

          {/* Modules List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <Badge variant={module.is_active ? "default" : "secondary"}>
                      {module.is_active ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/training/${module.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Podgląd
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedModule(module.id);
                        setActiveTab("lessons");
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Lekcje
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedModuleForUsers(module.id);
                        setShowUserSelector(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Wyślij
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingModule(module);
                        setShowModuleForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edytuj
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteModule(module.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Widoczny dla: {getVisibilityText(module)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          {/* Module Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="module-select">Wybierz moduł:</Label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Wybierz moduł" />
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
                    Nowa lekcja
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
                  {editingLesson ? "Edytuj lekcję" : "Nowa lekcja"}
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
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {index + 1}. {lesson.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={lesson.is_active ? "default" : "secondary"}>
                          {lesson.is_active ? "Aktywna" : "Nieaktywna"}
                        </Badge>
                        {lesson.min_time_seconds > 0 && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.ceil(lesson.min_time_seconds / 60)} min
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingLesson(lesson);
                          setShowLessonForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edytuj
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteLesson(lesson.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
          {progressLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : userProgress.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak przypisanych szkoleń</p>
                  <p className="text-sm mt-2">Przypisz moduły szkoleniowe użytkownikom w zakładce "Moduły"</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {userProgress.map((user) => (
                <Card key={user.user_id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {user.first_name} {user.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {user.modules.map((module) => (
                        <div key={module.module_id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{module.module_title}</div>
                            <Badge variant={module.progress_percentage === 100 ? "default" : "secondary"}>
                              {module.progress_percentage}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              Ukończono {module.completed_lessons} z {module.total_lessons} lekcji
                            </span>
                          </div>
                          <div className="mt-2 bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${module.progress_percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="text-xs text-muted-foreground">
                              Przypisano: {new Date(module.assigned_at).toLocaleDateString('pl-PL')}
                            </div>
                            {module.progress_percentage === 100 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateCertificate(
                                  `${user.first_name} ${user.last_name}`.trim() || user.email,
                                  module.module_title,
                                  module.assigned_at,
                                  user.user_id,
                                  module.module_id
                                )}
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Wystaw certyfikat
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
    is_required: lesson?.is_required ?? true,
    is_active: lesson?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleMediaUploaded = (url: string, type: string, altText?: string) => {
    setFormData(prev => ({
      ...prev,
      media_url: url,
      media_type: type,
      media_alt_text: altText || ""
    }));
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
const UserSelectorModal = ({ 
  module, 
  onClose 
}: { 
  module: TrainingModule;
  onClose: () => void;
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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

      // Combine profiles with roles
      const usersWithRoles = profiles?.map(profile => {
        const userRole = userRoles?.find(ur => ur.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'client'
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

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUsers(users.map(user => user.user_id));
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
      // Here you would call an edge function to send emails
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
            <div className="flex items-center gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={selectAll}>
                <UserPlus className="h-4 w-4 mr-1" />
                Zaznacz wszystkich
              </Button>
              <Button size="sm" variant="outline" onClick={clearAll}>
                Odznacz wszystkich
              </Button>
              <span className="text-sm text-muted-foreground">
                Wybrano: {selectedUsers.length} z {users.length}
              </span>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto flex-1">
              {users.map((user) => (
                <div key={user.user_id} className="flex items-center p-3 border-b last:border-b-0">
                  <Checkbox
                    checked={selectedUsers.includes(user.user_id)}
                    onCheckedChange={() => toggleUser(user.user_id)}
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium">
                      {user.first_name} {user.last_name} 
                      <Badge variant="outline" className="ml-2">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              ))}
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