import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CertificateResult {
  success: boolean;
  certificateId?: string;
  certificateUrl?: string;
  error?: string;
}

// Polish character normalization for PDF (when Unicode font is not available)
const normalizePolishChars = (text: string): string => {
  // Map Polish diacritical characters to their closest ASCII equivalents
  const polishMap: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
    'ó': 'o', 'ś': 's', 'ż': 'z', 'ź': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
    'Ó': 'O', 'Ś': 'S', 'Ż': 'Z', 'Ź': 'Z',
  };
  
  return text.split('').map(char => polishMap[char] || char).join('');
};

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

      // 2. Get user profile with extended fields
      console.log('Step 1: Fetching user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, eq_id, city, country')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        throw new Error(`Profile error: ${profileError.message}`);
      }

      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const userName = firstName && lastName
        ? `${firstName} ${lastName}`
        : profile?.email || 'Unknown User';
      const userEmail = profile?.email || '';
      const eqId = profile?.eq_id || 'N/A';
      const userCity = profile?.city || '';
      const userCountry = profile?.country || '';
      
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

      // 5. Find template assigned to THIS MODULE (strict - no fallback)
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

      // NO FALLBACK - template MUST be assigned to the module
      if (!template) {
        throw new Error(`Brak szablonu certyfikatu przypisanego do modułu "${moduleTitle}". Skontaktuj się z administratorem.`);
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

      // Note: jsPDF built-in fonts (helvetica, times, courier) don't support Polish characters
      // We use the normalizePolishChars function to ensure text displays correctly
      // For proper Polish character support, a custom TTF font would need to be embedded
      console.log('Step 4b: Using ASCII-normalized text for PDF compatibility');

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

      const issueDate = new Date().toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      const currentYear = String(new Date().getFullYear());
      // Certificate number will be generated after saving
      const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;

      const replacePlaceholders = (text: string): string => {
        let result = text
          // Format z pojedynczymi nawiasami (używany w edytorze szablonów)
          // Dane użytkownika
          .replace(/\{userName\}/gi, userName)
          .replace(/\{user_name\}/gi, userName)
          .replace(/\{firstName\}/gi, firstName)
          .replace(/\{first_name\}/gi, firstName)
          .replace(/\{lastName\}/gi, lastName)
          .replace(/\{last_name\}/gi, lastName)
          .replace(/\{eqId\}/gi, eqId)
          .replace(/\{eq_id\}/gi, eqId)
          .replace(/\{email\}/gi, userEmail)
          .replace(/\{city\}/gi, userCity)
          .replace(/\{country\}/gi, userCountry)
          // Dane szkolenia
          .replace(/\{moduleTitle\}/gi, moduleTitle)
          .replace(/\{module_title\}/gi, moduleTitle)
          // Daty
          .replace(/\{completionDate\}/gi, completionDate)
          .replace(/\{completedDate\}/gi, completionDate)
          .replace(/\{completed_date\}/gi, completionDate)
          .replace(/\{date\}/gi, completionDate)
          .replace(/\{issueDate\}/gi, issueDate)
          .replace(/\{issue_date\}/gi, issueDate)
          // Dane certyfikatu
          .replace(/\{certificateNumber\}/gi, certificateNumber)
          .replace(/\{certificate_number\}/gi, certificateNumber)
          .replace(/\{currentYear\}/gi, currentYear)
          .replace(/\{current_year\}/gi, currentYear)
          // Format z podwójnymi nawiasami (zachowany dla kompatybilności)
          .replace(/\{\{userName\}\}/gi, userName)
          .replace(/\{\{user_name\}\}/gi, userName)
          .replace(/\{\{firstName\}\}/gi, firstName)
          .replace(/\{\{lastName\}\}/gi, lastName)
          .replace(/\{\{eqId\}\}/gi, eqId)
          .replace(/\{\{email\}\}/gi, userEmail)
          .replace(/\{\{city\}\}/gi, userCity)
          .replace(/\{\{country\}\}/gi, userCountry)
          .replace(/\{\{moduleTitle\}\}/gi, moduleTitle)
          .replace(/\{\{module_title\}\}/gi, moduleTitle)
          .replace(/\{\{completionDate\}\}/gi, completionDate)
          .replace(/\{\{completedDate\}\}/gi, completionDate)
          .replace(/\{\{completed_date\}\}/gi, completionDate)
          .replace(/\{\{date\}\}/gi, completionDate)
          .replace(/\{\{issueDate\}\}/gi, issueDate)
          .replace(/\{\{certificateNumber\}\}/gi, certificateNumber)
          .replace(/\{\{currentYear\}\}/gi, currentYear);
        
        // Normalize Polish characters for PDF compatibility
        return normalizePolishChars(result);
      };

      console.log('Rendering', elements.length, 'template elements...');

      for (const element of elements) {
        const x = (element.x || 0) * PX_TO_MM;
        const y = (element.y || 0) * PX_TO_MM;
        const width = (element.width || 100) * PX_TO_MM;
        const height = (element.height || 50) * PX_TO_MM;

        console.log(`Processing element: type=${element.type}, x=${x.toFixed(1)}, y=${y.toFixed(1)}, hasImageUrl=${!!element.imageUrl}, hasContent=${!!element.content}`);

        // Obsługa obrazów - używamy imageUrl (nie src)
        if (element.type === 'image' && element.imageUrl) {
          try {
            console.log('Loading image from:', element.imageUrl);
            const imageData = await loadImageAsBase64(element.imageUrl);
            if (imageData) {
              doc.addImage(imageData, 'PNG', x, y, width, height);
              console.log('✅ Image added to PDF');
            }
          } catch (e) {
            console.warn('Could not load image:', e);
          }
        } 
        // Obsługa tekstu - używamy content (nie text), color (nie fill)
        else if (element.type === 'text' && element.content) {
          const text = replacePlaceholders(element.content);
          const fontSizeVal = element.fontSize || 16;
          doc.setFontSize(fontSizeVal * 0.75);
          
          // Obsługa stylów czcionki
          const isBold = element.fontWeight === 'bold' || Number(element.fontWeight) >= 700;
          const isItalic = element.fontStyle === 'italic';
          
          if (isBold && isItalic) {
            doc.setFont('helvetica', 'bolditalic');
          } else if (isBold) {
            doc.setFont('helvetica', 'bold');
          } else if (isItalic) {
            doc.setFont('helvetica', 'italic');
          } else {
            doc.setFont('helvetica', 'normal');
          }

          // Używamy color (nie fill)
          const colorValue = element.color || element.fill;
          if (colorValue && colorValue.startsWith('#')) {
            const r = parseInt(colorValue.slice(1, 3), 16);
            const g = parseInt(colorValue.slice(3, 5), 16);
            const b = parseInt(colorValue.slice(5, 7), 16);
            doc.setTextColor(r, g, b);
          }

          const textAlign = element.align || 'left';
          let textX = x;
          if (textAlign === 'center') {
            textX = x + width / 2;
          } else if (textAlign === 'right') {
            textX = x + width;
          }

          // Obsługa noWrap - tekst w jednej linii bez zawijania
          if (element.noWrap) {
            doc.text(text, textX, y + fontSizeVal * PX_TO_MM, { 
              align: textAlign as 'left' | 'center' | 'right'
            });
          } else {
            doc.text(text, textX, y + fontSizeVal * PX_TO_MM, { 
              align: textAlign as 'left' | 'center' | 'right',
              maxWidth: width > 0 ? width : undefined
            });
          }
          console.log('✅ Text added:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
        }
        // Obsługa prostokątów - używamy color (nie fill)
        else if (element.type === 'rect') {
          const colorValue = element.color || element.fill;
          if (colorValue && colorValue.startsWith('#')) {
            const r = parseInt(colorValue.slice(1, 3), 16);
            const g = parseInt(colorValue.slice(3, 5), 16);
            const b = parseInt(colorValue.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.rect(x, y, width, height, 'F');
            console.log('✅ Rectangle added');
          }
        }
        // Obsługa linii
        else if (element.type === 'line') {
          const colorValue = element.color || element.stroke || '#000000';
          if (colorValue.startsWith('#')) {
            const r = parseInt(colorValue.slice(1, 3), 16);
            const g = parseInt(colorValue.slice(3, 5), 16);
            const b = parseInt(colorValue.slice(5, 7), 16);
            doc.setDrawColor(r, g, b);
          }
          doc.setLineWidth(element.strokeWidth || 1);
          doc.line(x, y, x + width, y);
          console.log('✅ Line added');
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
