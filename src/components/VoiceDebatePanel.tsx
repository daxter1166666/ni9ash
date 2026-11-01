import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  FastForward,
  Volume2,
  VolumeX,
  Radio,
  ShieldAlert,
  Flag,
  UserX,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Swords,
  ChevronRight,
  MoreVertical,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { DebateRoom, Participant, Stance, UserProfile } from '../types';
import { VoiceConnectionStatus } from '../services/livekitAudio';
import { useTranslation } from '../i18n/LanguageContext';
import { ConfirmEndRoomModal } from './ConfirmEndRoomModal';

interface VoiceDebatePanelProps {
  room: DebateRoom;
  currentUser: UserProfile;
  isDebater: boolean;
  isHost: boolean;
  isMyTurn: boolean;
  timeLeftInTurn: number;
  connectionStatus: VoiceConnectionStatus;
  activeSpeakerIds: string[];
  isLocallyMuted: boolean;
  needsAutoplayUnlock: boolean;
  onToggleMute: () => void;
  onPassTurn: () => void;
  onUnlockAutoplay: () => void;
  onRequestJoinStage: (stance: Stance) => void;
  onStepDown: () => void;
  onHostMuteParticipant?: (targetId: string, isMuted: boolean) => void;
  onHostKickParticipant?: (targetId: string, reason?: string) => void;
  onHostSkipTurn?: () => void;
  onHostEndRoom?: () => void;
  onOpenReportModal?: (targetUser?: { id: string; name: string; role: string }) => void;
  onOpenMicCheck?: () => void;
}

