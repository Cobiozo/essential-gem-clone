import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MeetingLobby } from '@/components/meeting/MeetingLobby';
import { GuestAccessForm } from '@/components/meeting/GuestAccessForm';
import { VideoRoom } from '@/components/meeting/VideoRoom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface GuestData {
  token: string;
  guestTokenId: string;
  displayName: string;
  email: string;
}

const MeetingRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isGuestMode = searchParams.get('guest') === 'true';
  const inviterId = searchParams.get('inviter') || '';

  // Cache last valid user to prevent flicker on token refresh
  const userRef = useRef(user);
  if (user) userRef.current = user;

  // Helper to read saved session synchronously
  const getSavedSession = () => {
    if (!roomId || isGuestMode) return null;
    const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw) as { audioEnabled: boolean; videoEnabled: boolean; settings: any; joinedAt: number };
      if (Date.now() - saved.joinedAt <= 4 * 60 * 60 * 1000) return saved;
    } catch {}
    return null;
  };

  const savedSession = getSavedSession();

  const [status, setStatus] = useState<'loading' | 'lobby' | 'joined' | 'error' | 'unauthorized' | 'guest-form' | 'password-gate'>(
    () => savedSession ? 'joined' : 'loading'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(() => savedSession?.audioEnabled ?? true);
  const [videoEnabled, setVideoEnabled] = useState(() => savedSession?.videoEnabled ?? true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostUserId, setHostUserId] = useState('');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [initialSettings, setInitialSettings] = useState<import('@/components/meeting/MeetingSettingsDialog').MeetingSettings | undefined>(
    () => savedSession?.settings || undefined
  );
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [meetingPassword, setMeetingPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [lobbyStream, setLobbyStream] = useState<MediaStream | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const displayName = guestData
    ? guestData.displayName
    : profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Uczestnik'
      : 'Uczestnik';

  const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

  const tryAutoRejoin = (): boolean => {
    if (!roomId) return false;
    const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
    if (!raw) return false;
    try {
      const saved = JSON.parse(raw) as { audioEnabled: boolean; videoEnabled: boolean; settings: any; joinedAt: number };
      if (Date.now() - saved.joinedAt > SESSION_MAX_AGE_MS) {
        sessionStorage.removeItem(`meeting_session_${roomId}`);
        return false;
      }
      setAudioEnabled(saved.audioEnabled);
      setVideoEnabled(saved.videoEnabled);
      if (saved.settings) setInitialSettings(saved.settings);
      setStatus('joined');
      return true;
    } catch {
      sessionStorage.removeItem(`meeting_session_${roomId}`);
      return false;
    }
  };

  // Try to restore guest session from sessionStorage
  useEffect(() => {
    if (!roomId || !isGuestMode) return;
    const saved = sessionStorage.getItem(`guest_token_${roomId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GuestData;
        // Verify token is still valid
        supabase.functions.invoke('verify-meeting-guest-token', {
          body: { token: parsed.token, room_id: roomId },
        }).then(({ data }) => {
          if (data?.valid) {
            setGuestData(parsed);
            if (!tryAutoRejoin()) {
              setStatus('lobby');
            }
          } else {
            sessionStorage.removeItem(`guest_token_${roomId}`);
            setStatus('guest-form');
          }
        }).catch(() => {
          sessionStorage.removeItem(`guest_token_${roomId}`);
          setStatus('guest-form');
        });
      } catch {
        sessionStorage.removeItem(`guest_token_${roomId}`);
        setStatus('guest-form');
      }
    } else {
      setStatus('guest-form');
    }
  }, [roomId, isGuestMode]);

  // Verify access for authenticated users
  useEffect(() => {
    if (isGuestMode) return; // Guest mode handled separately
    if (statusRef.current !== 'loading' && statusRef.current !== 'joined') return;

    if (!roomId) {
      setStatus('error');
      setErrorMessage('Brak identyfikatora pokoju');
      return;
    }

    if (!userRef.current) {
      // Wait for auth to finish loading before declaring unauthorized
      if (!authLoading && !user) {
        setStatus('unauthorized');
      }
      return;
    }

    const verifyAccess = async () => {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('id, title, use_internal_meeting, created_by, end_time, host_user_id, meeting_password')
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
        const eventPassword = (event as any).meeting_password || null;
        setMeetingPassword(eventPassword);

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

        // Host/admin/creator bypass password
        if (isCreator || isAdmin || userIsHost) {
          if (statusRef.current !== 'joined') {
            if (!tryAutoRejoin()) {
              setStatus('lobby');
            }
          }
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
          if (statusRef.current !== 'joined') {
            if (!tryAutoRejoin()) {
              const passwordAlreadyPassed = sessionStorage.getItem(`meeting_password_passed_${roomId}`) === 'true';
              setStatus(eventPassword && !passwordAlreadyPassed ? 'password-gate' : 'lobby');
            }
          }
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
  }, [roomId, user?.id, isGuestMode, authLoading]);

  const handleGuestSuccess = (data: { token: string; guestTokenId: string; displayName: string; eventTitle: string }) => {
    setGuestData({
      token: data.token,
      guestTokenId: data.guestTokenId,
      displayName: data.displayName,
      email: '',
    });
    setMeetingTitle(data.eventTitle);
    setStatus('lobby');
  };

  const handleJoin = (audio: boolean, video: boolean, settings?: import('@/components/meeting/MeetingSettingsDialog').MeetingSettings, stream?: MediaStream) => {
    setAudioEnabled(audio);
    setVideoEnabled(video);
    if (settings) setInitialSettings(settings);
    if (stream) setLobbyStream(stream);
    // Save session for auto-rejoin after refresh
    if (roomId) {
      sessionStorage.setItem(`meeting_session_${roomId}`, JSON.stringify({
        audioEnabled: audio,
        videoEnabled: video,
        settings: settings || null,
        joinedAt: Date.now(),
      }));
    }
    setIsConnecting(true);
    setTimeout(() => {
      setStatus('joined');
      setIsConnecting(false);
    }, 500);
  };

  const handleLeave = () => {
    if (roomId) {
      sessionStorage.removeItem(`meeting_session_${roomId}`);
      sessionStorage.removeItem(`meeting_password_passed_${roomId}`);
    }
    if (guestData && roomId) {
      sessionStorage.removeItem(`guest_token_${roomId}`);
    }
    navigate(guestData ? '/' : '/dashboard');
  };

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'guest-form') {
    return (
      <GuestAccessForm
        roomId={roomId!}
        inviterId={inviterId}
        onSuccess={handleGuestSuccess}
      />
    );
  }

  if (status === 'password-gate') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-xl font-bold">Spotkanie chronione hasłem</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Podaj hasło, aby dołączyć do spotkania
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === meetingPassword) {
                setPasswordError(false);
                if (roomId) sessionStorage.setItem(`meeting_password_passed_${roomId}`, 'true');
                setStatus('lobby');
              } else {
                setPasswordError(true);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder="Hasło spotkania"
                autoFocus
                className={passwordError ? 'border-destructive' : ''}
              />
              {passwordError && (
                <p className="text-sm text-destructive">Nieprawidłowe hasło</p>
              )}
            </div>
            <Button type="submit" className="w-full">Dołącz</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate(-1)}>
              Wróć
            </Button>
          </form>
        </div>
      </div>
    );
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
        guestMode={!!guestData}
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
      guestMode={!!guestData}
      guestTokenId={guestData?.guestTokenId}
      initialStream={lobbyStream}
    />
  );
};

export default MeetingRoomPage;
