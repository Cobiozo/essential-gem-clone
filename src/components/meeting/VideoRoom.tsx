import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { useToast } from '@/hooks/use-toast';

interface RemoteParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
}

interface VideoRoomProps {
  roomId: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onLeave: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({
  roomId,
  displayName,
  audioEnabled: initialAudio,
  videoEnabled: initialVideo,
  onLeave,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch TURN credentials
  const getTurnCredentials = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-turn-credentials');
      if (error) throw error;
      return data?.iceServers || [];
    } catch (err) {
      console.error('[VideoRoom] Failed to get TURN credentials:', err);
      // Fallback to STUN only
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }, []);

  // Initialize peer and media
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const init = async () => {
      try {
        // 1. Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        // Apply initial settings
        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));

        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Get TURN credentials
        const iceServers = await getTurnCredentials();

        // 3. Create PeerJS peer
        const peer = new Peer({
          config: { iceServers },
        });

        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          console.log('[VideoRoom] Peer opened:', peerId);
          setIsConnected(true);

          // Register in DB
          await supabase.from('meeting_room_participants').insert({
            room_id: roomId,
            user_id: user.id,
            peer_id: peerId,
            display_name: displayName,
            is_active: true,
          });

          // Broadcast join via Realtime
          const channel = supabase.channel(`meeting:${roomId}`);
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({
                type: 'broadcast',
                event: 'peer-joined',
                payload: { peerId, displayName, userId: user.id },
              });
            }
          });

          // Listen for other peers joining
          channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
            if (payload.peerId !== peerId) {
              console.log('[VideoRoom] Peer joined:', payload.peerId);
              callPeer(payload.peerId, payload.displayName, stream);
            }
          });

          channel.on('broadcast', { event: 'peer-left' }, ({ payload }) => {
            console.log('[VideoRoom] Peer left:', payload.peerId);
            removePeer(payload.peerId);
          });

          // Also fetch existing participants from DB and call them
          const { data: existing } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name')
            .eq('room_id', roomId)
            .eq('is_active', true)
            .neq('user_id', user.id);

          if (existing) {
            for (const p of existing) {
              if (p.peer_id) {
                callPeer(p.peer_id, p.display_name || 'Uczestnik', stream);
              }
            }
          }
        });

        // Handle incoming calls
        peer.on('call', (call) => {
          console.log('[VideoRoom] Incoming call from:', call.peer);
          call.answer(stream);
          handleCall(call, 'Uczestnik');
        });

        peer.on('error', (err) => {
          console.error('[VideoRoom] Peer error:', err);
          toast({
            title: 'Błąd połączenia',
            description: 'Wystąpił problem z połączeniem video. Spróbuj odświeżyć stronę.',
            variant: 'destructive',
          });
        });
      } catch (err) {
        console.error('[VideoRoom] Init error:', err);
        toast({
          title: 'Brak dostępu do kamery/mikrofonu',
          description: 'Upewnij się, że przeglądarka ma uprawnienia do kamery i mikrofonu.',
          variant: 'destructive',
        });
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [user, roomId]);

  const callPeer = (remotePeerId: string, name: string, stream: MediaStream) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;

    const call = peerRef.current.call(remotePeerId, stream);
    if (call) {
      handleCall(call, name);
    }
  };

  const handleCall = (call: MediaConnection, name: string) => {
    connectionsRef.current.set(call.peer, call);

    call.on('stream', (remoteStream) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.peerId === call.peer);
        if (exists) {
          return prev.map((p) =>
            p.peerId === call.peer ? { ...p, stream: remoteStream } : p
          );
        }
        return [...prev, { peerId: call.peer, displayName: name, stream: remoteStream }];
      });
    });

    call.on('close', () => {
      removePeer(call.peer);
    });
  };

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  const cleanup = async () => {
    // Broadcast leave
    const peerId = peerRef.current?.id;
    if (peerId) {
      const channel = supabase.channel(`meeting:${roomId}`);
      try {
        await channel.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: { peerId },
        });
      } catch { }
      supabase.removeChannel(channel);
    }

    // Update DB
    if (user) {
      await supabase
        .from('meeting_room_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    }

    // Close connections
    connectionsRef.current.forEach((conn) => conn.close());
    connectionsRef.current.clear();

    // Stop local stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Destroy peer
    peerRef.current?.destroy();
    peerRef.current = null;
  };

  // Controls handlers
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing - switch back to camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getAudioTracks().forEach(t => (t.enabled = !isMuted));

        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsScreenSharing(false);

        // Replace track in all active connections
        const videoTrack = stream.getVideoTracks()[0];
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find(
            (s: RTCRtpSender) => s.track?.kind === 'video'
          );
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      } catch (err) {
        console.error('[VideoRoom] Failed to restore camera:', err);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        // Keep audio from original stream
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
          screenStream.addTrack(audioTrack);
        }

        // Replace local stream
        localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);

        // Replace track in all connections
        const videoTrack = screenStream.getVideoTracks()[0];
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find(
            (s: RTCRtpSender) => s.track?.kind === 'video'
          );
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Handle user stopping screen share via browser UI
        videoTrack.onended = () => {
          handleToggleScreenShare();
        };
      } catch (err) {
        console.log('[VideoRoom] Screen sharing cancelled or failed:', err);
      }
    }
  };

  const handleLeave = async () => {
    await cleanup();
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <h2 className="text-sm font-medium truncate">Pokój spotkania</h2>
        {!isConnected && (
          <span className="text-xs text-muted-foreground animate-pulse">Łączenie...</span>
        )}
      </div>

      {/* Video Grid */}
      <VideoGrid
        participants={participants}
        localStream={localStream}
        localDisplayName={displayName}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
      />

      {/* Controls */}
      <MeetingControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        participantCount={participants.length + 1}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeave}
      />
    </div>
  );
};
