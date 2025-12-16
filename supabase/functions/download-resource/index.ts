import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MIME type mapping for common file types
const mimeTypes: Record<string, string> = {
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'json': 'application/json',
  'xml': 'application/xml',
  'html': 'text/html',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'audio/ogg',
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return mimeTypes[ext] || 'application/octet-stream'
}

function sanitizeFilename(filename: string): string {
  // Remove or replace problematic characters for Content-Disposition
  return filename
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const resourceId = url.searchParams.get('id')

    if (!resourceId) {
      console.error('Missing resource ID')
      return new Response(
        JSON.stringify({ error: 'Missing resource ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Download request for resource: ${resourceId}`)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch resource metadata from database
    const { data: resource, error: resourceError } = await supabase
      .from('knowledge_resources')
      .select('id, title, file_name, source_url, source_type, resource_type, allow_download')
      .eq('id', resourceId)
      .single()

    if (resourceError || !resource) {
      console.error('Resource not found:', resourceError)
      return new Response(
        JSON.stringify({ error: 'Resource not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!resource.allow_download) {
      console.error('Download not allowed for this resource')
      return new Response(
        JSON.stringify({ error: 'Download not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!resource.source_url) {
      console.error('No source URL for resource')
      return new Response(
        JSON.stringify({ error: 'No file available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update download count (fire and forget)
    supabase
      .from('knowledge_resources')
      .update({ download_count: (resource as any).download_count + 1 })
      .eq('id', resourceId)
      .then(() => console.log('Download count updated'))

    const sourceUrl = resource.source_url
    const filename = resource.file_name || resource.title || 'download'
    
    console.log(`Fetching file from: ${sourceUrl}`)

    // Fetch the file
    const fileResponse = await fetch(sourceUrl)
    
    if (!fileResponse.ok) {
      console.error(`Failed to fetch file: ${fileResponse.status}`)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fileBuffer = await fileResponse.arrayBuffer()
    const contentType = getContentType(filename)
    const safeFilename = sanitizeFilename(filename)

    console.log(`Streaming file: ${safeFilename}, type: ${contentType}, size: ${fileBuffer.byteLength}`)

    // Return file with proper headers for download
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('Download error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
