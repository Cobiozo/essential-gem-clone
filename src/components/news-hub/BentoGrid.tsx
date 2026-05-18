import React from 'react';
import { cn } from '@/lib/utils';
import type { NewsHubPost } from '@/types/newsHub';
import { PostCard } from './PostCard';
import type { NewsHubGridLayout } from '@/hooks/useNewsHubSettings';

interface Props {
  posts: NewsHubPost[];
  onChanged?: () => void;
  layout?: NewsHubGridLayout;
}

const sizeClasses = (size: string, pinned: boolean) => {
  const s = pinned ? 'l' : size;
  switch (s) {
    case 'l': return 'md:col-span-2 md:row-span-2';
    case 'm': return 'md:col-span-2 md:row-span-1';
    case 's':
    default: return 'md:col-span-1 md:row-span-1';
  }
};

export const BentoGrid: React.FC<Props> = ({ posts, onChanged, layout = 'bento' }) => {
  if (posts.length === 0) return null;

  if (layout === 'bento') {
    return (
      <div
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[260px]"
        style={{ gridAutoFlow: 'dense' }}
      >
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onAdminChanged={onChanged}
            className={cn(sizeClasses(p.bento_size, p.is_pinned))}
          />
        ))}
      </div>
    );
  }

  if (layout === 'centered') {
    return (
      <div className="flex flex-col items-center gap-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAdminChanged={onChanged} className="w-full max-w-3xl" />
        ))}
      </div>
    );
  }

  const colsClass =
    layout === 'cols-2' ? 'grid-cols-1 sm:grid-cols-2'
    : layout === 'cols-3' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={cn('grid gap-4', colsClass)}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onAdminChanged={onChanged} />
      ))}
    </div>
  );
};
