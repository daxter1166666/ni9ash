import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  Participant as LiveKitParticipant,
  AudioPresets,
  ConnectionState,
} from 'livekit-client';

export interface VoiceTokenResponse {
  success: boolean;
  token?: string;
  wsUrl?: string;
  isSimulated?: boolean;
  mode?: 'text' | 'voice';
  canPublish?: boolean;
  isCurrentSpeaker?: boolean;
  isFreeTalk?: boolean;
  isHost?: boolean;
  error?: string;
}

export type VoiceConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface UseVoiceOptions {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isDebater: boolean;
  isMyTurn: boolean;
  freeTalk?: boolean;
  onActiveSpeakersChange?: (activeSpeakerIds: string[]) => void;
  onConnectionStatusChange?: (status: VoiceConnectionStatus) => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Pre-Join Mic Check Tool using Web Audio API
 * Allows debaters to test their microphone and see a live volume meter before stepping onto the stage.
 */
export class MicTester {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;

  async start(onLevelChange: (level: number) => void): Promise<{ success: boolean; errorType?: string }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { success: false, errorType: 'unsupported' };
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize 0 to 100 with boosted sensitivity for speech
        const normalized = Math.min(100, Math.round((average / 128) * 100 * 1.6));
        onLevelChange(normalized);
        this.animationFrameId = requestAnimationFrame(updateMeter);
      };

      updateMeter();
      return { success: true };
    } catch (err: any) {
      console.warn('Mic check error:', err);
      let errorType = 'unknown';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorType = 'denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorType = 'not_found';
      } else if (err.name === 'NotReadableError') {
        errorType = 'in_use';
      }
      return { success: false, errorType };
    }
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

/**
 * High-performance LiveKit Voice Room Session Manager
 * Audio-only, Opus 32-48kbps, automated speaker permission sync
 */
export class LiveKitVoiceSession {
  private room: Room | null = null;
  private attachedElements: HTMLAudioElement[] = [];
  private isSimulated = false;
  private simulationInterval: any = null;
  private micTester: MicTester | null = null;

  private activeSpeakerIds: Set<string> = new Set();
  private isMutedByUser = false;

  constructor(
    private options: UseVoiceOptions
  ) {}

  async connect(): Promise<boolean> {
    try {
      this.options.onConnectionStatusChange?.('connecting');

      // 1. Request token from backend
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.options.roomId,
          userId: this.options.userId,
          userName: this.options.userName,
          userAvatar: this.options.userAvatar,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: VoiceTokenResponse | null = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const errorMsg = data?.error || (res.status === 403 ? 'تم بلوغ السعة القصوى أو غير مصرح' : 'تعذر الاتصال بخادم الصوت');
        throw new Error(errorMsg);
      }

      if (!data || !data.success || !data.token) {
        throw new Error(data?.error || 'فشل في استلام رمز الدخول للغرفة الصوتية');
      }

      // If simulated fallback (when LiveKit credentials are not yet set in .env)
      if (data.isSimulated || data.wsUrl === 'simulated') {
        console.info('[LiveKitVoice] Running in development voice simulation mode');
        this.isSimulated = true;
        this.options.onConnectionStatusChange?.('connected');
        this.startSimulation();
        return true;
      }

      // 2. Initialize Real LiveKit Room
      this.room = new Room({
        adaptiveStream: false,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        publishDefaults: {
          audioPreset: AudioPresets.speech, // Opus ~32kbps
          simulcast: false,
        },
      });

      this.setupRoomEvents();

      // 3. Connect to SFU WebSocket
      await this.room.connect(data.wsUrl!, data.token, {
        autoSubscribe: true,
      });

      this.options.onConnectionStatusChange?.('connected');

      // 4. If current user is permitted to speak right now, publish local microphone
      if (this.options.isDebater && (this.options.isMyTurn || this.options.freeTalk) && !this.isMutedByUser) {
        await this.enableMicrophone(true);
      }

      return true;
    } catch (err: any) {
      console.error('[LiveKitVoice] Connection error:', err);
      this.options.onConnectionStatusChange?.('error');
      this.options.onError?.(err.message || 'حدث خطأ أثناء الاتصال بالغرفة الصوتية');
      return false;
    }
  }

  private setupRoomEvents() {
    if (!this.room) return;

    // Track Subscribed: Attach audio to player
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach();
        audioElement.autoplay = true;
        this.attachedElements.push(audioElement);

        // Attempt playback, handle iOS autoplay blocks
        audioElement.play().catch((playErr) => {
          console.warn('[LiveKitVoice] Autoplay was prevented:', playErr);
        });
      }
    });

    // Track Unsubscribed: Cleanup audio element
    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      track.detach().forEach((el) => {
        el.remove();
        this.attachedElements = this.attachedElements.filter((item) => item !== el);
      });
    });

    // Active Speaker Detection
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: LiveKitParticipant[]) => {
      const ids = speakers.map((s) => s.identity);
      this.activeSpeakerIds = new Set(ids);
      this.options.onActiveSpeakersChange?.(ids);
    });

    // Connection State Changes
    this.room.on(RoomEvent.Reconnecting, () => {
      this.options.onConnectionStatusChange?.('reconnecting');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.options.onConnectionStatusChange?.('connected');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.options.onConnectionStatusChange?.('disconnected');
    });
  }

  // Update publishing state when turns rotate
  async updateTurnPermissions(isMyTurn: boolean, freeTalk: boolean) {
    if (this.isSimulated) {
      return;
    }

    if (!this.room) return;

    const canSpeak = this.options.isDebater && (isMyTurn || freeTalk) && !this.isMutedByUser;

    try {
      if (canSpeak) {
        await this.enableMicrophone(true);
      } else {
        await this.enableMicrophone(false);
      }
    } catch (err) {
      console.warn('[LiveKitVoice] Error updating local microphone on turn transition:', err);
    }
  }

  // Toggle local mute
  async setMute(muted: boolean) {
    this.isMutedByUser = muted;
    if (this.room) {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(!muted);
      } catch (e) {
        console.warn('[LiveKitVoice] Failed to set microphone state:', e);
      }
    }
  }

  private async enableMicrophone(enabled: boolean) {
    if (!this.room) return;
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    } catch (err: any) {
      console.warn('[LiveKitVoice] Microphone enable error:', err);
      if (err.name === 'NotAllowedError') {
        this.options.onError?.('تم رفض صلاحية الميكروفون من المتصفح');
      }
    }
  }

  // Disconnect & Cleanup
  disconnect() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.micTester) {
      this.micTester.stop();
      this.micTester = null;
    }

    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }

    this.attachedElements.forEach((el) => {
      el.pause();
      el.remove();
    });
    this.attachedElements = [];
    this.options.onConnectionStatusChange?.('disconnected');
  }

  // Simulated active speaker animation for local dev/testing
  private startSimulation() {
    this.simulationInterval = setInterval(() => {
      if (this.options.isMyTurn) {
        this.options.onActiveSpeakersChange?.([this.options.userId]);
      } else {
        this.options.onActiveSpeakersChange?.([]);
      }
    }, 1200);
  }
}
