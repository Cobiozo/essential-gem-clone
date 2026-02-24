import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Play,
  Clock,
  AlignLeft,
  AlertCircle,
  Link,
} from 'lucide-react';
import type { TrainingLesson } from '@/types/training';

interface SortableLessonCardProps {
  lesson: TrainingLesson;
  index: number;
  lessonsCount: number;
  onEdit: (lesson: TrainingLesson) => void;
  onDelete: (lessonId: string) => void;
  onMoveUp: (lessonId: string) => void;
  onMoveDown: (lessonId: string) => void;
}

export const SortableLessonCard: React.FC<SortableLessonCardProps> = ({
  lesson,
  index,
  lessonsCount,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Drag handle */}
          <div
            className="flex items-center cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Thumbnail */}
          <div className="w-20 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {lesson.media_url ? (
              lesson.media_type === 'image' ? (
                <img
                  src={lesson.media_url}
                  alt={lesson.media_alt_text || lesson.title}
                  className="w-full h-full object-cover"
                />
              ) : lesson.media_type === 'video' ? (
                <div className="relative w-full h-full bg-muted flex items-center justify-center">
                  <Video className="h-6 w-6 text-muted-foreground" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center">
                      <Play className="h-3 w-3 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : lesson.media_type === 'audio' ? (
                <Music className="h-6 w-6 text-muted-foreground" />
              ) : (
                <FileText className="h-6 w-6 text-muted-foreground" />
              )
            ) : (
              <BookOpen className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm truncate">
                <span className="text-muted-foreground mr-1">#{lesson.position}</span>
                {lesson.title}
              </h4>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant={lesson.is_active ? "default" : "secondary"} className="text-xs">
                  {lesson.is_active ? "Aktywna" : "Nieaktywna"}
                </Badge>
                {lesson.min_time_seconds > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.ceil(lesson.min_time_seconds / 60)} min
                  </Badge>
                )}
              </div>
            </div>

            {/* Content badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {lesson.media_type && (
                <Badge variant="outline" className="text-xs gap-1">
                  {lesson.media_type === 'video' && <Video className="h-3 w-3" />}
                  {lesson.media_type === 'audio' && <Music className="h-3 w-3" />}
                  {lesson.media_type === 'image' && <ImageIcon className="h-3 w-3" />}
                  {lesson.media_type === 'document' && <FileText className="h-3 w-3" />}
                  {lesson.media_type === 'video' && 'Wideo'}
                  {lesson.media_type === 'audio' && 'Audio'}
                  {lesson.media_type === 'image' && 'Obraz'}
                  {lesson.media_type === 'document' && 'Dokument'}
                </Badge>
              )}
              {lesson.content && lesson.content.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <AlignLeft className="h-3 w-3" />
                  Treść
                </Badge>
              )}
              {lesson.is_required && (
                <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  Wymagana
                </Badge>
              )}
              {lesson.action_buttons && lesson.action_buttons.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Link className="h-3 w-3" />
                  {lesson.action_buttons.length} {lesson.action_buttons.length === 1 ? 'przycisk' : 'przyciski'}
                </Badge>
              )}
            </div>

            {/* Action buttons list */}
            {lesson.action_buttons && lesson.action_buttons.length > 0 && (
              <div className="mb-2 space-y-0.5">
                {lesson.action_buttons.slice(0, 3).map((button, btnIndex) => (
                  <div key={btnIndex} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">• {button.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {button.type === 'file' ? 'plik' :
                       button.type === 'external' ? 'zewn.' :
                       button.type === 'internal' ? 'wewn.' : 'zasób'}
                    </Badge>
                  </div>
                ))}
                {lesson.action_buttons.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{lesson.action_buttons.length - 3} więcej...
                  </div>
                )}
              </div>
            )}

            {/* Admin actions */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={index === 0}
                onClick={() => onMoveUp(lesson.id)}
                title="Przenieś w górę"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={index === lessonsCount - 1}
                onClick={() => onMoveDown(lesson.id)}
                title="Przenieś w dół"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onEdit(lesson)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edytuj
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => onDelete(lesson.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
