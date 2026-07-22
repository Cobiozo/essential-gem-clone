import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HomepageV2Content, HomepageVariant, TrustedLogo } from '@/types/homepageV2';

const DEFAULT_TRUSTED_LOGOS: TrustedLogo[] = [
  { id: 'tl-eqology', url: '', alt: 'EQOLOGY', heightPx: 40 },
  { id: 'tl-goed', url: '', alt: 'GOED', heightPx: 40 },
  { id: 'tl-msc', url: '', alt: 'MSC', heightPx: 40 },
  { id: 'tl-gmp', url: '', alt: 'GMP CERTIFIED', heightPx: 40 },
  { id: 'tl-arctic', url: '', alt: 'ARCTIC OIL', heightPx: 40 },
];

/** Fill in fields introduced after initial deploy so the editor always has slots. */
function withDefaults(c: HomepageV2Content): HomepageV2Content {
  const next = { ...c } as HomepageV2Content;
  next.trustedBy = next.trustedBy || ({ eyebrow: 'ZAUFALI NAM', logos: [] } as any);
  if (!next.trustedBy.logos || next.trustedBy.logos.length === 0) {
    next.trustedBy.logos = DEFAULT_TRUSTED_LOGOS;
  }
  next.community = next.community || ({} as any);
  // Migrate legacy flat CTA fields → CtaConfig objects (in-memory only).
  next.hero = { ...next.hero };
  if (!next.hero.primaryCta && (next.hero.primaryCtaText || next.hero.primaryCtaUrl)) {
    next.hero.primaryCta = {
      text: next.hero.primaryCtaText || '',
      url: next.hero.primaryCtaUrl || '',
      kind: inferKind(next.hero.primaryCtaUrl || ''),
    };
  }
  if (!next.hero.secondaryCta && (next.hero.secondaryCtaText || next.hero.secondaryCtaUrl)) {
    next.hero.secondaryCta = {
      text: next.hero.secondaryCtaText || '',
      url: next.hero.secondaryCtaUrl || '',
      kind: inferKind(next.hero.secondaryCtaUrl || ''),
    };
  }
  if (!next.community.cta && (next.community.ctaText || next.community.ctaUrl)) {
    next.community.cta = {
      text: next.community.ctaText || '',
      url: next.community.ctaUrl || '',
      kind: inferKind(next.community.ctaUrl || ''),
    };
  }
  // Migrate legacy hero.mockupImage → hero.media
  if (!next.hero.media) {
    next.hero.media = { kind: 'image', imageUrl: next.hero.mockupImage || '' };
  }
  return next;
}

function inferKind(url: string): 'external' | 'route' | 'anchor' {
  if (!url) return 'route';
  if (url.startsWith('#')) return 'anchor';
  if (/^https?:\/\//i.test(url)) return 'external';
  return 'route';
}



export function useHomepageVariant() {
  const [variant, setVariant] = useState<HomepageVariant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase.from('homepage_settings' as any) as any)
      .select('active_variant')
      .maybeSingle();
    setVariant((data?.active_variant as HomepageVariant) || 'v1');
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await load();
    })();

    const channel = supabase
      .channel('homepage_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_settings' }, (payload: any) => {
        const v = payload?.new?.active_variant as HomepageVariant | undefined;
        if (v) setVariant(v);
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [load]);

  return { variant, loading, reload: load };
}

export function useHomepageV2Content(preferDraft = false) {
  const [content, setContent] = useState<HomepageV2Content | null>(null);
  const [draft, setDraft] = useState<HomepageV2Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase.from('homepage_v2_content' as any) as any)
      .select('id, content, draft_content')
      .maybeSingle();
    if (data) {
      setRowId(data.id);
      setContent(withDefaults(data.content as HomepageV2Content));
      setDraft(data.draft_content ? withDefaults(data.draft_content as HomepageV2Content) : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('homepage_v2_content_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_v2_content' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const active = preferDraft ? (draft ?? content) : content;
  return { content: active, published: content, draft, loading, rowId, reload: load };
}
