import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import * as LucideIcons from 'lucide-react';
import { Pin, ExternalLink, Download, Play } from 'lucide-react';
import type { NewsHubPost } from '@/types/newsHub';
import { POST_TYPE_ICONS, POST_TYPE_LABELS } from '@/types/newsHub';
import { useAuth } from '@/contexts/AuthContext';
import { AdminCardOverlay } from './AdminCardOverlay';

interface Props {
  post: NewsHubPost;
  className?: string;
  onAdminChanged?: () => void;
  /** When true, render admin hover quick-actions overlay. Default false. */
  adminActions?: boolean;
}

export const PostCard: React.FC<Props> = ({ post, className, onAdminChanged, adminActions = false }) => {
  const { isAdmin } = useAuth();
  const TypeIcon = (LucideIcons as any)[POST_TYPE_ICONS[post.type]] || LucideIcons.FileText;
  const CategoryIcon = post.category?.icon ? (LucideIcons as any)[post.category.icon] : null;

  const hasVisual = post.cover_url || post.media_url;
  const visualUrl = post.cover_url || (post.type === 'video' ? null : post.media_url);

  const href = `/aktualnosci/${post.slug || post.id}`;

  return (
    <Link
      to={href}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card',
        'transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1',
        'flex flex-col h-full',
        !post.is_published && 'opacity-60',
        className,
      )}
    >
      {isAdmin && adminActions && <AdminCardOverlay post={post} onChanged={onAdminChanged} />}

      {post.is_pinned && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur">
          <Pin className="h-3 w-3" /> Przypięte
        </div>
      )}

      {hasVisual && visualUrl && (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img
            src={visualUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {post.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="rounded-full bg-white/90 p-4 shadow-xl transition-transform group-hover:scale-110">
                <Play className="h-6 w-6 fill-black text-black" />
              </div>
            </div>
          )}
        </div>
      )}

      {!hasVisual && (
        <div
          className="flex aspect-video items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${post.category?.color || 'hsl(var(--primary))'}33, ${post.category?.color || 'hsl(var(--primary))'}11)` }}
        >
          <TypeIcon className="h-16 w-16 opacity-40" style={{ color: post.category?.color || undefined }} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs">
          {post.category && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              style={{ backgroundColor: `${post.category.color}22`, color: post.category.color || undefined }}
            >
              {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
              {post.category.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
            {POST_TYPE_LABELS[post.type]}
          </span>
        </div>

        <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        {post.short_description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.short_description}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <time>{format(new Date(post.published_at), 'd MMM yyyy', { locale: pl })}</time>
          {post.type === 'file' && <Download className="h-4 w-4" />}
          {post.type === 'link' && <ExternalLink className="h-4 w-4" />}
        </div>
      </div>
    </Link>
  );
};
