import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string, fileName: string) => void;
  onCancel?: () => void;
}

export const VoiceRecorder = ({ onRecordingComplete, onCancel }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { uploadFile } = useLocalStorage();
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się uruchomić nagrywania. Sprawdź uprawnienia mikrofonu.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel?.();
  }, [isRecording, audioUrl, onCancel]);

  const sendRecording = useCallback(async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'm4a';
      const fileName = `voice-${Date.now()}.${extension}`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type });

      const result = await uploadFile(file, { folder: 'chat-voice' });
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      onRecordingComplete(result.url, fileName);
      
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);

      toast({
        title: 'Sukces',
        description: 'Wiadomość głosowa została wysłana'
      });
    } catch (error) {
      console.error('Error uploading voice message:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać wiadomości głosowej',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, audioUrl, uploadFile, onRecordingComplete, toast]);

  // Recording state - show recording indicator
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-500">{formatTime(recordingTime)}</span>
        <span className="text-xs text-muted-foreground">Nagrywanie...</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white rounded-full"
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Preview state - show recorded audio
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
        <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
        <span className="text-xs text-muted-foreground">{formatTime(recordingTime)}</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={sendRecording}
          disabled={isUploading}
          className="h-10 w-10 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  // Idle state - show mic button
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};
