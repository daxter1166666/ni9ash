import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveKitVoiceSession, VoiceConnectionStatus } from '../services/livekitAudio';

interface UseLiveKitVoiceParams {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isDebater: boolean;
  isMyTurn: boolean;
  freeTalk?: boolean;
  isVoiceMode: boolean;
}

export function useLiveKitVoice({
  roomId,
  userId,
  userName,
  userAvatar,
  isDebater,
  isMyTurn,
  freeTalk = false,
  isVoiceMode,
}: UseLiveKitVoiceParams) {
  const [connectionStatus, setConnectionStatus] = useState<VoiceConnectionStatus>('disconnected');
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAutoplayUnlock, setNeedsAutoplayUnlock] = useState(false);

  const sessionRef = useRef<LiveKitVoiceSession | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);

  // Initialize and connect LiveKit session when in voice mode
  useEffect(() => {
    if (!isVoiceMode || !roomId || !userId) {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
        sessionRef.current = null;
      }
      setConnectionStatus('disconnected');
      return;
    }

    const session = new LiveKitVoiceSession({
      roomId,
      userId,
      userName,
      userAvatar,
      isDebater,
      isMyTurn,
      freeTalk,
      onActiveSpeakersChange: (ids) => {
        setActiveSpeakerIds(ids);
      },
      onConnectionStatusChange: (status) => {
        setConnectionStatus(status);
        if (status === 'connected') {
          setErrorMessage(null);
        }
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    sessionRef.current = session;
    session.connect();

    // Start heartbeat ping every 10 seconds to keep server updated with active speaker presence
    heartbeatIntervalRef.current = setInterval(() => {
      fetch(`/api/rooms/${roomId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    }, 10000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      session.disconnect();
      sessionRef.current = null;
    };
  }, [roomId, userId, isVoiceMode]);

  // Synchronize microphone permissions whenever turn or freeTalk changes
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.updateTurnPermissions(isMyTurn, freeTalk);
    }
  }, [isMyTurn, freeTalk]);

  // Toggle local mute
  const toggleMute = useCallback(() => {
    setIsLocallyMuted((prev) => {
      const next = !prev;
      if (sessionRef.current) {
        sessionRef.current.setMute(next);
      }
      return next;
    });
  }, []);

  // Audio autoplay resume for iOS Safari and mobile browsers
  const unlockAudioAutoplay = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume().then(() => {
        setNeedsAutoplayUnlock(false);
      }).catch(() => {});
    } else {
      setNeedsAutoplayUnlock(false);
    }
  }, []);

  return {
    connectionStatus,
    activeSpeakerIds,
    isLocallyMuted,
    errorMessage,
    needsAutoplayUnlock,
    toggleMute,
    unlockAudioAutoplay,
    clearError: () => setErrorMessage(null),
  };
}
