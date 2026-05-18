import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { NewsHubPost } from '@/types/newsHub';

interface Props {
  post: NewsHubPost;
  onChanged?: () => void;
}

export const AdminCardOverlay: React.FC<Props> = ({ post, onChanged }) => {
  const navigate = useNavigate();

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const togglePinned = async (e: React.MouseEvent) => {
    stop(e);
    await (supabase.from('news_hub_posts' as any) as any).update({ is_pinned: !post.is_pinned }).eq('id', post.id);
    toast.success(post.is_pinned ? 'Odpięto' : 'Przypięto');
    onChanged?.();
  };
  const togglePublished = async (e: React.MouseEvent) => {
    stop(e);
    await (supabase.from('news_hub_posts' as any) as any).update({ is_published: !post.is_published }).eq('id', post.id);
    toast.success(post.is_published ? 'Ukryto' : 'Opublikowano');
    onChanged?.();
  };
  const edit = (e: React.MouseEvent) => {
    stop(e);
    navigate(`/aktualnosci/${post.slug || post.id}?edit=1`);
  };
  const remove = async (e: React.MouseEvent) => {
    stop(e);
    if (!confirm(`Usunąć "${post.title}"?`)) return;
    await (supabase.from('news_hub_posts' as any) as any).delete().eq('id', post.id);
    toast.success('Usunięto');
    onChanged?.();
  };

  const btn = 'rounded-full bg-background/90 backdrop-blur p-1.5 shadow hover:bg-background border border-border/60 transition';

  return (
    <div
      className="absolute top-3 left-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={stop}
    >
      <button onClick={togglePinned} className={btn} title={post.is_pinned ? 'Odepnij' : 'Przypnij'}>
        <Pin className={`h-3.5 w-3.5 ${post.is_pinned ? 'text-primary' : ''}`} />
      </button>
      <button onClick={togglePublished} className={btn} title={post.is_published ? 'Ukryj' : 'Opublikuj'}>
        {post.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <button onClick={edit} className={btn} title="Edytuj">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={remove} className={`${btn} text-destructive`} title="Usuń">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
