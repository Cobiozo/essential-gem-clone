import React from 'react';
import { cn } from '@/lib/utils';
import type { NewsHubPost } from '@/types/newsHub';
import { PostCard } from './PostCard';

interface Props {
  posts: NewsHubPost[];
  onSelect: (p: NewsHubPost) => void;
}

const sizeClasses = (size: string, pinned: boolean) => {
  // Pinned overrides to L
  const s = pinned ? 'l' : size;
  switch (s) {
    case 'l': return 'md:col-span-2 md:row-span-2';
    case 'm': return 'md:col-span-2 md:row-span-1';
    case 's':
    default: return 'md:col-span-1 md:row-span-1';
  }
};

export const BentoGrid: React.FC<Props> = ({ posts, onSelect }) => {
  if (posts.length === 0) return null;
  return (
    <div
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[260px]"
      style={{ gridAutoFlow: 'dense' }}
    >
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onClick={() => onSelect(p)}
          className={cn(sizeClasses(p.bento_size, p.is_pinned))}
        />
      ))}
    </div>
  );
};