export const VoiceDebatePanel: React.FC<VoiceDebatePanelProps> = ({
  room,
  currentUser,
  isDebater,
  isHost,
  isMyTurn,
  timeLeftInTurn,
  connectionStatus,
  activeSpeakerIds,
  isLocallyMuted,
  needsAutoplayUnlock,
  onToggleMute,
  onPassTurn,
  onUnlockAutoplay,
  onRequestJoinStage,
  onStepDown,
  onHostMuteParticipant,
  onHostKickParticipant,
  onHostSkipTurn,
  onHostEndRoom,
  onOpenReportModal,
  onOpenMicCheck,
}) => {
  const { t, dir } = useTranslation();
  const [selectedUserActionMenu, setSelectedUserActionMenu] = useState<string | null>(null);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const debaters = room.participants.filter((p) => p.role === 'host' || p.role === 'debater');
  const activeSpeaker = debaters.find((d) => d.id === room.currentSpeakerId) || debaters[0];
  const isFreeTalk = Boolean(room.freeTalk);
  const vacantSlots = Math.max(0, room.maxDebaters - debaters.length);

  const isUserAllowedToPublish = isDebater && (isMyTurn || isFreeTalk);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-xs" dir={dir}>
      {/* 1. iOS / Browser Autoplay Unlock Banner */}
      {needsAutoplayUnlock && (
        <div className="flex items-center justify-between rounded-2xl bg-amber-500 p-3 text-white shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            <span className="text-xs font-bold">{t('autoplayBlockedMessage')}</span>
          </div>
          <button
            onClick={onUnlockAutoplay}
            className="rounded-xl bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-xs hover:bg-amber-50"
          >
            {t('unblockAudioBtn')}
          </button>
        </div>
      )}

      {/* 2. Top Info Strip: Voice Mode Status & Connection Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-gray-900">{t('voiceRoomLiveStage')}</span>
          <span className="text-gray-300">•</span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
            {isFreeTalk ? t('modeFreeTalk') : t('modeTurnBased')}
          </span>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              <Wifi className="h-3 w-3" />
              <span>{t('connectionConnected')}</span>
            </span>
          ) : connectionStatus === 'reconnecting' ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>{t('connectionReconnecting')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
              <WifiOff className="h-3 w-3" />
              <span>{t('connectionDisconnected')}</span>
            </span>
          )}

          {/* Report Room Button */}
          <button
            onClick={() => onOpenReportModal && onOpenReportModal()}
            className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500 hover:text-rose-600 hover:border-rose-200 transition"
            title={t('reportRoomTitle')}
          >
            <Flag className="h-3 w-3" />
            <span className="hidden sm:inline">{t('reportBtn')}</span>
          </button>
        </div>
      </div>

      {/* 3. Seated Debaters Stage Cards (Pulsing ring when active speaker!) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {debaters.map((participant) => {
          const isCurrentTurnSpeaker = room.currentSpeakerId === participant.id;
          const isActivelySpeaking = activeSpeakerIds.includes(participant.id);
          const isParticipantMe = participant.id === currentUser.id;

          return (
            <div
              key={participant.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all duration-300 ${
                isCurrentTurnSpeaker
                  ? 'border-indigo-400 bg-gradient-to-b from-indigo-50/60 to-white shadow-md ring-2 ring-indigo-400/30'
                  : 'border-gray-100 bg-gray-50/50 hover:bg-white'
              }`}
            >
              {/* Active Speaker Ring Aura */}
              {isActivelySpeaking && (
                <span className="absolute -inset-0.5 rounded-2xl border-2 border-emerald-400 animate-pulse pointer-events-none" />
              )}

              {/* Speaker Card Header */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="relative">
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className={`h-11 w-11 rounded-2xl object-cover border-2 shadow-xs transition-transform ${
                      isActivelySpeaking
                        ? 'border-emerald-500 scale-105'
                        : isCurrentTurnSpeaker
                        ? 'border-indigo-500'
                        : 'border-white'
                    }`}
                  />
                  {/* Speaking indicator dot */}
                  {isActivelySpeaking && (
                    <span className="absolute -top-1 -end-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  )}
                </div>

                {/* Stance Pill & Moderation Menu Trigger */}
                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      participant.stance === 'pro'
                        ? 'bg-blue-100 text-blue-700'
                        : participant.stance === 'con'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {participant.stance === 'pro'
                      ? t('stancePro')
                      : participant.stance === 'con'
                      ? t('stanceCon')
                      : t('stanceNeutral')}
                  </span>

                  {/* Options Menu for Host/Moderation or Report */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setSelectedUserActionMenu(
                          selectedUserActionMenu === participant.id ? null : participant.id
                        )
                      }
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-200/60 transition"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>

                    {selectedUserActionMenu === participant.id && (
                      <div className="absolute end-0 top-6 z-30 w-36 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl text-xs space-y-1">
                        {isHost && !isParticipantMe && (
                          <>
                            <button
                              onClick={() => {
                                onHostMuteParticipant?.(participant.id, !participant.isMuted);
                                setSelectedUserActionMenu(null);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1 text-gray-700 hover:bg-gray-100 transition"
                            >
                              {participant.isMuted ? <Volume2 className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                              <span>{participant.isMuted ? t('unmuteSpeaker') : t('muteSpeaker')}</span>
                            </button>
                            <button
                              onClick={() => {
                                onHostKickParticipant?.(participant.id, 'مخالفة قواعد النقاش');
                                setSelectedUserActionMenu(null);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1 text-rose-600 hover:bg-rose-50 transition"
                            >
                              <UserX className="h-3 w-3" />
                              <span>{t('kickSpeaker')}</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            onOpenReportModal?.({
                              id: participant.id,
                              name: participant.name,
                              role: participant.role,
                            });
                            setSelectedUserActionMenu(null);
                          }}
                          className="flex w-full items-center gap-1.5 rounded-xl px-2 py-1 text-gray-600 hover:bg-gray-100 transition"
                        >
                          <Flag className="h-3 w-3" />
                          <span>{t('reportSpeaker')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Speaker Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {participant.name}
                  </h4>
                  {isParticipantMe && (
                    <span className="rounded-full bg-indigo-600 px-1.5 text-[9px] font-bold text-white">
                      {t('you')}
                    </span>
                  )}
                </div>

                {/* Live Mic Status Badge */}
                <div className="flex items-center gap-1 text-[10px]">
                  {participant.isMuted ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                      <MicOff className="h-3 w-3" />
                      <span>{t('micMuted')}</span>
                    </span>
                  ) : isCurrentTurnSpeaker || isFreeTalk ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <Mic className="h-3 w-3 animate-bounce" />
                      <span>{t('micSpeaking')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Timer className="h-3 w-3" />
                      <span>{t('micWaitingTurn')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Vacant Open Seats for Spectators */}
        {Array.from({ length: vacantSlots }).map((_, idx) => (
          <div
            key={`open-slot-${idx}`}
            onClick={onOpenMicCheck}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 text-center hover:border-indigo-300 hover:bg-indigo-50/20 transition group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-400 border border-gray-100 group-hover:text-indigo-600 shadow-xs mb-1.5">
              <Mic className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-600">
              {t('openSeatLabel', { seat: debaters.length + idx + 1 })}
            </span>
            <span className="text-[10px] text-gray-400">
              {t('clickToTakeSeatHint')}
            </span>
          </div>
        ))}
      </div>

      {/* 4. Active Control Deck */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Speaker Status or Turn Countdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Turn Countdown Circle */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white border border-indigo-100 shadow-sm">
            <Timer className="h-4 w-4 text-indigo-500 absolute top-1" />
            <span className="font-mono text-base font-black text-gray-900 mt-2">
              {timeLeftInTurn}s
            </span>
          </div>

          <div className="flex-1">
            {isUserAllowedToPublish ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <h4 className="text-xs sm:text-sm font-black text-emerald-700">
                    {t('youAreSpeakingNow')}
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isLocallyMuted ? t('yourMicIsMutedLocally') : t('yourMicIsLiveAndAudible')}
                </p>
              </div>
            ) : isDebater ? (
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-800">
                  {t('waitingForYourTurnHeader')}
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {t('currentSpeakerIs', { name: activeSpeaker?.name || '' })}
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-800">
                  {t('audienceListeningHeader')}
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {vacantSlots > 0
                    ? t('audienceTakeSeatAvailable', { count: vacantSlots })
                    : t('stageIsFullAudienceMode')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions for Debater / Host / Spectator */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* When User is Allowed to Speak */}
          {isUserAllowedToPublish && (
            <>
              {/* Local Mute Button */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                  isLocallyMuted
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isLocallyMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isLocallyMuted ? t('unmuteMicBtn') : t('muteMicBtn')}</span>
              </button>

              {/* Pass My Turn Button */}
              {!isFreeTalk && (
                <button
                  type="button"
                  onClick={onPassTurn}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition active:scale-95"
                >
                  <FastForward className="h-4 w-4" />
                  <span>{t('passMyTurnBtn')}</span>
                </button>
              )}
            </>
          )}

          {/* Seated Debater: Step Down Button */}
          {isDebater && !isHost && (
            <button
              type="button"
              onClick={onStepDown}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              title={t('stepDownToAudience')}
            >
              {t('stepDownBtn')}
            </button>
          )}

          {/* Spectator: Take Open Seat Button */}
          {!isDebater && vacantSlots > 0 && (
            <button
              type="button"
              onClick={onOpenMicCheck}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
            >
              <Mic className="h-4 w-4" />
              <span>{t('takeSeatButton')}</span>
            </button>
          )}

          {/* Host Global Controls */}
          {isHost && (
            <div className="flex items-center gap-1">
              {debaters.length > 1 && !isFreeTalk && (
                <button
                  type="button"
                  onClick={onHostSkipTurn}
                  className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                  title={t('hostSkipTurnTooltip')}
                >
                  <FastForward className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsConfirmEndOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs active:scale-95"
                title={t('endDebateBtn')}
              >
                <span>{t('endDebateBtn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* In-App End Room Confirmation Modal */}
      <ConfirmEndRoomModal
        isOpen={isConfirmEndOpen}
        onClose={() => {
          if (!isEnding) setIsConfirmEndOpen(false);
        }}
        roomTitle={room.title}
        isEnding={isEnding}
        onConfirm={async () => {
          setIsEnding(true);
          try {
            await onHostEndRoom?.();
          } finally {
            setIsEnding(false);
            setIsConfirmEndOpen(false);
          }
        }}
      />
    </div>
  );
};
