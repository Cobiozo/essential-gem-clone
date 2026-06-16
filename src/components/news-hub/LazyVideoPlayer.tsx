import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewsHubVideoPlayer } from './NewsHubVideoPlayer';

interface LazyVideoPlayerProps {
  url: string;
  poster?: string | null;
  className?: string;
}

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function deriveThumbnail(url: string, poster?: string | null): string | null {
  if (poster) return poster;
  const yt = youTubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  // Vimeo nie ma publicznego, prostego thumbnaila — zostawiamy null (placeholder).
  return null;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export const LazyVideoPlayer: React.FC<LazyVideoPlayerProps> = ({ url, poster, className }) => {
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const preconnectedRef = useRef(false);

  const thumb = deriveThumbnail(url, poster);
  const isYouTube = !!youTubeId(url);
  const isVimeo = !!vimeoId(url);

  // Preconnect na hosta wideo, gdy kafelek wjeżdża w viewport — skraca TTFB pierwszego segmentu po kliknięciu play.
  useEffect(() => {
    if (!wrapRef.current || preconnectedRef.current || revealed) return;
    const node = wrapRef.current;
    const targets: string[] = [];
    if (isYouTube) {
      targets.push('https://www.youtube.com', 'https://i.ytimg.com');
    } else if (isVimeo) {
      targets.push('https://player.vimeo.com', 'https://f.vimeocdn.com');
    } else {
      const o = originOf(url);
      if (o) targets.push(o);
    }
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !preconnectedRef.current) {
            preconnectedRef.current = true;
            targets.forEach((href) => {
              const l = document.createElement('link');
              l.rel = 'preconnect';
              l.href = href;
              l.crossOrigin = '';
              document.head.appendChild(l);
            });
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [url, isYouTube, isVimeo, revealed]);

  if (revealed) {
    return <NewsHubVideoPlayer url={url} poster={poster} className={className} autoPlay />;
  }

  return (
    <div ref={wrapRef} className={cn('aspect-video w-full overflow-hidden rounded-xl bg-black relative', className)}>
      {thumb ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
      )}
      <button
        type="button"
        onClick={() => setRevealed(true)}
        aria-label="Odtwórz wideo"
        className="absolute inset-0 flex items-center justify-center group focus:outline-none"
      >
        <span className="rounded-full bg-black/60 p-5 backdrop-blur-sm transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-primary">
          <Play className="h-8 w-8 text-white fill-white" />
        </span>
      </button>
    </div>
  );
};
