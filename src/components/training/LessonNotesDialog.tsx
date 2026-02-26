import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Download, 
  Plus, 
  Clock, 
  Pencil, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import { LessonNote } from '@/hooks/useLessonNotes';

interface LessonNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonTitle: string;
  currentVideoTime: number;
  isLessonCompleted: boolean;
  notes: LessonNote[];
  onAddNote: (content: string, timestamp: number) => Promise<LessonNote | null>;
  onUpdateNote: (noteId: string, content: string) => Promise<boolean>;
  onDeleteNote: (noteId: string) => Promise<boolean>;
  onExportNotes: (lessonTitle: string) => void;
  onSeekToTime?: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const LessonNotesDialog: React.FC<LessonNotesDialogProps> = ({
  open,
  onOpenChange,
  lessonTitle,
  currentVideoTime,
  isLessonCompleted,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onExportNotes,
  onSeekToTime
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [attachTimestamp, setAttachTimestamp] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    
    setIsAdding(true);
    const timestamp = attachTimestamp ? Math.floor(currentVideoTime) : 0;
    const result = await onAddNote(newNoteContent, timestamp);
    
    if (result) {
      setNewNoteContent('');
    }
    setIsAdding(false);
  };

  const handleStartEdit = (note: LessonNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editContent.trim()) return;
    
    const success = await onUpdateNote(editingNoteId, editContent);
    if (success) {
      setEditingNoteId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSeekToTime = (seconds: number) => {
    if (isLessonCompleted && onSeekToTime) {
      onSeekToTime(seconds);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Notatki
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportNotes(lessonTitle)}
              disabled={notes.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Eksportuj
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* New note form */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Textarea
              placeholder="Wpisz treść notatki..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attach-timestamp"
                  checked={attachTimestamp}
                  onCheckedChange={(checked) => setAttachTimestamp(checked as boolean)}
                />
                <label 
                  htmlFor="attach-timestamp" 
                  className="text-sm flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatTime(Math.floor(currentVideoTime))}
                </label>
              </div>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || isAdding}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Dodaj
              </Button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length > 0 ? (
            <ScrollArea className="max-h-[200px] sm:max-h-[300px]">
              <div className="space-y-2 pr-3">
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="p-3 bg-card border rounded-lg space-y-2"
                  >
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px] resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSeekToTime(note.video_timestamp_seconds)}
                            disabled={!isLessonCompleted || !onSeekToTime}
                            className={`flex items-center gap-1 text-xs ${
                              isLessonCompleted && onSeekToTime
                                ? 'text-primary hover:underline cursor-pointer'
                                : 'text-muted-foreground cursor-default'
                            }`}
                            title={isLessonCompleted ? 'Kliknij, aby przeskoczyć do tego momentu' : 'Ukończ lekcję, aby móc przeskakiwać do notatek'}
                          >
                            <Clock className="h-3 w-3" />
                            {formatTime(note.video_timestamp_seconds)}
                            {isLessonCompleted && onSeekToTime && (
                              <span className="text-[10px]">(kliknij)</span>
                            )}
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleStartEdit(note)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => onDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak notatek</p>
              <p className="text-xs">Dodaj pierwszą notatkę powyżej</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
