import React, { useEffect, useState, useRef } from 'react';
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

  // Cache last valid user to prevent flicker on token refresh
  const userRef = useRef(user);
  if (user) userRef.current = user;

  const [status, setStatus] = useState<'loading' | 'lobby' | 'joined' | 'error' | 'unauthorized'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostUserId, setHostUserId] = useState('');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [initialSettings, setInitialSettings] = useState<import('@/components/meeting/MeetingSettingsDialog').MeetingSettings | undefined>();
  const statusRef = useRef(status);
  statusRef.current = status;

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Uczestnik'
    : 'Uczestnik';

  // Verify access - only on initial load or user change
  useEffect(() => {
    if (statusRef.current !== 'loading') return;

    if (!roomId) {
      setStatus('error');
      setErrorMessage('Brak identyfikatora pokoju');
      return;
    }

    if (!userRef.current) {
      // Only show unauthorized if we never had a user (not just a token refresh flicker)
      if (!user) {
        setStatus('unauthorized');
      }
      return;
    }

    const verifyAccess = async () => {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('id, title, use_internal_meeting, created_by, end_time, host_user_id')
          .eq('meeting_room_id', roomId)
          .eq('use_internal_meeting', true)
          .maybeSingle();

        if (error || !event) {
          setStatus('error');
          setErrorMessage('Pokój spotkania nie istnieje lub nie jest aktywny');
          return;
        }

        setMeetingTitle(event.title || 'Spotkanie');
        setEndTime(event.end_time || null);

        // Determine host: host_user_id if exists, otherwise created_by
        const eventHostId = event.host_user_id || event.created_by;
        setHostUserId(eventHostId);
        const userIsHost = eventHostId === userRef.current!.id;
        setIsHost(userIsHost);

        const isCreator = event.created_by === userRef.current!.id;
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userRef.current!.id)
          .eq('role', 'admin');
        const isAdmin = roles && roles.length > 0;

        if (isCreator || isAdmin) {
          setStatus('lobby');
          return;
        }

        const { data: reg } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', userRef.current!.id)
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
  }, [roomId, user?.id]);

  const handleJoin = (audio: boolean, video: boolean, settings?: import('@/components/meeting/MeetingSettingsDialog').MeetingSettings) => {
    setAudioEnabled(audio);
    setVideoEnabled(video);
    if (settings) setInitialSettings(settings);
    setIsConnecting(true);
    setTimeout(() => {
      setStatus('joined');
      setIsConnecting(false);
    }, 500);
  };

  const handleLeave = () => {
    navigate('/dashboard');
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
        isHost={isHost}
        roomId={roomId!}
      />
    );
  }

  // Joined
  return (
    <VideoRoom
      roomId={roomId!}
      displayName={displayName}
      meetingTitle={meetingTitle}
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      onLeave={handleLeave}
      isHost={isHost}
      hostUserId={hostUserId}
      endTime={endTime}
      initialSettings={initialSettings}
    />
  );
};

export default MeetingRoomPage;
