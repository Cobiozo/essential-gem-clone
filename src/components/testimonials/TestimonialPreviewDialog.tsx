import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@/components/ui/carousel';
import { Star, X, Send, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HealthyKnowledge, TestimonialComment } from '@/types/healthyKnowledge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TestimonialPreviewDialogProps {
  material: HealthyKnowledge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestimonialPreviewDialog: React.FC<TestimonialPreviewDialogProps> = ({
  material,
  open,
  onOpenChange,
}) => {
  const { tf } = useLanguage();
  const { user } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Comments state
  const [comments, setComments] = useState<TestimonialComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [existingComment, setExistingComment] = useState<TestimonialComment | null>(null);

  const allImages = material
    ? [material.media_url, ...(material.gallery_urls || [])].filter(Boolean) as string[]
    : [];

  const avgRating = comments.length > 0
    ? comments.reduce((sum, c) => sum + c.rating, 0) / comments.length
    : 0;

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const fetchComments = useCallback(async () => {
    if (!material?.id) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('testimonial_comments')
        .select('*, profiles:user_id(first_name, last_name, avatar_url)')
        .eq('knowledge_id', material.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const typedData = (data || []) as unknown as TestimonialComment[];
      setComments(typedData);

      // Check if user already commented
      if (user) {
        const mine = typedData.find(c => c.user_id === user.id);
        if (mine) {
          setExistingComment(mine);
          setMyRating(mine.rating);
          setMyComment(mine.comment);
        } else {
          setExistingComment(null);
          setMyRating(0);
          setMyComment('');
        }
      }
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoadingComments(false);
    }
  }, [material?.id, user]);

  useEffect(() => {
    if (open && material?.allow_comments) {
      fetchComments();
    }
  }, [open, material?.allow_comments, fetchComments]);

  const handleSubmitComment = async () => {
    if (!material || !user || myRating === 0 || !myComment.trim()) {
      toast.error(tf('hk.fillRatingAndComment', 'Wypełnij ocenę i komentarz'));
      return;
    }
    setSubmitting(true);
    try {
      if (existingComment) {
        const { error } = await supabase
          .from('testimonial_comments')
          .update({ rating: myRating, comment: myComment.trim() })
          .eq('id', existingComment.id);
        if (error) throw error;
        toast.success(tf('hk.commentUpdated', 'Opinia zaktualizowana'));
      } else {
        const { error } = await supabase
          .from('testimonial_comments')
          .insert({
            knowledge_id: material.id,
            user_id: user.id,
            rating: myRating,
            comment: myComment.trim(),
          });
        if (error) throw error;
        toast.success(tf('hk.commentAdded', 'Opinia dodana!'));
      }
      fetchComments();
    } catch (e: any) {
      console.error('Comment error:', e);
      toast.error(e.message || tf('hk.commentError', 'Nie udało się zapisać opinii'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-full p-0 overflow-hidden border-0 bg-gradient-to-b from-background via-background to-muted/30"
        hideCloseButton
      >
        <DialogTitle className="sr-only">{material.title}</DialogTitle>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-50 rounded-full bg-black/60 backdrop-blur-sm p-1.5 text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Carousel */}
        {allImages.length > 0 && (
          <div className="relative bg-black/5">
            <Carousel opts={{ loop: true }} setApi={setApi} className="w-full">
              <CarouselContent>
                {allImages.map((url, i) => (
                  <CarouselItem key={i}>
                    <div className="flex items-center justify-center bg-muted/50">
                      <img
                        src={url}
                        alt={`${material.title} ${i + 1}`}
                        className="w-full object-contain max-h-[55vh]"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {allImages.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 bg-black/40 backdrop-blur-sm border-0 text-white hover:bg-black/60 h-10 w-10" />
                  <CarouselNext className="right-2 bg-black/40 backdrop-blur-sm border-0 text-white hover:bg-black/60 h-10 w-10" />
                </>
              )}
            </Carousel>

            {/* Dots + counter */}
            {allImages.length > 1 && (
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="flex gap-1.5">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => api?.scrollTo(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        i === current
                          ? "bg-yellow-400 w-5"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {current + 1}/{count}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-6 pt-2 space-y-4 max-h-[45vh] overflow-y-auto">
          {/* Average rating */}
          {material.allow_comments && comments.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= Math.round(avgRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({comments.length} {comments.length === 1 ? tf('hk.opinion', 'opinia') : tf('hk.opinions', 'opinii')})
              </span>
            </div>
          )}

          {/* Title & description */}
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
              {material.title}
            </h2>
            {material.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {material.description}
              </p>
            )}
          </div>

          {/* Text content */}
          {material.content_type === 'text' && material.text_content && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg"
              dangerouslySetInnerHTML={{ __html: material.text_content }}
            />
          )}

          {/* Comments section */}
          {material.allow_comments && (
            <div className="space-y-4 pt-2">
              {/* Existing comments */}
              {comments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    {tf('hk.opinionsSection', 'Opinie')}
                  </div>
                  {comments.map((c) => {
                    const firstName = c.profiles?.first_name || '';
                    const lastName = c.profiles?.last_name || '';
                    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
                    const displayName = `${firstName} ${lastName.charAt(0) || ''}.`.trim();
                    return (
                      <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                        <Avatar className="w-9 h-9 shrink-0">
                          <AvatarImage src={c.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{displayName}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "w-3.5 h-3.5",
                                    star <= c.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground/20"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: pl })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            "{c.comment}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add/Edit comment form */}
              {user && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-sm font-medium text-muted-foreground">
                    {existingComment
                      ? tf('hk.editYourOpinion', 'Edytuj swoją opinię')
                      : tf('hk.addYourOpinion', 'Dodaj swoją opinię')}
                  </p>

                  {/* Star rating input */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setMyRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "w-7 h-7 transition-colors",
                            star <= (hoverRating || myRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  <Textarea
                    placeholder={tf('hk.writeOpinion', 'Napisz swoją opinię...')}
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />

                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting || myRating === 0 || !myComment.trim()}
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {existingComment
                      ? tf('hk.updateOpinion', 'Zaktualizuj opinię')
                      : tf('hk.sendOpinion', 'Wyślij opinię')}
                  </Button>
                </div>
              )}

              {loadingComments && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
