import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Video, Copy, ExternalLink, Loader2, AlertCircle, CheckCircle2, Key } from 'lucide-react';

interface ZoomMeetingGeneratorProps {
  eventId?: string;
  eventTitle: string;
  startTime: string;
  duration: number;
  currentZoomLink: string;
  onGenerated: (data: { 
    join_url: string; 
    start_url: string; 
    meeting_id: string;
    password?: string;
  }) => void;
  existingMeetingId?: string | null;
  existingPassword?: string | null;
  existingStartUrl?: string | null;
}

interface ZoomStatus {
  configured: boolean;
  status: 'active' | 'error' | 'not_configured' | 'unknown';
  message?: string;
  instructions?: string[];
}

export const ZoomMeetingGenerator: React.FC<ZoomMeetingGeneratorProps> = ({
  eventId,
  eventTitle,
  startTime,
  duration,
  currentZoomLink,
  onGenerated,
  existingMeetingId,
  existingPassword,
  existingStartUrl,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [zoomStatus, setZoomStatus] = useState<ZoomStatus | null>(null);
  const [generatedData, setGeneratedData] = useState<{
    meeting_id: string;
    password: string;
    start_url: string;
    join_url: string;
  } | null>(null);

  // Check Zoom status on mount
  useEffect(() => {
    checkZoomStatus();
  }, []);

  // Initialize with existing data
  useEffect(() => {
    if (existingMeetingId) {
      setGeneratedData({
        meeting_id: existingMeetingId,
        password: existingPassword || '',
        start_url: existingStartUrl || '',
        join_url: currentZoomLink,
      });
    }
  }, [existingMeetingId, existingPassword, existingStartUrl, currentZoomLink]);

  const checkZoomStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('zoom-check-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking Zoom status:', error);
        setZoomStatus({ configured: false, status: 'error', message: error.message });
      } else {
        setZoomStatus(data);
      }
    } catch (err) {
      console.error('Failed to check Zoom status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleGenerateZoom = async () => {
    if (!startTime) {
      toast({
        title: 'Błąd',
        description: 'Najpierw ustaw datę i godzinę spotkania',
        variant: 'destructive',
      });
      return;
    }

    if (!eventTitle) {
      toast({
        title: 'Błąd',
        description: 'Najpierw wprowadź tytuł spotkania',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Błąd',
          description: 'Musisz być zalogowany',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('zoom-create-meeting', {
        body: {
          event_id: eventId,
          topic: eventTitle,
          start_time: startTime,
          duration: duration,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast({
          title: 'Błąd',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (!data.success) {
        if (data.error === 'zoom_not_configured') {
          setZoomStatus({
            configured: false,
            status: 'not_configured',
            message: data.message,
            instructions: data.instructions,
          });
          setShowInstructions(true);
          return;
        }
        
        toast({
          title: 'Błąd',
          description: data.message || 'Nie udało się wygenerować spotkania Zoom',
          variant: 'destructive',
        });
        return;
      }

      // Success!
      setGeneratedData({
        meeting_id: data.data.meeting_id,
        password: data.data.password,
        start_url: data.data.start_url,
        join_url: data.data.join_url,
      });

      onGenerated({
        join_url: data.data.join_url,
        start_url: data.data.start_url,
        meeting_id: data.data.meeting_id,
        password: data.data.password,
      });

      toast({
        title: 'Sukces',
        description: 'Spotkanie Zoom zostało wygenerowane',
      });

    } catch (err) {
      console.error('Failed to generate Zoom meeting:', err);
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas generowania spotkania',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Skopiowano',
      description: `${label} został skopiowany do schowka`,
    });
  };

  // Show generated meeting info
  if (generatedData?.meeting_id) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateZoom}
            disabled={loading}
            className="h-10 gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            Wygeneruj nowy
          </Button>
        </div>
        
        {/* Generated meeting info */}
        <div className="text-xs bg-muted p-3 rounded-md space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Zoom wygenerowany automatycznie</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">
                ID: {generatedData.meeting_id}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => copyToClipboard(generatedData.meeting_id, 'Meeting ID')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </span>
            
            {generatedData.password && (
              <span className="flex items-center gap-1.5">
                <Key className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  Hasło: {generatedData.password}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(generatedData.password, 'Hasło')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
          
          {generatedData.start_url && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => copyToClipboard(generatedData.start_url, 'Start URL')}
              >
                <ExternalLink className="h-3 w-3" />
                Kopiuj Start URL (dla hosta)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerateZoom}
        disabled={loading || checkingStatus}
        className="h-10 gap-2"
      >
        {loading || checkingStatus ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        Generuj Zoom
      </Button>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Konfiguracja Zoom API
            </DialogTitle>
            <DialogDescription>
              Aby automatycznie generować spotkania Zoom, musisz skonfigurować integrację z Zoom API.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Instrukcje konfiguracji:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                {zoomStatus?.instructions?.map((instruction, index) => (
                  <li key={index} className="leading-relaxed">
                    {instruction.replace(/^\d+\.\s*/, '')}
                  </li>
                )) || (
                  <>
                    <li>Przejdź do <a href="https://marketplace.zoom.us/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Zoom Marketplace</a></li>
                    <li>Utwórz Server-to-Server OAuth App</li>
                    <li>Nadaj uprawnienia: meeting:write:admin, meeting:read:admin, user:read:admin</li>
                    <li>Dodaj sekrety w ustawieniach projektu Supabase:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>ZOOM_ACCOUNT_ID</li>
                        <li>ZOOM_CLIENT_ID</li>
                        <li>ZOOM_CLIENT_SECRET</li>
                        <li>ZOOM_HOST_EMAIL (opcjonalnie)</li>
                      </ul>
                    </li>
                  </>
                )}
              </ol>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Po dodaniu sekretów, możesz wrócić tutaj i ponownie kliknąć "Generuj Zoom".
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInstructions(false)}>
                Rozumiem
              </Button>
              <Button asChild>
                <a 
                  href="https://marketplace.zoom.us/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Otwórz Zoom Marketplace
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
