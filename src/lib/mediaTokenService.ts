import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://xzlhssqqbajqhnsmbucf.supabase.co";

// URLs that should be protected via token proxy
function shouldProtectUrl(url: string): boolean {
  // Protect VPS videos and any non-YouTube, non-Supabase external media
  if (url.includes('purelife.info.pl')) return true;
  // Don't protect YouTube, Supabase storage (has its own signed URLs), or data URIs
  if (url.includes('youtube.com') || url.includes('youtu.be')) return false;
  if (url.includes('supabase.co')) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('blob:')) return false;
  return false; // Only protect purelife.info.pl for now
}

/**
 * Generate a short-lived media access token for a protected URL.
 * The real URL is stored server-side and never exposed to the browser.
 */
export async function generateMediaToken(mediaUrl: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-media-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA',
    },
    body: JSON.stringify({ media_url: mediaUrl }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate media token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Get the stream-media proxy URL for a given token.
 */
export function getStreamMediaUrl(token: string): string {
  return `${SUPABASE_URL}/functions/v1/stream-media?token=${token}`;
}

export { shouldProtectUrl };
