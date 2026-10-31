# مُـناظَـرة (Munazara) — Real-Time Voice & Text Debate Platform

A debate and discussion platform with capped stages (1 to 5 seats) and live audience participation in Arabic (RTL) and English (LTR).

This release introduces **Real-Time Turn-Based Voice Rooms** powered by **LiveKit** alongside the existing text debate mode.

---

## 🎙️ Real-Time Voice Architecture

### 1. Server-Authoritative Microphone Permissions
- Seated debaters connect to LiveKit audio.
- Only the debater whose turn it is possesses `canPublish: true`. All other seated debaters and audience members have `canPublish: false` enforced server-side via LiveKit's `RoomServiceClient.updateParticipant`.
- When a speaker passes their turn or the countdown timer expires, `POST /api/rooms/:id/turn` revokes audio publishing rights from the previous speaker and grants them to the next speaker.
- **Cost & Safety Safeguard**: If credentials (`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`) are not yet provisioned, the backend and frontend fall back to an interactive audio visualizer simulation so developers can test stage turns, dB meters, and UI flows immediately.

### 2. Audio Quality & Codec
- **Audio Only**: No video, no camera, no screen share.
- **Opus Codec**: 32–48 kbps bandwidth optimization.
- **Audio Processing**: WebRTC Echo Cancellation, Noise Suppression, and Automatic Gain Control (AGC) enabled.

---

## 🚀 LiveKit Setup & Environment Variables

### Option A: LiveKit Cloud (Recommended for Quick Prototyping)
1. Sign up for free at [cloud.livekit.io](https://cloud.livekit.io) (Free Build plan includes 50 GB monthly bandwidth and 100 concurrent participants).
2. Create a new project named `munazara-voice`.
3. In Project Settings > **Keys**, generate an **API Key** and **API Secret**.
4. Copy the WebSocket URL (e.g., `wss://munazara-xxxx.livekit.cloud`).
5. In Project Settings > **Webhooks**, create a webhook pointing to `https://your-domain.com/api/livekit/webhook` with event `participant_left` and copy the Webhook Secret.

### Option B: Self-Hosted LiveKit Server
To switch from LiveKit Cloud to self-hosted LiveKit, **no code changes are required** — only change your environment variables:
1. Run LiveKit via Docker:
   ```bash
   docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
     livekit/livekit-server \
     --dev \
     --bind 0.0.0.0 \
     --keys "devkey: secretsecretsecretsecretsecretsecret32"
   ```
2. Set `LIVEKIT_URL=ws://localhost:7880`, `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secretsecretsecretsecretsecretsecret32`.

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# LiveKit Server Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_WEBHOOK_SECRET=webhook_secret_here

# Room Settings
VOICE_ONLY_MODE=false
VOICE_ROOM_MAX_DURATION_MINUTES=120
VOICE_ROOM_MAX_AUDIENCE=100
```

---

## 🧪 Local Testing With Two Browser Windows

To test real-time turn passing, mic locking, and audience listening:

1. **Start the app**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in Google Chrome.

2. **Window 1 (Speaker A / Host)**:
   - Click **إنشاء غرفة جديدة (Create Room)**.
   - Select **غرفة صوتية حية (Voice Room)**, 2 seats (1v1 duel).
   - Enter title and click Create.
   - You are seated as the Host (Seat 1) with the microphone open.
   - Test your microphone using the level meter.

3. **Window 2 (Speaker B / Incognito Window)**:
   - Open `http://localhost:3000` in an **Incognito / Private Window** or secondary browser.
   - Enter the newly created room as an audience member.
   - You can hear Speaker A speaking.
   - Click **الصعود للمقعد الشاغر (Take Open Seat)**.
   - Complete the **Pre-Join Mic Check** to verify audio input and confirm stance.
   - Note: Because it is Speaker A's turn, Speaker B's microphone is muted by the server ("في انتظار دورك").

4. **Passing the Turn**:
   - In Window 1, Speaker A clicks **تمرير دوري (Pass My Turn)**.
   - Server revokes Speaker A's publishing rights and opens Speaker B's microphone.
   - Window 2 now displays the active green mic indicator with "أنت تتحدث الآن", while Window 1 shows Speaker A waiting.

---

## 🛡️ Moderation & Safety Features
- **Host Controls**:
  - Mute any speaker server-side.
  - Skip current turn if a speaker is unresponsive.
  - Kick/remove disruptive debaters from stage.
  - End room immediately.
- **Reporting System**:
  - Users can report rooms or individual speakers with reasons: Offensive Language, Harassment, Audio Spam/Noise, Misinformation.
  - Stored in server safety reports table accessible via `GET /api/moderation/reports`.
- **Banned User Protection**:
  - Banned users cannot join seats or receive LiveKit voice tokens (`403 Forbidden`).
- **Rate-Limiting**:
  - Token endpoint `POST /api/livekit/token` is rate-limited to prevent abuse.

---

## 💰 Cost Control & Resource Management
1. **Empty Room Teardown**:
   - Webhook `POST /api/livekit/webhook` listens for participant departures. When the last participant leaves, the room is automatically archived.
2. **Auto-Expiration**:
   - Background periodic worker checks active voice rooms every 60 seconds; rooms exceeding `VOICE_ROOM_MAX_DURATION_MINUTES` (default 120 minutes) are closed.
3. **Single Live Room Per Host**:
   - A host is restricted to at most one active voice room at any given time.
4. **Admin Voice Monitor**:
   - Real-time dashboard (`GET /api/admin/voice-rooms`) shows live participant counts, durations, and health status.

---

## 📱 Mobile & iOS Compatibility
- Handles Safari and iOS audio autoplay restrictions with an in-app "Tap to Unblock Audio" prompt.
- Retains audio playback when backgrounding or screen locking where supported by the browser.
- Respects Arabic RTL and English LTR layouts seamlessly.
