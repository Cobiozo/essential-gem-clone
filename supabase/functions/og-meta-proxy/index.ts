 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 const CRAWLER_USER_AGENTS = [
   'facebookexternalhit',
   'Facebot',
   'WhatsApp',
   'Twitterbot',
   'LinkedInBot',
   'Slackbot',
   'TelegramBot',
   'Pinterest',
   'Discordbot',
 ]
 
 function isCrawler(userAgent: string | null): boolean {
   if (!userAgent) return false
   return CRAWLER_USER_AGENTS.some(crawler => 
     userAgent.toLowerCase().includes(crawler.toLowerCase())
   )
 }
 
 Deno.serve(async (req) => {
   console.log('og-meta-proxy called, User-Agent:', req.headers.get('user-agent'))
   
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders })
   }
 
   const userAgent = req.headers.get('user-agent')
   
   // If not a crawler, return JSON response
   if (!isCrawler(userAgent)) {
     console.log('Not a crawler, returning JSON')
     return new Response(JSON.stringify({ crawler: false, message: 'Not a social media crawler' }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     })
   }
 
   console.log('Crawler detected, fetching meta tags from database')
 
   // Fetch meta tags from database
   const supabase = createClient(
     Deno.env.get('SUPABASE_URL') ?? '',
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
   )
 
   const { data, error } = await supabase
     .from('page_settings')
     .select('og_title, og_description, og_image_url, og_site_name, og_url')
     .eq('page_type', 'homepage')
     .single()
 
   if (error) {
     console.error('Error fetching page_settings:', error)
   }
 
   const ogTitle = data?.og_title || 'Pure Life Center'
   const ogDescription = data?.og_description || 'Zmieniamy życie i zdrowie ludzi na lepsze'
   const ogImage = data?.og_image_url || ''
   const ogSiteName = data?.og_site_name || 'Pure Life Center'
   const ogUrl = data?.og_url || 'https://purelife.info.pl'
 
   console.log('Returning HTML with OG tags:', { ogTitle, ogDescription, ogImage, ogSiteName, ogUrl })
 
   // Return HTML with meta tags for crawlers
   const html = `<!DOCTYPE html>
 <html lang="pl">
 <head>
   <meta charset="UTF-8">
   <title>${ogTitle}</title>
   <meta property="og:title" content="${ogTitle}" />
   <meta property="og:description" content="${ogDescription}" />
   <meta property="og:image" content="${ogImage}" />
   <meta property="og:url" content="${ogUrl}" />
   <meta property="og:site_name" content="${ogSiteName}" />
   <meta property="og:type" content="website" />
   <meta name="twitter:card" content="summary_large_image" />
   <meta name="twitter:title" content="${ogTitle}" />
   <meta name="twitter:description" content="${ogDescription}" />
   <meta name="twitter:image" content="${ogImage}" />
 </head>
 <body></body>
 </html>`
 
   return new Response(html, {
     headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
   })
 })