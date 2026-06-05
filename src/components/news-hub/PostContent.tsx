import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { NewsHubPost, NewsHubStyleOverrides } from '@/types/newsHub';
import { POST_TYPE_LABELS } from '@/types/newsHub';
import { BlockListView, NewsHubPostContextProvider } from './BlockRenderer';
import { CommentsSection } from './CommentsSection';

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const VideoPlayer: React.FC<{ url: string }> = ({ url }) => {
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

  if (yt) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${yt}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (vm) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe className="h-full w-full" src={`https://player.vimeo.com/video/${vm}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (error) {
    return (
      <div className="aspect-video w-full rounded-xl bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <span className="font-medium">Nie można odtworzyć tego pliku wideo.</span>
        <span className="text-xs">Plik mógł zostać usunięty lub serwer zwraca nieprawidłową odpowiedź. Skontaktuj się z administratorem lub wgraj plik ponownie.</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all text-xs">{url}</a>
      </div>
    );
  }
  return (
    <video ref={videoRef} controls preload="metadata" playsInline className="aspect-video w-full rounded-xl bg-black" src={url} onError={() => setError(true)}>
      Twoja przeglądarka nie wspiera wideo.
    </video>
  );
};

interface Props {
  post: NewsHubPost;
  styleOverrides?: NewsHubStyleOverrides;
  showCover?: boolean;
  commentsEnabled?: boolean;
}

// Detect HTML content vs plain text (legacy posts saved before WYSIWYG)
const looksLikeHtml = (s: string) => /<\/?(p|div|h[1-6]|ul|ol|li|strong|em|u|s|a|br|img|hr|blockquote|span)\b/i.test(s);

export const PostContent: React.FC<Props> = ({ post, styleOverrides, showCover = true, commentsEnabled = false }) => {
  const s = styleOverrides || post.style_overrides || {};
  const gallery: string[] = Array.isArray(post.media_metadata?.gallery) ? post.media_metadata.gallery : [];

  const titleStyle: React.CSSProperties = {
    fontSize: s.title?.size ? `${s.title.size}px` : undefined,
    fontWeight: s.title?.weight,
    color: s.title?.color,
    textAlign: s.title?.align,
  };
  const descStyle: React.CSSProperties = {
    fontSize: s.shortDescription?.size ? `${s.shortDescription.size}px` : undefined,
    color: s.shortDescription?.color,
    textAlign: s.shortDescription?.align,
  };

  const cover = s.cover || {};
  const coverWrapClass = cover.height ? '' : 'max-h-[55vh] md:max-h-none aspect-[16/10] md:aspect-auto';
  const coverWrapStyle: React.CSSProperties = {
    height: cover.height ? `${cover.height}px` : undefined,
  };
  const coverImgStyle: React.CSSProperties = {
    objectFit: (cover.fit || 'cover') as React.CSSProperties['objectFit'],
    objectPosition: cover.position || 'center',
    height: cover.height ? `${cover.height}px` : undefined,
    width: '100%',
  };

  const cleanHtml = useMemo(() => {
    if (!post.content) return '';
    if (!looksLikeHtml(post.content)) return '';
    return DOMPurify.sanitize(post.content, { USE_PROFILES: { html: true } });
  }, [post.content]);

  const plainText = !cleanHtml && post.content ? post.content : '';

  return (
    <article className="space-y-4">
      {showCover && post.cover_url && post.type !== 'video' && (
        <div className={`relative overflow-hidden rounded-xl w-full bg-muted ${coverWrapClass}`} style={coverWrapStyle}>
          <img src={post.cover_url} alt={post.title} style={coverImgStyle} className="block max-h-none" />
          {cover.overlay && (cover.overlayOpacity ?? 0) > 0 && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: cover.overlay, opacity: cover.overlayOpacity }} />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {post.category && (
          <span className="rounded-full px-2 py-1 font-medium" style={{ backgroundColor: `${post.category.color}22`, color: post.category.color || undefined }}>
            {post.category.name}
          </span>
        )}
        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{POST_TYPE_LABELS[post.type]}</span>
        <time className="text-muted-foreground whitespace-normal">{format(new Date(post.published_at), "d MMMM yyyy 'o' HH:mm", { locale: pl })}</time>
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight break-words" style={titleStyle}>{post.title}</h1>

      {post.short_description && (
        <p className="text-base sm:text-lg text-muted-foreground" style={descStyle}>{post.short_description}</p>
      )}



      {post.type === 'video' && post.media_url && <VideoPlayer url={post.media_url} />}

      {post.type === 'gallery' && gallery.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {gallery.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg">
              <img src={src} alt={`${post.title} ${i + 1}`} loading="lazy" className="h-full w-full object-cover hover:scale-105 transition-transform" />
            </a>
          ))}
        </div>
      )}

      {Array.isArray(post.content_blocks) && post.content_blocks.length > 0 ? (
        <NewsHubPostContextProvider postId={post.id}>
          <BlockListView blocks={post.content_blocks} />
        </NewsHubPostContextProvider>
      ) : (
        <>
          {cleanHtml && (
            <div
              className="prose prose-invert max-w-none text-foreground/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          )}
          {plainText && (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {plainText}
            </div>
          )}
        </>
      )}

      {post.type === 'embed' && post.embed_html && (
        <div className="overflow-hidden rounded-xl border border-border" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.embed_html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'src', 'scrolling'] }) }} />
      )}

      {post.type === 'file' && post.file_url && (
        <a href={post.file_url} target="_blank" rel="noopener noreferrer" download={post.file_name || true}>
          <Button size="lg" className="gap-2">
            <Download className="h-5 w-5" />
            Pobierz {post.file_name || 'plik'}
          </Button>
        </a>
      )}

      {post.type === 'link' && post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="gap-2">
            <ExternalLink className="h-5 w-5" />
            {post.link_cta || 'Przejdź'}
          </Button>
        </a>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}

      {commentsEnabled && !(post.content_blocks || []).some((b) => b.type === 'comments') && (
        <CommentsSection postId={post.id} className="mt-6" />
      )}
    </article>
  );
};
