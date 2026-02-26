import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const report: Record<string, any> = {
      progress_deleted: 0,
      lessons_deleted: 0,
      modules_deleted: 0,
      vps_files_deleted: 0,
      vps_errors: [] as string[],
      errors: [] as string[],
    };

    // 1. Pobierz nieaktywne moduły
    const { data: inactiveModules, error: modErr } = await supabaseAdmin
      .from('training_modules')
      .select('id, title')
      .eq('is_active', false);

    if (modErr) throw new Error(`Błąd pobierania modułów: ${modErr.message}`);
    if (!inactiveModules || inactiveModules.length === 0) {
      return new Response(JSON.stringify({ message: 'Brak nieaktywnych modułów do usunięcia.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const moduleIds = inactiveModules.map(m => m.id);
    console.log(`Znaleziono ${inactiveModules.length} nieaktywnych modułów:`, inactiveModules.map(m => m.title));

    // 2. Pobierz lekcje tych modułów (potrzebne do usunięcia postępów i plików VPS)
    const { data: lessons, error: lessErr } = await supabaseAdmin
      .from('training_lessons')
      .select('id, media_url')
      .in('module_id', moduleIds);

    if (lessErr) throw new Error(`Błąd pobierania lekcji: ${lessErr.message}`);

    const lessonIds = (lessons || []).map(l => l.id);
    console.log(`Znaleziono ${lessonIds.length} lekcji do usunięcia`);

    // 3. Usuń training_progress powiązane z lekcjami
    if (lessonIds.length > 0) {
      const { count, error: progErr } = await supabaseAdmin
        .from('training_progress')
        .delete({ count: 'exact' })
        .in('lesson_id', lessonIds);

      if (progErr) {
        report.errors.push(`Błąd usuwania postępów: ${progErr.message}`);
      } else {
        report.progress_deleted = count || 0;
        console.log(`Usunięto ${count} rekordów training_progress`);
      }
    }

    // 4. Usuń training_assignments powiązane z modułami
    const { count: assignCount, error: assignErr } = await supabaseAdmin
      .from('training_assignments')
      .delete({ count: 'exact' })
      .in('module_id', moduleIds);

    if (assignErr) {
      report.errors.push(`Błąd usuwania przypisań: ${assignErr.message}`);
    } else {
      report.assignments_deleted = assignCount || 0;
      console.log(`Usunięto ${assignCount} rekordów training_assignments`);
    }

    // 5. Usuń certificates powiązane z modułami
    const { count: certCount, error: certErr } = await supabaseAdmin
      .from('certificates')
      .delete({ count: 'exact' })
      .in('module_id', moduleIds);

    if (certErr) {
      report.errors.push(`Błąd usuwania certyfikatów: ${certErr.message}`);
    } else {
      report.certificates_deleted = certCount || 0;
    }

    // 6. Usuń lekcje
    if (lessonIds.length > 0) {
      const { count: lessonCount, error: delLessErr } = await supabaseAdmin
        .from('training_lessons')
        .delete({ count: 'exact' })
        .in('module_id', moduleIds);

      if (delLessErr) {
        report.errors.push(`Błąd usuwania lekcji: ${delLessErr.message}`);
      } else {
        report.lessons_deleted = lessonCount || 0;
        console.log(`Usunięto ${lessonCount} lekcji`);
      }
    }

    // 7. Usuń moduły
    const { count: modCount, error: delModErr } = await supabaseAdmin
      .from('training_modules')
      .delete({ count: 'exact' })
      .in('id', moduleIds);

    if (delModErr) {
      report.errors.push(`Błąd usuwania modułów: ${delModErr.message}`);
    } else {
      report.modules_deleted = modCount || 0;
      console.log(`Usunięto ${modCount} modułów`);
    }

    // 8. Usuń pliki z VPS
    const vpsBaseUrl = 'https://purelife.info.pl';
    const uploadKey = Deno.env.get('VPS_UPLOAD_KEY') || '';

    for (const lesson of (lessons || [])) {
      if (!lesson.media_url || !lesson.media_url.includes('purelife.info.pl')) continue;

      try {
        // Extract filename from URL like https://purelife.info.pl/uploads/training-media/filename.mp4
        const urlParts = lesson.media_url.split('/');
        const filename = urlParts[urlParts.length - 1];

        const deleteUrl = `${vpsBaseUrl}/upload/${encodeURIComponent(filename)}?folder=training-media`;
        const resp = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'x-upload-key': uploadKey },
        });

        if (resp.ok) {
          report.vps_files_deleted++;
          console.log(`VPS: usunięto ${filename}`);
        } else {
          const errText = await resp.text();
          report.vps_errors.push(`${filename}: ${resp.status} ${errText}`);
        }
      } catch (e) {
        report.vps_errors.push(`${lesson.media_url}: ${e.message}`);
      }
    }

    report.modules_removed = inactiveModules.map(m => m.title);
    report.success = report.errors.length === 0;

    console.log('Raport końcowy:', JSON.stringify(report, null, 2));

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
