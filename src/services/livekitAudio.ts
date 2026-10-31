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
 * Built-in Real-Time Audio Engine over WebSockets & Web Audio API
 * Provides low-latency 16kHz PCM voice broadcasting between debaters and audience
 * without requiring external LiveKit cloud subscriptions.
 */
export class BuiltinWebSocketVoiceSession {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isConnected = false;
  private isMutedByUser = false;
  private nextPlayTime = 0;
  private speakingDecayTimer: any = null;
  private activeSpeakersMap: Map<string, number> = new Map();
  private pingInterval: any = null;

  constructor(private options: UseVoiceOptions) {}

  async connect(): Promise<boolean> {
    try {
      this.options.onConnectionStatusChange?.('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/voice`;
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      // Initialize AudioContext for receiving / playing audio
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass({ sampleRate: 16000 });
      }

      this.ws.onopen = () => {
        this.isConnected = true;
        this.options.onConnectionStatusChange?.('connected');

        // Send Join Handshake
        this.ws?.send(
          JSON.stringify({
            type: 'join',
            roomId: this.options.roomId,
            userId: this.options.userId,
            userName: this.options.userName,
            role: this.options.isDebater ? 'debater' : 'audience',
          })
        );

        // Ping heartbeat every 20s
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);

        // If currently allowed to speak, start mic
        if (this.options.isDebater && (this.options.isMyTurn || this.options.freeTalk) && !this.isMutedByUser) {
          this.startMicrophoneCapture();
        }
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.handleIncomingAudio(event.data);
        } else if (typeof event.data === 'string') {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'turn_update') {
              const isMyTurn = data.currentSpeakerId === this.options.userId;
              this.updateTurnPermissions(isMyTurn, Boolean(data.freeTalk));
            }
          } catch {}
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.options.onConnectionStatusChange?.('disconnected');
      };

      this.ws.onerror = (err) => {
        console.warn('[BuiltinVoice] WebSocket error:', err);
      };

      return true;
    } catch (err: any) {
      console.error('[BuiltinVoice] Error connecting:', err);
      this.options.onConnectionStatusChange?.('error');
      this.options.onError?.(err?.message || 'تعذر الاتصال بالبث الصوتي');
      return false;
    }
  }

  // Handle incoming binary PCM audio chunk from other speaker
  private handleIncomingAudio(buffer: ArrayBuffer) {
    if (buffer.byteLength < 4) return;
    const view = new DataView(buffer);
    const packetType = view.getUint8(0);
    if (packetType !== 1) return; // 1 = Audio PCM

    const idLen = view.getUint16(1);
    if (buffer.byteLength < 3 + idLen) return;

    const idBytes = new Uint8Array(buffer, 3, idLen);
    const senderId = new TextDecoder().decode(idBytes);

    // If packet from self, ignore
    if (senderId === this.options.userId) return;

    // Remaining bytes are Int16Array PCM samples
    const pcmByteOffset = 3 + idLen;
    const sampleCount = Math.floor((buffer.byteLength - pcmByteOffset) / 2);
    if (sampleCount <= 0) return;

    const int16 = new Int16Array(buffer, pcmByteOffset, sampleCount);
    const float32 = new Float32Array(sampleCount);

    let sumSquares = 0;
    for (let i = 0; i < sampleCount; i++) {
      const s = int16[i];
      const val = s < 0 ? s / 0x8000 : s / 0x7fff;
      float32[i] = val;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / sampleCount);
    if (rms > 0.02) {
      this.activeSpeakersMap.set(senderId, Date.now());
      this.refreshActiveSpeakers();
    }

    // Playback through Web Audio API
    this.playPcmBuffer(float32);
  }

  private playPcmBuffer(samples: Float32Array) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      return;
    }

    try {
      const audioBuffer = this.audioCtx.createBuffer(1, samples.length, 16000);
      audioBuffer.getChannelData(0).set(samples);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      if (this.nextPlayTime < currentTime || this.nextPlayTime - currentTime > 0.4) {
        this.nextPlayTime = currentTime + 0.02;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (e) {
      console.warn('[BuiltinVoice] Playback error:', e);
    }
  }

  private refreshActiveSpeakers() {
    const now = Date.now();
    const active: string[] = [];
    for (const [id, time] of this.activeSpeakersMap.entries()) {
      if (now - time < 800) {
        active.push(id);
      } else {
        this.activeSpeakersMap.delete(id);
      }
    }
    this.options.onActiveSpeakersChange?.(active);

    if (this.speakingDecayTimer) clearTimeout(this.speakingDecayTimer);
    if (active.length > 0) {
      this.speakingDecayTimer = setTimeout(() => {
        this.refreshActiveSpeakers();
      }, 500);
    }
  }

  async updateTurnPermissions(isMyTurn: boolean, freeTalk: boolean) {
    this.options.isMyTurn = isMyTurn;
    this.options.freeTalk = freeTalk;

    const canSpeak = this.options.isDebater && (isMyTurn || freeTalk) && !this.isMutedByUser;
    if (canSpeak) {
      await this.startMicrophoneCapture();
    } else {
      this.stopMicrophoneCapture();
    }
  }

  async setMute(muted: boolean) {
    this.isMutedByUser = muted;
    if (muted) {
      this.stopMicrophoneCapture();
    } else {
      if (this.options.isDebater && (this.options.isMyTurn || this.options.freeTalk)) {
        await this.startMicrophoneCapture();
      }
    }
  }

  private async startMicrophoneCapture() {
    if (this.micStream) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported on this browser');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass({ sampleRate: 16000 });
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => {});
      }

      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.scriptProcessor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      const userIdBytes = new TextEncoder().encode(this.options.userId);
      const headerLength = 3 + userIdBytes.length;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isMutedByUser || this.ws?.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        const sampleCount = inputData.length;
        const int16 = new Int16Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          sum += s * s;
        }

        const rms = Math.sqrt(sum / sampleCount);
        if (rms > 0.02) {
          this.activeSpeakersMap.set(this.options.userId, Date.now());
          this.refreshActiveSpeakers();
        }

        // Pack binary frame
        const totalBytes = headerLength + int16.byteLength;
        const packet = new Uint8Array(totalBytes);
        packet[0] = 1; // 1 = Audio
        packet[1] = (userIdBytes.length >> 8) & 0xff;
        packet[2] = userIdBytes.length & 0xff;
        packet.set(userIdBytes, 3);
        packet.set(new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength), headerLength);

        this.ws.send(packet.buffer);
      };

      source.connect(this.scriptProcessor);
      const dummyGain = this.audioCtx.createGain();
      dummyGain.gain.value = 0;
      this.scriptProcessor.connect(dummyGain);
      dummyGain.connect(this.audioCtx.destination);
    } catch (err: any) {
      console.warn('[BuiltinVoice] Microphone start error:', err);
      if (err.name === 'NotAllowedError') {
        this.options.onError?.('تم رفض إذن الوصول للميكروفون من الهاتف أو المتصفح');
      }
    }
  }

  private stopMicrophoneCapture() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
  }

  resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.speakingDecayTimer) {
      clearTimeout(this.speakingDecayTimer);
      this.speakingDecayTimer = null;
    }
    this.stopMicrophoneCapture();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.options.onConnectionStatusChange?.('disconnected');
  }
}

