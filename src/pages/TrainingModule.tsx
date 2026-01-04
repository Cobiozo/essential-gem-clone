import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Lock, 
  Play, 
  Clock,
  FileText,
  Video,
  Volume2,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SecureMedia } from "@/components/SecureMedia";
// jsPDF imported dynamically when generating certificates

interface TrainingModule {
  id: string;
  title: string;
  description: string;
}

interface TrainingLesson {
  id: string;
  title: string;
  content: string;
  media_url: string;
  media_type: string;
  media_alt_text: string;
  min_time_seconds: number;
  is_required: boolean;
  position: number;
}

interface LessonProgress {
  lesson_id: string;
  time_spent_seconds: number;
  is_completed: boolean;
  started_at: string;
  completed_at: string | null;
}

const TrainingModule = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canProceed, setCanProceed] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!moduleId) return;
      
      try {
        // Fetch module details
        const { data: moduleData, error: moduleError } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', moduleId)
          .single();

        if (!mounted) return;
        if (moduleError) throw moduleError;
        setModule(moduleData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('module_id', moduleId)
          .eq('is_active', true)
          .order('position');

        if (!mounted) return;
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData);

        // Fetch user progress if logged in
        if (user) {
          const { data: progressData, error: progressError } = await supabase
            .from('training_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('lesson_id', lessonsData.map(l => l.id));

          if (!mounted) return;
          if (progressError) throw progressError;

          const progressMap = progressData.reduce((acc, p) => {
            acc[p.lesson_id] = p;
            return acc;
          }, {} as Record<string, LessonProgress>);

          setProgress(progressMap);

          // Find the first incomplete lesson to start from
          const firstIncompleteIndex = lessonsData.findIndex(lesson => 
            !progressMap[lesson.id]?.is_completed
          );
          
          if (firstIncompleteIndex !== -1) {
            setCurrentLessonIndex(firstIncompleteIndex);
          }
        }
      } catch (error) {
        console.error('Error fetching module data:', error);
        if (mounted) {
          toast({
            title: "Błąd",
            description: "Nie można załadować danych szkolenia",
            variant: "destructive"
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [moduleId, user, toast]);

  useEffect(() => {
    // Start timer when lesson changes
    startTimeRef.current = Date.now();
    setTimeSpent(0);
    
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      setTimeSpent(elapsed);
      
      // Check if user can proceed
      const currentLesson = lessons[currentLessonIndex];
      if (currentLesson) {
        const lessonProgress = progress[currentLesson.id];
        const totalTimeSpent = (lessonProgress?.time_spent_seconds || 0) + elapsed;
        setCanProceed(totalTimeSpent >= (currentLesson.min_time_seconds || 0));
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentLessonIndex, lessons, progress]);

  const saveProgress = async () => {
    if (!user || lessons.length === 0) return;

    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) return;

    const totalTimeSpent = (progress[currentLesson.id]?.time_spent_seconds || 0) + timeSpent;
    const isCompleted = totalTimeSpent >= (currentLesson.min_time_seconds || 0);

    try {
      const { error } = await supabase
        .from('training_progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          time_spent_seconds: totalTimeSpent,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        });

      if (error) throw error;

      // Update local progress
      setProgress(prev => ({
        ...prev,
        [currentLesson.id]: {
          ...prev[currentLesson.id],
          lesson_id: currentLesson.id,
          time_spent_seconds: totalTimeSpent,
          is_completed: isCompleted,
          started_at: prev[currentLesson.id]?.started_at || new Date().toISOString(),
          completed_at: isCompleted ? new Date().toISOString() : null
        }
      }));

      if (isCompleted && !progress[currentLesson.id]?.is_completed) {
        toast({
          title: "Lekcja ukończona!",
          description: `Pomyślnie ukończyłeś lekcję "${currentLesson.title}"`,
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const goToNextLesson = async () => {
    // Save progress first and get completion status
    const currentLesson = lessons[currentLessonIndex];
    const totalTimeSpent = (progress[currentLesson?.id]?.time_spent_seconds || 0) + timeSpent;
    const currentLessonWillBeCompleted = totalTimeSpent >= (currentLesson?.min_time_seconds || 0);
    
    await saveProgress();
    
    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else {
      // This is the last lesson - check if ALL lessons are now completed
      // We need to check: all previous lessons + current lesson (which we just calculated)
      const allPreviousCompleted = lessons.slice(0, -1).every(lesson => {
        return progress[lesson.id]?.is_completed === true;
      });
      
      const allCompleted = allPreviousCompleted && currentLessonWillBeCompleted;
      
      console.log('=== MODULE COMPLETION CHECK ===');
      console.log('All previous lessons completed:', allPreviousCompleted);
      console.log('Current lesson will be completed:', currentLessonWillBeCompleted);
      console.log('All completed:', allCompleted);
      console.log('User:', user?.id);
      console.log('Module:', module?.title);

      if (allCompleted && user && module) {
        // Auto-generate certificate with full PDF generation
        toast({
          title: "Generowanie certyfikatu...",
          description: "Trwa automatyczne wystawianie certyfikatu.",
        });

        try {
          console.log('🎓 Starting certificate generation...');
          await generateAndSendCertificate(user.id, moduleId!, module.title);
        } catch (certError) {
          console.error('❌ Error generating certificate:', certError);
          toast({
            title: "Błąd generowania certyfikatu",
            description: `Wystąpił błąd: ${certError instanceof Error ? certError.message : 'Nieznany błąd'}`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Moduł ukończony!",
          description: "Gratulacje! Ukończyłeś wszystkie lekcje w tym module.",
        });
      }
      
      navigate('/training');
    }
  };

  const goToPreviousLesson = async () => {
    await saveProgress();
    
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const jumpToLesson = async (index: number) => {
    // Check if user can access this lesson
    if (index > 0) {
      const previousLesson = lessons[index - 1];
      if (previousLesson && !progress[previousLesson.id]?.is_completed) {
        toast({
          title: "Dostęp zablokowany",
          description: "Musisz ukończyć poprzednią lekcję, aby przejść dalej.",
          variant: "destructive"
        });
        return;
      }
    }

    await saveProgress();
    setCurrentLessonIndex(index);
  };

  // Generate certificate PDF locally and upload to storage
  const generateAndSendCertificate = async (userId: string, moduleId: string, moduleTitle: string) => {
    console.log('=== GENERATING CERTIFICATE ===');
    console.log('User ID:', userId);
    console.log('Module ID:', moduleId);
    console.log('Module Title:', moduleTitle);
    
    try {
      // 1. Get user profile
      console.log('Step 1: Fetching user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }
      
      const userName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.email || 'Unknown User';
      console.log('✅ User name:', userName);

      // 2. Get user role
      console.log('Step 2: Fetching user role...');
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const userRole = userRoles?.role || 'client';
      console.log('✅ User role:', userRole);

      // 3. Check if certificate already exists (delete placeholders, keep valid ones)
      console.log('Step 3: Checking existing certificates...');
      const { data: existingCert, error: existingError } = await supabase
        .from('certificates')
        .select('id, file_url')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existingError) {
        console.error('❌ Error checking existing cert:', existingError);
      }

      if (existingCert) {
        console.log('Found existing cert:', existingCert.file_url);
        
        if (!existingCert.file_url.startsWith('pending-generation')) {
          console.log('📜 Valid certificate already exists - skipping generation');
          toast({
            title: "Moduł ukończony!",
            description: "Certyfikat został już wcześniej wystawiony.",
          });
          return;
        }
        
        // Delete placeholder certificate
        console.log('🗑️ Deleting placeholder certificate:', existingCert.id);
        await supabase.from('certificates').delete().eq('id', existingCert.id);
      }

      // 4. Fetch ALL certificate templates (not just active - module-specific templates take priority)
      console.log('Step 4: Fetching ALL certificate templates...');
      const { data: templates, error: templateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (templateError) {
        console.error('❌ Template fetch error:', templateError);
        throw new Error(`Template error: ${templateError.message}`);
      }

      console.log('Total templates found:', templates?.length || 0);
      
      // Log all templates with their module assignments
      templates?.forEach(t => {
        console.log(`  - Template: "${t.name}" (ID: ${t.id})`);
        console.log(`    is_active: ${t.is_active}, module_ids: ${JSON.stringify(t.module_ids)}, roles: ${JSON.stringify(t.roles)}`);
      });

      if (!templates || templates.length === 0) {
        console.error('❌ NO TEMPLATES FOUND AT ALL!');
        throw new Error('Nie znaleziono żadnego szablonu certyfikatu');
      }

      // 5. Find best matching template using STRICT priority system
      console.log('Step 5: Finding best matching template...');
      console.log('🔍 Looking for module:', moduleId);
      console.log('🔍 Looking for role:', userRole);
      
      let template = null;
      let priorityUsed = '';

      // PRIORITY 1: Template assigned to THIS MODULE and user's role
      template = templates.find(t => {
        const hasModule = t.module_ids && Array.isArray(t.module_ids) && t.module_ids.includes(moduleId);
        const hasRole = t.roles && Array.isArray(t.roles) && t.roles.length > 0 && t.roles.includes(userRole);
        return hasModule && hasRole;
      });
      if (template) priorityUsed = 'PRIORITY 1: Module + Role match';

      // PRIORITY 2: Template assigned to THIS MODULE (any role or no role restriction)
      if (!template) {
        template = templates.find(t => {
          const hasModule = t.module_ids && Array.isArray(t.module_ids) && t.module_ids.includes(moduleId);
          return hasModule;
        });
        if (template) priorityUsed = 'PRIORITY 2: Module match (ignoring role)';
      }

      // PRIORITY 3: Active template with user's role (no module restriction)
      if (!template) {
        template = templates.find(t => {
          const isActive = t.is_active === true;
          const hasRole = t.roles && Array.isArray(t.roles) && t.roles.length > 0 && t.roles.includes(userRole);
          const noModuleRestriction = !t.module_ids || t.module_ids.length === 0;
          return isActive && hasRole && noModuleRestriction;
        });
        if (template) priorityUsed = 'PRIORITY 3: Active + Role match (no module restriction)';
      }

      // PRIORITY 4: Default active template (no restrictions)
      if (!template) {
        template = templates.find(t => {
          const isActive = t.is_active === true;
          const noRoleRestriction = !t.roles || t.roles.length === 0;
          const noModuleRestriction = !t.module_ids || t.module_ids.length === 0;
          return isActive && noRoleRestriction && noModuleRestriction;
        });
        if (template) priorityUsed = 'PRIORITY 4: Default active template';
      }

      // FALLBACK: Any active template
      if (!template) {
        template = templates.find(t => t.is_active === true);
        if (template) priorityUsed = 'FALLBACK: First active template';
      }

      if (!template) {
        console.error('❌ NO SUITABLE TEMPLATE FOUND!');
        console.error('Available templates:', templates.map(t => ({ name: t.name, module_ids: t.module_ids, is_active: t.is_active })));
        throw new Error('Nie znaleziono odpowiedniego szablonu certyfikatu dla tego modułu');
      }

      console.log('✅ SELECTED TEMPLATE:', template.name);
      console.log('✅ Template ID:', template.id);
      console.log('✅ Selection reason:', priorityUsed);
      console.log('✅ Template module_ids:', JSON.stringify(template.module_ids));
      console.log('✅ Template roles:', JSON.stringify(template.roles));

      // 6. Dynamic import of jsPDF
      console.log('Step 6: Loading jsPDF library...');
      const { default: jsPDF } = await import('jspdf');
      console.log('✅ jsPDF loaded successfully');
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      console.log('PDF dimensions:', pageWidth, 'x', pageHeight, 'mm');
      
      const PX_TO_MM = 0.352729;

      // Helper function to load image as base64
      const loadImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      const completedDate = new Date().toLocaleDateString('pl-PL');
      console.log('Completion date:', completedDate);

      // 7. Render template elements
      console.log('Step 7: Rendering template elements...');
      if (template.layout && typeof template.layout === 'object' && 'elements' in template.layout) {
        const layoutData = template.layout as { elements: any[] };
        console.log('Template has', layoutData.elements?.length || 0, 'elements');
        
        for (const element of layoutData.elements) {
          try {
            let content = element.content || '';
            content = content.replace('{userName}', userName);
            content = content.replace('{moduleTitle}', moduleTitle);
            content = content.replace('{completionDate}', completedDate);

            if (element.type === 'text') {
              doc.setFontSize(element.fontSize || 16);
              
              const color = element.color || '#000000';
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              doc.setTextColor(r, g, b);

              if (element.fontWeight === 'bold' || element.fontWeight === '700') {
                doc.setFont('helvetica', 'bold');
              } else {
                doc.setFont('helvetica', 'normal');
              }

              const x = element.x * PX_TO_MM;
              const y = element.y * PX_TO_MM;

              doc.text(content, x, y, { 
                align: element.align || 'left',
                maxWidth: pageWidth - 20
              });
            } else if (element.type === 'image' && element.imageUrl) {
              const base64Image = await loadImageAsBase64(element.imageUrl);
              
              if (base64Image) {
                try {
                  const x = element.x * PX_TO_MM;
                  const y = element.y * PX_TO_MM;
                  const width = (element.width || 100) * PX_TO_MM;
                  const height = (element.height || 100) * PX_TO_MM;

                  let format = 'PNG';
                  if (base64Image.includes('image/jpeg') || base64Image.includes('image/jpg')) {
                    format = 'JPEG';
                  }

                  doc.addImage(base64Image, format, x, y, width, height);
                } catch (imgError) {
                  console.error('Failed to add image to PDF:', imgError);
                }
              }
            }
          } catch (elementError) {
            console.error('Error processing element:', element, elementError);
          }
        }
      } else {
        console.warn('⚠️ Template has no elements or invalid layout');
      }

      // 8. Convert PDF to blob
      console.log('Step 8: Converting PDF to blob...');
      const pdfBlob = doc.output('blob');
      console.log('✅ PDF blob created, size:', pdfBlob.size, 'bytes');

      // 9. Upload new certificate
      const fileName = `${userId}/certificate-${moduleId}-${Date.now()}.pdf`;
      console.log('Step 9: Uploading certificate to storage:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      console.log('✅ Certificate uploaded successfully');

      // 10. Save certificate record
      console.log('Step 10: Saving certificate record to database...');
      const { data: newCert, error: dbError } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          module_id: moduleId,
          issued_by: userId,
          file_url: fileName
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }
      console.log('✅ Certificate record saved, ID:', newCert.id);

      // 11. Update training assignment
      console.log('Step 11: Updating training assignment...');
      const { error: assignmentError } = await supabase
        .from('training_assignments')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      if (assignmentError) {
        console.warn('⚠️ Training assignment update failed:', assignmentError);
      } else {
        console.log('✅ Training assignment updated');
      }

      // 12. Send certificate email
      console.log('Step 12: Sending certificate email...');
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-certificate-email', {
          body: { 
            userId, 
            moduleId, 
            certificateId: newCert.id,
            moduleTitle,
            userName
          }
        });

        if (emailError) {
          console.error('❌ Email sending failed:', emailError);
        } else {
          console.log('✅ Certificate email sent successfully');
          console.log('Email response:', emailResponse);
        }
      } catch (emailErr) {
        console.error('❌ Email invocation error:', emailErr);
      }

      toast({
        title: "🎉 Certyfikat wystawiony!",
        description: `Gratulacje! Ukończyłeś "${moduleTitle}" i otrzymałeś certyfikat. Sprawdź email!`,
      });

    } catch (error) {
      console.error('❌ CERTIFICATE GENERATION FAILED:', error);
      toast({
        title: "Błąd generowania certyfikatu",
        description: error instanceof Error ? error.message : 'Nieznany błąd',
        variant: "destructive"
      });
      throw error; // Re-throw to be caught by caller
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'document': return <File className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/training')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Powrót
            </Button>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie szkolenia...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Nie znaleziono szkolenia</h3>
              <p className="text-muted-foreground mb-4">
                Szkolenie nie istnieje lub nie masz do niego dostępu.
              </p>
              <Button onClick={() => navigate('/training')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Powrót do szkoleń
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const currentProgress = progress[currentLesson?.id];
  const isLessonCompleted = currentProgress?.is_completed || false;
  const totalTimeSpent = (currentProgress?.time_spent_seconds || 0) + timeSpent;
  const progressPercentage = currentLesson?.min_time_seconds 
    ? Math.min(100, (totalTimeSpent / currentLesson.min_time_seconds) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/training')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót do szkoleń
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-lg font-semibold">{module.title}</h1>
            {module.description && (
              <p className="text-sm text-muted-foreground">{module.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Module Progress Overview */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Lesson List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lekcje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.map((lesson, index) => {
                  const lessonProgress = progress[lesson.id];
                  const isCompleted = lessonProgress?.is_completed;
                  const isCurrent = index === currentLessonIndex;
                  const isLocked = index > 0 && !progress[lessons[index - 1].id]?.is_completed;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => jumpToLesson(index)}
                      disabled={isLocked}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isCurrent 
                          ? 'border-primary bg-primary/5' 
                          : isLocked 
                          ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          getMediaIcon(lesson.media_type)
                        )}
                        <span className="text-sm font-medium truncate">
                          {lesson.title}
                        </span>
                      </div>
                      {lesson.min_time_seconds > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(lesson.min_time_seconds)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{currentLesson.title}</CardTitle>
                  <Badge variant={currentProgress?.is_completed ? "default" : "secondary"}>
                    {currentProgress?.is_completed ? "Ukończone" : "W trakcie"}
                  </Badge>
                </div>
                
                {/* Progress Bar */}
                {currentLesson.min_time_seconds > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Postęp</span>
                      <span>
                        {formatTime(totalTimeSpent)} / {formatTime(currentLesson.min_time_seconds)}
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Media Content */}
                {currentLesson.media_url && (
                  <div className="border rounded-lg overflow-hidden">
                    <SecureMedia 
                      mediaUrl={currentLesson.media_url}
                      mediaType={currentLesson.media_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
                      altText={currentLesson.media_alt_text}
                      disableInteraction={!isLessonCompleted}
                      className="w-full max-h-96 object-contain"
                    />
                    {isLessonCompleted && currentLesson.media_type === 'video' && (
                      <div className="bg-green-50 border-t border-green-200 px-4 py-2 text-sm text-green-700">
                        ✓ Lekcja ukończona - możesz obejrzeć ponownie z pełnymi kontrolkami
                      </div>
                    )}
                  </div>
                )}

                {/* Text Content */}
                {currentLesson.content && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  </div>
                )}

                <Separator />

                {/* Navigation */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={currentLessonIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Poprzednia
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentLessonIndex + 1} z {lessons.length}
                  </div>

                  <Button
                    onClick={goToNextLesson}
                    disabled={!canProceed && currentLesson.min_time_seconds > 0 && !isLessonCompleted}
                  >
                    {currentLessonIndex === lessons.length - 1 ? "Zakończ" : "Następna"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Time Warning */}
                {!canProceed && currentLesson.min_time_seconds > 0 && !isLessonCompleted && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <Clock className="h-5 w-5 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm text-amber-800">
                      Musisz spędzić co najmniej {formatTime(currentLesson.min_time_seconds)} na tej lekcji, 
                      aby przejść do następnej.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Pozostało: {formatTime(Math.max(0, currentLesson.min_time_seconds - totalTimeSpent))}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingModule;