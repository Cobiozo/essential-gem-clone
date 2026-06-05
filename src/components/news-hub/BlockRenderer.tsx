import React from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentsSection } from './CommentsSection';
import type { NewsHubBlock, NewsHubBlockStyle } from '@/types/newsHubBlocks';

// Context to pass postId to comment blocks rendered inside content
const PostContext = React.createContext<{ postId?: string } | null>(null);
export const NewsHubPostContextProvider: React.FC<{ postId: string; children: React.ReactNode }> = ({ postId, children }) => (
  <PostContext.Provider value={{ postId }}>{children}</PostContext.Provider>
);
export function useNewsHubPostContext() { return React.useContext(PostContext); }

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const VideoFrame: React.FC<{ url: string }> = ({ url }) => {
  const [error, setError] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const yt = !error ? youTubeId(url) : null;
  const vm = !error ? vimeoId(url) : null;

  React.useEffect(() => {
    setError(false);
    if (!url || yt || vm) return;
    let cancelled = false;
    fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' }).then((res) => {
      if (cancelled) return;
      if (res.status === 404 || (res.status !== 200 && res.status !== 206)) { setError(true); return; }
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.startsWith('text/html')) setError(true);
    }).catch(() => {});
    const t = setTimeout(() => {
      if (cancelled) return;
      const v = videoRef.current;
      if (!v) return;
      if (!isFinite(v.duration) || v.duration === 0) setError(true);
    }, 6000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [url, yt, vm]);

  if (!url) return <div className="aspect-video w-full rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">Brak URL wideo</div>;
  if (yt) return <div className="aspect-video w-full overflow-hidden rounded-xl bg-black"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${yt}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  if (vm) return <div className="aspect-video w-full overflow-hidden rounded-xl bg-black"><iframe className="h-full w-full" src={`https://player.vimeo.com/video/${vm}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
  if (error) {
    return (
      <div className="aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span>Nie można odtworzyć tego pliku wideo.</span>
        <span>Plik mógł zostać usunięty lub serwer zwraca nieprawidłową odpowiedź. Wgraj plik ponownie z poziomu edytora.</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{url}</a>
      </div>
    );
  }
  return <video ref={videoRef} controls preload="metadata" playsInline className="aspect-video w-full rounded-xl bg-black" src={url} onError={() => setError(true)} />;
};

function wrapStyle(s?: NewsHubBlockStyle): React.CSSProperties {
  if (!s) return {};
  return {
    marginTop: s.mt,
    marginBottom: s.mb,
    background: s.bg,
    textAlign: s.align,
    maxWidth: s.maxWidth,
    marginLeft: s.maxWidth ? 'auto' : undefined,
    marginRight: s.maxWidth ? 'auto' : undefined,
    paddingLeft: s.paddingX,
    paddingRight: s.paddingX,
    paddingTop: s.paddingY,
    paddingBottom: s.paddingY,
    borderRadius: s.radius,
  };
}

function wrapClass(s?: NewsHubBlockStyle): string {
  if (!s) return '';
  return cn(s.hideMobile && 'hidden md:block', s.hideDesktop && 'md:hidden');
}

const calloutIcon = (v?: string) => {
  switch (v) {
    case 'warning': return <AlertTriangle className="h-5 w-5" />;
    case 'success': return <CheckCircle2 className="h-5 w-5" />;
    case 'danger': return <XCircle className="h-5 w-5" />;
    default: return <Info className="h-5 w-5" />;
  }
};
const calloutColor = (v?: string) => {
  switch (v) {
    case 'warning': return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'success': return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'danger': return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300';
    default: return 'border-primary/40 bg-primary/10 text-primary';
  }
};

interface Props {
  block: NewsHubBlock;
}

export const BlockView: React.FC<Props> = ({ block }) => {
  const s = block.style || {};
  const wrapS = wrapStyle(s);
  const wrapC = wrapClass(s);
  const d: any = block.data || {};

  switch (block.type) {
    case 'heading': {
      const level = (d.level || 2) as 1 | 2 | 3 | 4;
      const Tag = (`h${level}`) as any;
      const sizes: Record<number, string> = { 1: 'text-4xl md:text-5xl font-bold', 2: 'text-3xl md:text-4xl font-bold', 3: 'text-2xl font-semibold', 4: 'text-xl font-semibold' };
      return <Tag className={cn(sizes[level], 'leading-tight', wrapC)} style={{ ...wrapS, color: d.color, textAlign: d.align || wrapS.textAlign }}>{d.text || ''}</Tag>;
    }
    case 'paragraph': {
      const html = DOMPurify.sanitize(d.html || '', { USE_PROFILES: { html: true } });
      return <div className={cn('prose prose-invert max-w-none text-foreground/90 leading-relaxed', wrapC)} style={wrapS} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case 'image': {
      if (!d.url) return null;
      const img = (
        <img src={d.url} alt={d.alt || ''} loading="lazy"
          className="block w-full rounded-xl"
          style={{ objectFit: d.fit || 'cover', height: d.height ? `${d.height}px` : undefined }} />
      );
      return (
        <figure className={cn(wrapC)} style={wrapS}>
          {d.href ? <a href={d.href} target="_blank" rel="noopener noreferrer">{img}</a> : img}
          {d.caption && <figcaption className="mt-2 text-xs text-muted-foreground text-center">{d.caption}</figcaption>}
        </figure>
      );
    }
    case 'gallery': {
      const imgs: string[] = Array.isArray(d.images) ? d.images : [];
      if (!imgs.length) return null;
      const cols = d.columns || 3;
      const gridCols: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' };
      return (
        <div className={cn('grid gap-2', gridCols[cols], wrapC)} style={wrapS}>
          {imgs.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-muted">
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform" />
            </a>
          ))}
        </div>
      );
    }
    case 'video': {
      return (
        <div className={cn(wrapC)} style={wrapS}>
          <VideoFrame url={d.url || ''} />
          {d.caption && <div className="mt-2 text-xs text-muted-foreground text-center">{d.caption}</div>}
        </div>
      );
    }
    case 'file_download': {
      if (!d.url) return null;
      return (
        <div className={cn('rounded-xl border border-border bg-card p-4 flex items-center gap-4', wrapC)} style={wrapS}>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{d.name || 'Plik'}</div>
            {d.description && <div className="text-sm text-muted-foreground truncate">{d.description}</div>}
          </div>
          <a href={d.url} target="_blank" rel="noopener noreferrer" download={d.name || true}>
            <Button size="sm" className="gap-2"><Download className="h-4 w-4" /> Pobierz</Button>
          </a>
        </div>
      );
    }
    case 'button_cta': {
      if (!d.url) return null;
      const align = d.align || 'left';
      return (
        <div className={cn('w-full', wrapC)} style={{ ...wrapS, textAlign: align }}>
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button variant={d.variant || 'default'} size="lg" className="gap-2">
              {d.text || 'Przejdź'} <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      );
    }
    case 'callout': {
      return (
        <div className={cn('rounded-xl border p-4 flex gap-3', calloutColor(d.variant), wrapC)} style={wrapS}>
          <div className="shrink-0 mt-0.5">{calloutIcon(d.variant)}</div>
          <div className="min-w-0">
            {d.title && <div className="font-semibold mb-1">{d.title}</div>}
            {d.text && <div className="text-sm leading-relaxed whitespace-pre-wrap">{d.text}</div>}
          </div>
        </div>
      );
    }
    case 'divider': {
      return <hr className={cn('border-0 bg-border', wrapC)} style={{ ...wrapS, height: d.thickness || 1, backgroundColor: d.color || undefined }} />;
    }
    case 'columns': {
      const cols: NewsHubBlock[][] = Array.isArray(d.columns) ? d.columns : [[], []];
      const ratio = d.ratio || '1-1';
      const ratioClass: Record<string, string> = {
        '1-1': 'md:grid-cols-2',
        '1-2': 'md:grid-cols-[1fr_2fr]',
        '2-1': 'md:grid-cols-[2fr_1fr]',
        '1-1-1': 'md:grid-cols-3',
      };
      return (
        <div className={cn('grid grid-cols-1 gap-6', ratioClass[ratio], wrapC)} style={wrapS}>
          {cols.map((col, i) => (
            <div key={i} className="space-y-4">
              {col.map((b) => <BlockView key={b.id} block={b} />)}
            </div>
          ))}
        </div>
      );
    }
    case 'table': {
      const rows: string[][] = Array.isArray(d.rows) ? d.rows : [];
      if (!rows.length) return null;
      const header = d.headerRow !== false;
      return (
        <div className={cn('overflow-x-auto rounded-xl border border-border', wrapC)} style={wrapS}>
          <table className="w-full text-sm">
            {header && (
              <thead className="bg-muted">
                <tr>{rows[0].map((c, i) => <th key={i} className="p-3 text-left font-semibold">{c}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {rows.slice(header ? 1 : 0).map((r, ri) => (
                <tr key={ri} className="border-t border-border">
                  {r.map((c, ci) => <td key={ci} className="p-3">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'embed': {
      if (!d.html) return null;
      const clean = DOMPurify.sanitize(d.html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src', 'scrolling'] });
      return <div className={cn('overflow-hidden rounded-xl border border-border', wrapC)} style={wrapS} dangerouslySetInnerHTML={{ __html: clean }} />;
    }
    case 'comments': {
      const ctx = useNewsHubPostContext();
      if (!ctx?.postId) return null;
      return (
        <div className={cn(wrapC)} style={wrapS}>
          <CommentsSection postId={ctx.postId} title={d.title || 'Komentarze'} inline />
        </div>
      );
    }
    case 'legacy_html': {
      const html = DOMPurify.sanitize(d.html || '', { USE_PROFILES: { html: true } });
      return <div className={cn('prose prose-invert max-w-none text-foreground/90 leading-relaxed', wrapC)} style={wrapS} dangerouslySetInnerHTML={{ __html: html }} />;
    }
  }
  return null;
};

export const BlockListView: React.FC<{ blocks: NewsHubBlock[] }> = ({ blocks }) => (
  <div className="space-y-6">
    {blocks.map((b) => <BlockView key={b.id} block={b} />)}
  </div>
);