/**
 * High-performance Voice Room Session Manager
 * Audio-only, LiveKit with Built-in WebSocket Audio fallback
 */
export class LiveKitVoiceSession {
  private room: Room | null = null;
  private attachedElements: HTMLAudioElement[] = [];
  private builtinSession: BuiltinWebSocketVoiceSession | null = null;
  private micTester: MicTester | null = null;
  private activeSpeakerIds: Set<string> = new Set();
  private isMutedByUser = false;

  constructor(private options: UseVoiceOptions) {}

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

      // Check if built-in WebSocket audio is requested or fallback
      const shouldUseBuiltin =
        data.wsUrl === 'builtin' ||
        data.isSimulated ||
        !data.wsUrl ||
        data.wsUrl.includes('your-livekit-domain') ||
        data.wsUrl === 'simulated';

      if (shouldUseBuiltin) {
        console.info('[VoiceSession] Connecting to Built-in Web Audio/WebSocket Voice Engine');
        this.builtinSession = new BuiltinWebSocketVoiceSession(this.options);
        return await this.builtinSession.connect();
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
      if (!this.builtinSession) {
        console.info('[LiveKitVoice] Falling back to Built-in WebSocket Voice');
        this.builtinSession = new BuiltinWebSocketVoiceSession(this.options);
        return await this.builtinSession.connect();
      }
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

  async updateTurnPermissions(isMyTurn: boolean, freeTalk: boolean) {
    if (this.builtinSession) {
      await this.builtinSession.updateTurnPermissions(isMyTurn, freeTalk);
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

  async setMute(muted: boolean) {
    this.isMutedByUser = muted;
    if (this.builtinSession) {
      await this.builtinSession.setMute(muted);
      return;
    }

    if (this.room) {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(!muted);
      } catch (e) {
        console.warn('[LiveKitVoice] Failed to set microphone state:', e);
      }
    }
  }

  resumeAudioContext() {
    if (this.builtinSession) {
      this.builtinSession.resumeAudioContext();
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

  disconnect() {
    if (this.builtinSession) {
      this.builtinSession.disconnect();
      this.builtinSession = null;
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
}
