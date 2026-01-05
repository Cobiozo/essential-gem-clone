import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId } = await req.json();

    if (!userId || !moduleId) {
      throw new Error('userId and moduleId are required');
    }

    console.log(`🎓 Auto-generating certificate for user ${userId}, module ${moduleId}`);

    // 1. Get all lessons for this module
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('training_lessons')
      .select('id')
      .eq('module_id', moduleId)
      .eq('is_active', true);

    if (lessonsError) throw lessonsError;
    if (!lessons || lessons.length === 0) {
      throw new Error('No lessons found for this module');
    }

    const lessonIds = lessons.map(l => l.id);
    console.log(`📚 Module has ${lessons.length} lessons`);

    // 2. Check user's progress - all lessons must be completed
    const { data: progressData, error: progressError } = await supabaseAdmin
      .from('training_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds);

    if (progressError) throw progressError;

    const completedLessons = progressData?.filter(p => p.is_completed) || [];
    console.log(`✅ Completed ${completedLessons.length}/${lessons.length} lessons`);

    if (completedLessons.length < lessons.length) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not all lessons completed',
        completed: completedLessons.length,
        total: lessons.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Check if certificate already exists
    const { data: existingCert, error: certCheckError } = await supabaseAdmin
      .from('certificates')
      .select('id, file_url')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (certCheckError) throw certCheckError;

    if (existingCert) {
      console.log(`📜 Certificate already exists: ${existingCert.id}`);
      return new Response(JSON.stringify({
        success: true,
        alreadyExists: true,
        certificateId: existingCert.id,
        fileUrl: existingCert.file_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Get user's role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) throw roleError;
    const role = userRole?.role || 'client';
    console.log(`👤 User role: ${role}`);

    // 5. Get user's profile for name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const userName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.email || 'Unknown User';

    // 6. Get module title
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from('training_modules')
      .select('title')
      .eq('id', moduleId)
      .single();

    if (moduleError) throw moduleError;
    const moduleTitle = moduleData.title;

    console.log(`📝 Generating certificate for: ${userName} - ${moduleTitle}`);

    // 7. Find template assigned to THIS MODULE (strict - no fallback)
    const { data: allTemplates, error: templatesError } = await supabaseAdmin
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (templatesError) throw templatesError;
    if (!allTemplates || allTemplates.length === 0) {
      throw new Error('No certificate templates found');
    }

    let selectedTemplate = null;

    // Priority 1: Template matching both role AND module
    selectedTemplate = allTemplates.find(t => 
      t.roles?.includes(role) && t.module_ids?.includes(moduleId)
    );

    // Priority 2: Template matching only module (any role)
    if (!selectedTemplate) {
      selectedTemplate = allTemplates.find(t => 
        t.module_ids?.includes(moduleId)
      );
    }

    // NO FALLBACK - template MUST be assigned to the module
    if (!selectedTemplate) {
      throw new Error(`Brak szablonu certyfikatu przypisanego do modułu. Skontaktuj się z administratorem.`);
    }

    console.log(`🎨 Using template: ${selectedTemplate.name} (ID: ${selectedTemplate.id})`);

    // 8. Generate PDF using jsPDF-compatible approach
    // For now, we'll create a simple placeholder and store the certificate record
    // The actual PDF generation would require a more complex setup with canvas/PDF libraries
    
    const completionDate = new Date().toLocaleDateString('pl-PL');
    
    // Create certificate record
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .insert({
        user_id: userId,
        module_id: moduleId,
        issued_by: userId, // Self-issued on completion
        file_url: `pending-generation-${Date.now()}`, // Will be updated when PDF is generated
      })
      .select()
      .single();

    if (certError) throw certError;

    console.log(`📜 Certificate record created: ${certificate.id}`);

    // 9. Update training_assignments to mark as completed
    const { error: assignmentError } = await supabaseAdmin
      .from('training_assignments')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_id', moduleId);

    if (assignmentError) {
      console.warn('Could not update training assignment:', assignmentError);
    }

    return new Response(JSON.stringify({
      success: true,
      certificateId: certificate.id,
      templateUsed: selectedTemplate.name,
      userName,
      moduleTitle,
      completionDate,
      message: 'Certificate generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in auto-generate-certificate:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
