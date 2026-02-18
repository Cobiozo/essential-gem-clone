import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MeetingLobby } from '@/components/meeting/MeetingLobby';
import { VideoRoom } from '@/components/meeting/VideoRoom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const MeetingRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'lobby' | 'joined' | 'error' | 'unauthorized'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Uczestnik'
    : 'Uczestnik';

  // Verify access
  useEffect(() => {
    if (!roomId) {
      setStatus('error');
      setErrorMessage('Brak identyfikatora pokoju');
      return;
    }

    if (!user) {
      setStatus('unauthorized');
      return;
    }

    const verifyAccess = async () => {
      try {
        // Check if event with this room exists
        const { data: event, error } = await supabase
          .from('events')
          .select('id, title, use_internal_meeting, created_by')
          .eq('meeting_room_id', roomId)
          .eq('use_internal_meeting', true)
          .maybeSingle();

        if (error || !event) {
          setStatus('error');
          setErrorMessage('Pokój spotkania nie istnieje lub nie jest aktywny');
          return;
        }

        // Allow access: admin, event creator, or registered user
        const isCreator = event.created_by === user.id;
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        const isAdmin = roles && roles.length > 0;

        if (isCreator || isAdmin) {
          setStatus('lobby');
          return;
        }

        // Check registration
        const { data: reg } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .eq('status', 'registered')
          .maybeSingle();

        if (reg) {
          setStatus('lobby');
        } else {
          setStatus('unauthorized');
          setErrorMessage('Nie masz dostępu do tego spotkania. Musisz być zapisany/a na wydarzenie.');
        }
      } catch (err) {
        console.error('[MeetingRoom] Verify error:', err);
        setStatus('error');
        setErrorMessage('Wystąpił błąd podczas weryfikacji dostępu');
      }
    };

    verifyAccess();
  }, [roomId, user]);

  const handleJoin = (audio: boolean, video: boolean) => {
    setAudioEnabled(audio);
    setVideoEnabled(video);
    setIsConnecting(true);
    // Small delay to show connecting state
    setTimeout(() => {
      setStatus('joined');
      setIsConnecting(false);
    }, 500);
  };

  const handleLeave = () => {
    navigate(-1);
  };

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Brak dostępu</h1>
          <p className="text-muted-foreground">
            {errorMessage || 'Musisz być zalogowany/a, aby dołączyć do spotkania.'}
          </p>
          <Button onClick={() => navigate('/auth')}>Zaloguj się</Button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Błąd</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Wróć</Button>
        </div>
      </div>
    );
  }

  if (status === 'lobby') {
    return (
      <MeetingLobby
        displayName={displayName}
        onJoin={handleJoin}
        isConnecting={isConnecting}
      />
    );
  }

  // Joined
  return (
    <VideoRoom
      roomId={roomId!}
      displayName={displayName}
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      onLeave={handleLeave}
    />
  );
};

export default MeetingRoomPage;
