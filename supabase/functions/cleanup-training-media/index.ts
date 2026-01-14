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

    const bucket = 'training-media';
    let totalDeleted = 0;
    const errors: string[] = [];
    const deletedFiles: string[] = [];

    // Pobierz wszystkie pliki z bucketu (główny folder)
    const { data: rootFiles, error: rootError } = await supabaseAdmin.storage
      .from(bucket)
      .list('', { limit: 1000 });

    if (rootError) {
      throw new Error(`Error listing root files: ${rootError.message}`);
    }

    // Pobierz pliki z podfolderów
    const allFiles: { path: string; name: string }[] = [];

    for (const item of rootFiles || []) {
      if (item.id === null) {
        // To jest folder - pobierz jego zawartość
        const { data: folderFiles, error: folderError } = await supabaseAdmin.storage
          .from(bucket)
          .list(item.name, { limit: 1000 });

        if (folderError) {
          errors.push(`Error listing folder ${item.name}: ${folderError.message}`);
          continue;
        }

        for (const file of folderFiles || []) {
          if (file.id !== null) {
            allFiles.push({ path: `${item.name}/${file.name}`, name: file.name });
          }
        }
      } else {
        // To jest plik w głównym folderze
        allFiles.push({ path: item.name, name: item.name });
      }
    }

    console.log(`Found ${allFiles.length} files in ${bucket}`);

    // Usuń pliki partiami po 100
    const batchSize = 100;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      const paths = batch.map(f => f.path);

      const { error: deleteError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(paths);

      if (deleteError) {
        errors.push(`Batch delete error: ${deleteError.message}`);
      } else {
        totalDeleted += batch.length;
        deletedFiles.push(...paths);
      }
    }

    const result = {
      success: true,
      bucket,
      totalFilesFound: allFiles.length,
      totalDeleted,
      errors: errors.length > 0 ? errors : undefined,
      deletedFiles: deletedFiles.slice(0, 20), // Pokaż pierwsze 20 dla przykładu
      message: `Usunięto ${totalDeleted} z ${allFiles.length} plików z bucketu ${bucket}`
    };

    console.log(result);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
