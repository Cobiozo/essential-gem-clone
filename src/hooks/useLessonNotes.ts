import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LessonNote {
  id: string;
  lesson_id: string;
  user_id: string;
  video_timestamp_seconds: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteMarker {
  id: string;
  timestamp: number;
}

export const useLessonNotes = (lessonId: string | undefined, userId: string | undefined) => {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch notes for lesson
  const fetchNotes = useCallback(async () => {
    if (!lessonId || !userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('training_notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .order('video_timestamp_seconds', { ascending: true });
      
      if (fetchError) throw fetchError;
      setNotes(data || []);
    } catch (err) {
      console.error('[useLessonNotes] Error fetching notes:', err);
      setError('Nie udało się pobrać notatek');
    } finally {
      setLoading(false);
    }
  }, [lessonId, userId]);

  // Add new note
  const addNote = useCallback(async (content: string, videoTimestamp: number) => {
    if (!lessonId || !userId || !content.trim()) return null;
    
    try {
      const { data, error: insertError } = await supabase
        .from('training_notes')
        .insert({
          lesson_id: lessonId,
          user_id: userId,
          content: content.trim(),
          video_timestamp_seconds: videoTimestamp
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setNotes(prev => [...prev, data].sort((a, b) => 
        a.video_timestamp_seconds - b.video_timestamp_seconds
      ));
      
      toast({
        title: "Notatka zapisana",
        description: `Notatka przypisana do momentu ${formatTime(videoTimestamp)}`
      });
      
      return data;
    } catch (err) {
      console.error('[useLessonNotes] Error adding note:', err);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać notatki",
        variant: "destructive"
      });
      return null;
    }
  }, [lessonId, userId, toast]);

  // Update existing note
  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!content.trim()) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('training_notes')
        .update({ content: content.trim() })
        .eq('id', noteId)
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
      
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, content: content.trim(), updated_at: new Date().toISOString() }
          : note
      ));
      
      toast({
        title: "Notatka zaktualizowana"
      });
      
      return true;
    } catch (err) {
      console.error('[useLessonNotes] Error updating note:', err);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować notatki",
        variant: "destructive"
      });
      return false;
    }
  }, [userId, toast]);

  // Delete note
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('training_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;
      
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      toast({
        title: "Notatka usunięta"
      });
      
      return true;
    } catch (err) {
      console.error('[useLessonNotes] Error deleting note:', err);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć notatki",
        variant: "destructive"
      });
      return false;
    }
  }, [userId, toast]);

  // Export notes to text file
  const exportNotes = useCallback((lessonTitle: string) => {
    if (notes.length === 0) {
      toast({
        title: "Brak notatek",
        description: "Nie ma notatek do eksportu",
        variant: "destructive"
      });
      return;
    }
    
    const content = notes.map(note => 
      `[${formatTime(note.video_timestamp_seconds)}] ${note.content}`
    ).join('\n\n');
    
    const header = `Notatki z lekcji: ${lessonTitle}\nData eksportu: ${new Date().toLocaleDateString('pl-PL')}\n${'='.repeat(50)}\n\n`;
    
    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notatki-${lessonTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Notatki wyeksportowane",
      description: "Plik został pobrany"
    });
  }, [notes, toast]);

  // Get note markers for timeline
  const noteMarkers: NoteMarker[] = notes.map(note => ({
    id: note.id,
    timestamp: note.video_timestamp_seconds
  }));

  // Find note by ID
  const getNoteById = useCallback((noteId: string) => {
    return notes.find(note => note.id === noteId);
  }, [notes]);

  // Fetch notes when lesson changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    noteMarkers,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote,
    exportNotes,
    getNoteById,
    refetchNotes: fetchNotes
  };
};

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
