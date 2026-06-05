import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { NewsHubPost } from '@/types/newsHub';
import { POST_TYPE_LABELS } from '@/types/newsHub';
import { incrementPostView } from '@/hooks/useNewsHub';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  post: NewsHubPost | null;
  open: boolean;
  onClose: () => void;
}

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
    return () => { cancelled = true; };
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
        <span className="text-xs">Plik mógł zostać usunięty lub serwer zwraca nieprawidłową odpowiedź. Wgraj plik ponownie z poziomu edytora.</span>
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

export const PostDetailModal: React.FC<Props> = ({ post, open, onClose }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (open && post) {
      incrementPostView(post.id, user?.id);
    }
  }, [open, post, user?.id]);

  if (!post) return null;

  const gallery: string[] = Array.isArray(post.media_metadata?.gallery) ? post.media_metadata.gallery : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/80 p-2 backdrop-blur hover:bg-background"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>

        {post.cover_url && post.type !== 'video' && (
          <img src={post.cover_url} alt={post.title} className="max-h-80 w-full object-cover" />
        )}

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {post.category && (
              <span className="rounded-full px-2 py-1 font-medium" style={{ backgroundColor: `${post.category.color}22`, color: post.category.color || undefined }}>
                {post.category.name}
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">{POST_TYPE_LABELS[post.type]}</span>
            <time className="text-muted-foreground">{format(new Date(post.published_at), "d MMMM yyyy 'o' HH:mm", { locale: pl })}</time>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{post.title}</h1>

          {post.short_description && (
            <p className="text-lg text-muted-foreground">{post.short_description}</p>
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

          {post.content && (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {post.content}
            </div>
          )}

          {post.type === 'embed' && post.embed_html && (
            <div className="overflow-hidden rounded-xl border border-border" dangerouslySetInnerHTML={{ __html: post.embed_html }} />
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
