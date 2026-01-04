import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CertificateResult {
  success: boolean;
  certificateId?: string;
  certificateUrl?: string;
  error?: string;
}

export const useCertificateGeneration = () => {
  const { toast } = useToast();

  const generateCertificate = async (
    userId: string,
    moduleId: string,
    moduleTitle: string,
    forceRegenerate: boolean = false  // Changed default to false - certificates are one-time only
  ): Promise<CertificateResult> => {
    console.log('=== CERTIFICATE GENERATION START ===');
    console.log('User ID:', userId);
    console.log('Module ID:', moduleId);
    console.log('Module Title:', moduleTitle);
    console.log('Force Regenerate:', forceRegenerate);

    try {
      // 1. Check if certificate already exists
      const { data: existingCert, error: existingError } = await supabase
        .from('certificates')
        .select('id, file_url')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existingError) {
        console.warn('Warning: Could not check existing cert:', existingError);
      }

      // If certificate exists and we're not forcing regeneration, return error
      if (existingCert && !forceRegenerate) {
        console.log('Certificate already exists, returning existing');
        return {
          success: false,
          error: 'Certyfikat już został wygenerowany. Skontaktuj się z Administratorem, aby go ponownie wygenerować.'
        };
      }

      // Delete existing certificate only if forceRegenerate is true
      if (existingCert && forceRegenerate) {
        console.log('🗑️ Deleting existing certificate for regeneration...');
        const { error: deleteError } = await supabase
          .from('certificates')
          .delete()
          .eq('user_id', userId)
          .eq('module_id', moduleId);
        
        if (deleteError) {
          console.warn('Warning: Could not delete existing cert:', deleteError);
        }
      }

      // 2. Get user profile
      console.log('Step 1: Fetching user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        throw new Error(`Profile error: ${profileError.message}`);
      }

      const userName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.email || 'Unknown User';
      console.log('✅ User name:', userName);

      // 3. Get user role
      console.log('Step 2: Fetching user role...');
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      const userRole = userRoles?.role || 'client';
      console.log('✅ User role:', userRole);

      // 4. Fetch ALL certificate templates
      console.log('Step 3: Fetching ALL certificate templates...');
      const { data: templates, error: templateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (templateError) {
        throw new Error(`Template error: ${templateError.message}`);
      }

      if (!templates || templates.length === 0) {
        throw new Error('Nie znaleziono żadnego szablonu certyfikatu');
      }

      console.log('Total templates found:', templates.length);

      // 5. Find best matching template using priority system
      const hasModuleMatch = (templateModuleIds: string[] | null | undefined): boolean => {
        if (!templateModuleIds || !Array.isArray(templateModuleIds) || templateModuleIds.length === 0) return false;
        return templateModuleIds.some((id: string) => String(id) === String(moduleId));
      };

      let template = null;
      let priorityUsed = '';

      // PRIORITY 1: Template assigned to THIS MODULE and user's role
      template = templates.find(t => {
        const hasModule = hasModuleMatch(t.module_ids);
        const hasRole = t.roles && Array.isArray(t.roles) && t.roles.length > 0 && t.roles.includes(userRole);
        return hasModule && hasRole;
      });
      if (template) priorityUsed = 'PRIORITY 1: Module + Role match';

      // PRIORITY 2: Template assigned to THIS MODULE (any role)
      if (!template) {
        template = templates.find(t => hasModuleMatch(t.module_ids));
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
        throw new Error('Nie znaleziono odpowiedniego szablonu certyfikatu');
      }

      console.log('✅ SELECTED TEMPLATE:', template.name);
      console.log('✅ Selection reason:', priorityUsed);

      // 6. Dynamic import of jsPDF
      console.log('Step 4: Loading jsPDF library...');
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const PX_TO_MM = 0.352729;

      // Helper function to load image as base64
      const loadImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
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

      // 7. Render template elements
      const layoutData = template.layout as { elements?: any[] };
      const elements = layoutData?.elements || [];
      
      const completionDate = new Date().toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const replacePlaceholders = (text: string): string => {
        return text
          .replace(/\{\{userName\}\}/g, userName)
          .replace(/\{\{user_name\}\}/g, userName)
          .replace(/\{\{moduleTitle\}\}/g, moduleTitle)
          .replace(/\{\{module_title\}\}/g, moduleTitle)
          .replace(/\{\{completedDate\}\}/g, completionDate)
          .replace(/\{\{completed_date\}\}/g, completionDate)
          .replace(/\{\{date\}\}/g, completionDate);
      };

      for (const element of elements) {
        const x = (element.x || 0) * PX_TO_MM;
        const y = (element.y || 0) * PX_TO_MM;
        const width = (element.width || 100) * PX_TO_MM;
        const height = (element.height || 50) * PX_TO_MM;

        if (element.type === 'image' && element.src) {
          try {
            const imageData = await loadImageAsBase64(element.src);
            if (imageData) {
              doc.addImage(imageData, 'PNG', x, y, width, height);
            }
          } catch (e) {
            console.warn('Could not load image:', e);
          }
        } else if (element.type === 'text' && element.text) {
          const text = replacePlaceholders(element.text);
          const fontSize = element.fontSize || 16;
          doc.setFontSize(fontSize * 0.75);
          
          if (element.fontWeight === 'bold' || element.fontWeight >= 700) {
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setFont('helvetica', 'normal');
          }

          if (element.fill) {
            const color = element.fill;
            if (color.startsWith('#')) {
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              doc.setTextColor(r, g, b);
            }
          }

          const textAlign = element.align || 'left';
          let textX = x;
          if (textAlign === 'center') {
            textX = x + width / 2;
          } else if (textAlign === 'right') {
            textX = x + width;
          }

          doc.text(text, textX, y + fontSize * PX_TO_MM, { 
            align: textAlign as 'left' | 'center' | 'right',
            maxWidth: width
          });
        } else if (element.type === 'rect') {
          if (element.fill) {
            const color = element.fill;
            if (color.startsWith('#')) {
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              doc.setFillColor(r, g, b);
            }
            doc.rect(x, y, width, height, 'F');
          }
        }
      }

      // 8. Upload to storage
      console.log('Step 5: Uploading PDF to storage...');
      const pdfBlob = doc.output('blob');
      const timestamp = Date.now();
      const fileName = `${userId}/${moduleId}/certificate-${timestamp}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      // For private bucket - store only file path, not full URL
      const filePath = fileName;
      console.log('✅ PDF uploaded, file path:', filePath);

      // 9. Save certificate record
      console.log('Step 6: Saving certificate record...');
      const { data: certificate, error: certError } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          module_id: moduleId,
          issued_by: userId,
          file_url: filePath,
        })
        .select()
        .single();

      if (certError) {
        throw new Error(`Certificate save error: ${certError.message}`);
      }

      console.log('✅ Certificate saved:', certificate.id);

      // 10. Update training assignment
      await supabase
        .from('training_assignments')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('module_id', moduleId);

      // 11. Send email notification
      console.log('Step 7: Sending email notification...');
      try {
        await supabase.functions.invoke('send-certificate-email', {
          body: {
            userId: userId,
            moduleId: moduleId,
            certificateId: certificate.id,
            moduleTitle: moduleTitle,
            userName: userName
          }
        });
        console.log('✅ Email sent');
      } catch (emailError) {
        console.warn('Warning: Email sending failed:', emailError);
      }

      console.log('=== CERTIFICATE GENERATION COMPLETE ===');
      
      return {
        success: true,
        certificateId: certificate.id,
        certificateUrl: filePath
      };

    } catch (error) {
      console.error('❌ Certificate generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd'
      };
    }
  };

  return { generateCertificate };
};
