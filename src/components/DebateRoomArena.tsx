import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Share2, Volume2, VolumeX, Check, Bookmark } from 'lucide-react';
import { DebateMessage, DebateRoom, Stance, UserProfile } from '../types';
import { DebaterStageBar } from './DebaterStageBar';
import { DebateChatStream } from './DebateChatStream';
import { AudienceActionBar } from './AudienceActionBar';
import { DebateSidebar } from './DebateSidebar';
import { AskQuestionModal } from './AskQuestionModal';
import { FloatingReactions, FloatingReactionItem } from './FloatingReactions';
import { playBellChime } from '../utils/soundEffects';
import { useTranslation } from '../i18n/LanguageContext';
import { VoiceDebatePanel } from './VoiceDebatePanel';
import { MicCheckModal } from './MicCheckModal';
import { ReportModal } from './ReportModal';
import { ConfirmEndRoomModal } from './ConfirmEndRoomModal';
import { useLiveKitVoice } from '../hooks/useLiveKitVoice';

interface DebateRoomArenaProps {
  room: DebateRoom;
  currentUser: UserProfile;
  onBackToLobby: () => void;
  onSendMessage: (data: {
    content: string;
    type: any;
    stance: Stance;
    citedSource?: string;
  }) => void;
  onSendAudienceMessage: (content: string) => void;
  onSubmitQuestion: (question: string) => void;
  onUpvoteQuestion: (qId: string) => void;
  onVoteStance: (stance: Stance) => void;
  onJoinAsDebater: (stance: Stance) => void;
  onStepDown: () => void;
  onNextTurn: (options?: { manualPass?: boolean; speakerName?: string }) => void;
  onRequestAIReferee: () => void;
  isAnalyzingAI: boolean;
  onGenerateAIInspiration: () => void;
  isGeneratingAI: boolean;
  isSaved?: boolean;
  onToggleSaveDebate?: (room: DebateRoom) => void;
  onOpenLibrary?: () => void;
  onHostMuteParticipant?: (targetId: string, isMuted: boolean) => void;
  onHostKickParticipant?: (targetId: string, reason?: string) => void;
  onHostEndRoom?: () => void;
  onSubmitReport?: (data: {
    targetId: string;
    targetName: string;
    targetRole: string;
    reason: string;
    details: string;
  }) => void;
}

export const DebateRoomArena: React.FC<DebateRoomArenaProps> = ({
  room,
  currentUser,
  onBackToLobby,
  onSendMessage,
  onSendAudienceMessage,
  onSubmitQuestion,
  onUpvoteQuestion,
  onVoteStance,
  onJoinAsDebater,
  onStepDown,
  onNextTurn,
  onRequestAIReferee,
  isAnalyzingAI,
  onGenerateAIInspiration,
  isGeneratingAI,
  isSaved = false,
  onToggleSaveDebate,
  onOpenLibrary,
  onHostMuteParticipant,
  onHostKickParticipant,
  onHostEndRoom,
  onSubmitReport,
}) => {
  const { t, dir } = useTranslation();
  const [activeTab, setActiveTab] = useState<'referee' | 'vote' | 'questions' | 'audienceChat' | 'participants'>('referee');
  const [isMicCheckModalOpen, setIsMicCheckModalOpen] = useState(false);
  const [pendingJoinStance, setPendingJoinStance] = useState<Stance>('pro');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetUser, setReportTargetUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<DebateMessage | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);
  const [isEndingRoom, setIsEndingRoom] = useState(false);

  // Turn timer countdown state (calculated against server turnStartedAt)
  const [timeLeftInTurn, setTimeLeftInTurn] = useState<number>(() => {
    if (room.turnStartedAt && room.turnDurationSec) {
      const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
      return Math.max(0, room.turnDurationSec - elapsed);
    }
    return room.turnDurationSec || 90;
  });

  const myParticipant = room.participants.find((p) => p.id === currentUser.id);
  const isCurrentUserDebater = myParticipant ? myParticipant.role === 'host' || myParticipant.role === 'debater' : room.hostId === currentUser.id;
  const isCurrentUserHost = (room.hostId === currentUser.id) || (myParticipant?.role === 'host');
  const myStance = myParticipant?.stance || 'pro';
  const isMyTurn = room.currentSpeakerId === currentUser.id;
  const isVoiceMode = room.mode === 'voice';

  // LiveKit voice hook
  const {
    connectionStatus,
    activeSpeakerIds,
    isLocallyMuted,
    errorMessage: voiceError,
    needsAutoplayUnlock,
    toggleMute,
    unlockAudioAutoplay,
  } = useLiveKitVoice({
    roomId: room.id,
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    isDebater: isCurrentUserDebater,
    isMyTurn: isMyTurn,
    freeTalk: !!room.freeTalk,
    isVoiceMode,
  });

  const debaterCount = room.participants.filter(p => p.role === 'host' || p.role === 'debater').length;
  const isStageLocked = debaterCount >= room.maxDebaters;
  const vacantSeatsCount = Math.max(0, room.maxDebaters - debaterCount);

  // Turn Timer countdown effect - anchored to server turnStartedAt
  useEffect(() => {
    if (!room.turnDurationSec || room.turnDurationSec <= 0) return;
    const calcTimeLeft = () => {
      if (room.turnStartedAt) {
        const elapsed = Math.floor((Date.now() - room.turnStartedAt) / 1000);
        return Math.max(0, room.turnDurationSec - elapsed);
      }
      return room.turnDurationSec;
    };

    setTimeLeftInTurn(calcTimeLeft());
    const interval = setInterval(() => {
      const remaining = calcTimeLeft();
      if (remaining === 0 && soundEnabled) {
        playBellChime();
      }
      setTimeLeftInTurn(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [room.turnDurationSec, room.turnStartedAt, soundEnabled, room.currentSpeakerId]);

  // Handle reaction popping
  const handleSendReaction = (type: 'fire' | 'applause' | 'light' | 'balance' | 'mindblown') => {
    const emojis: Record<string, string> = {
      fire: '🔥',
      applause: '👏',
      light: '💡',
      balance: '⚖️',
      mindblown: '🤯',
    };

    const newReaction: FloatingReactionItem = {
      id: 'react-' + Date.now() + '-' + Math.random(),
      emoji: emojis[type] || '🔥',
      x: 15 + Math.random() * 70,
    };

    setFloatingReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 1800);
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  const handleManualPassTurn = () => {
    onNextTurn({
      manualPass: true,
      speakerName: currentUser.name,
    });
  };

  const handleTriggerJoinStage = (stance: Stance) => {
    if (isVoiceMode) {
      setPendingJoinStance(stance);
      setIsMicCheckModalOpen(true);
    } else {
      onJoinAsDebater(stance);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 space-y-4">
      {/* Floating Reaction Animation Overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Top Arena Navigation & Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="back-to-lobby-arena-btn"
            onClick={onBackToLobby}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            {dir === 'rtl' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            <span>{t('leaveRoomBtn')}</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-red-500">
                {isVoiceMode ? t('voiceRoomLiveStage') : t('liveDebateBadge')}
              </span>
              {isVoiceMode && (
                <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  🎙️ {t('voiceRoomBadge')}
                </span>
              )}
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">{t('spectatorsCountLabel', { count: room.spectatorsCount })}</span>
            </div>
            <h1 className="font-heading text-sm sm:text-base font-bold text-gray-900 line-clamp-1 mt-0.5">
              {room.title}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Save to Library button */}
          <button
            id="save-debate-arena-btn"
            onClick={() => onToggleSaveDebate && onToggleSaveDebate(room)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition shadow-xs active:scale-95 ${
              isSaved
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50'
            }`}
            title={isSaved ? t('savedInLibrary') : t('saveDebateBtn')}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'text-indigo-600 fill-indigo-600' : 'text-gray-500'}`} />
            <span>{isSaved ? t('savedInLibrary') : t('saveDebateBtn')}</span>
          </button>

          <button
            id="share-room-btn"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
            title={t('shareRoomBtn')}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copiedLink ? t('linkCopied') : t('shareRoomBtn')}</span>
          </button>

          <button
            id="toggle-sound-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-2xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 transition shadow-xs"
            title={soundEnabled ? t('muteSound') : t('unmuteSound')}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-indigo-600" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {isCurrentUserHost && (
            <button
              id="header-end-room-btn"
              type="button"
              onClick={() => setIsConfirmEndOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs active:scale-95"
              title={t('endDebateBtn')}
            >
              <span>{t('endDebateBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Concluded Room Notification Banner */}
      {room.status === 'concluded' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl border border-rose-200 bg-rose-50/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white font-bold text-lg">
              🏁
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-rose-900">
                {t('roomEndedNotice')}
              </h3>
              <p className="text-xs text-rose-700">
                {t('roomEndedDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToLobby}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs active:scale-95"
          >
            <span>{t('returnToLobbyBtn')}</span>
          </button>
        </div>
      )}

      {/* Debater Stage Bar (in text mode) */}
      {!isVoiceMode && (
        <DebaterStageBar
          room={room}
          currentUser={currentUser}
          onJoinAsDebater={handleTriggerJoinStage}
          onStepDown={onStepDown}
          onNextTurn={onNextTurn}
          isCurrentUserDebater={isCurrentUserDebater}
          isCurrentUserHost={isCurrentUserHost}
          timeLeftInTurn={timeLeftInTurn}
        />
      )}

      {/* Main Grid: Discussion Arena Stream / Voice Panel + Interactive Sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left/Center Column (8 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          {isVoiceMode ? (
            /* Voice Arena Panel */
            <VoiceDebatePanel
              room={room}
              currentUser={currentUser}
              isDebater={isCurrentUserDebater}
              isHost={isCurrentUserHost}
              isMyTurn={isMyTurn}
              timeLeftInTurn={timeLeftInTurn}
              connectionStatus={connectionStatus}
              activeSpeakerIds={activeSpeakerIds}
              isLocallyMuted={isLocallyMuted}
              needsAutoplayUnlock={needsAutoplayUnlock}
              onToggleMute={toggleMute}
              onPassTurn={handleManualPassTurn}
              onUnlockAutoplay={unlockAudioAutoplay}
              onRequestJoinStage={handleTriggerJoinStage}
              onStepDown={onStepDown}
              onHostMuteParticipant={onHostMuteParticipant}
              onHostKickParticipant={onHostKickParticipant}
              onHostSkipTurn={() => onNextTurn({ manualPass: true, speakerName: 'Host' })}
              onHostEndRoom={onHostEndRoom}
              onOpenReportModal={(target) => {
                setReportTargetUser(target || null);
                setIsReportModalOpen(true);
              }}
              onOpenMicCheck={() => {
                setPendingJoinStance(myStance);
                setIsMicCheckModalOpen(true);
              }}
            />
          ) : (
            /* Text Mode Arena */
            <>
              {/* Discussion Messages Stream Box */}
              <div className="min-h-[420px] max-h-[620px] overflow-y-auto rounded-3xl border border-gray-100 bg-white/70 p-4 shadow-xs">
                <DebateChatStream
                  messages={room.messages}
                  currentUser={currentUser}
                  onReplyTo={(msg) => setReplyingTo(msg)}
                  onLikeMessage={() => {}}
                  isCurrentUserDebater={isCurrentUserDebater}
                />
              </div>

              {/* Bottom Action Deck */}
              <AudienceActionBar
                isDebater={isCurrentUserDebater}
                userStance={myStance}
                currentUser={currentUser}
                replyingTo={replyingTo}
                onClearReply={() => setReplyingTo(null)}
                onSendMessage={onSendMessage}
                onSendAudienceMessage={onSendAudienceMessage}
                onOpenQuestionModal={() => setIsQuestionModalOpen(true)}
                onSendReaction={handleSendReaction}
                onRequestJoinStage={handleTriggerJoinStage}
                isStageLocked={isStageLocked}
                vacantSeatsCount={vacantSeatsCount}
                onGenerateAIInspiration={onGenerateAIInspiration}
                isGeneratingAI={isGeneratingAI}
                isMyTurn={isMyTurn}
                onPassTurn={handleManualPassTurn}
              />
            </>
          )}
        </div>

        {/* Right Column (4 cols): AI Referee, Live Poll, Questions, Side-Chat, Participants */}
        <div className="lg:col-span-4 min-h-[500px]">
          <DebateSidebar
            room={room}
            currentUser={currentUser}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onVoteStance={onVoteStance}
            onUpvoteQuestion={onUpvoteQuestion}
            onOpenQuestionModal={() => setIsQuestionModalOpen(true)}
            onRequestAIReferee={onRequestAIReferee}
            isAnalyzingAI={isAnalyzingAI}
          />
        </div>
      </div>

      {/* Ask Question Modal */}
      <AskQuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSubmitQuestion={onSubmitQuestion}
      />

      {/* Pre-Join Mic Check Modal */}
      <MicCheckModal
        isOpen={isMicCheckModalOpen}
        onClose={() => setIsMicCheckModalOpen(false)}
        onConfirmJoin={() => {
          setIsMicCheckModalOpen(false);
          onJoinAsDebater(pendingJoinStance);
        }}
        stance={pendingJoinStance}
      />

      {/* Moderation / Safety Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTargetUser(null);
        }}
        room={room}
        targetUser={reportTargetUser}
        onSubmitReport={(data) => {
          if (onSubmitReport) {
            onSubmitReport(data);
          }
        }}
      />

      {/* Host End Room Confirmation Modal */}
      <ConfirmEndRoomModal
        isOpen={isConfirmEndOpen}
        onClose={() => {
          if (!isEndingRoom) setIsConfirmEndOpen(false);
        }}
        roomTitle={room.title}
        isEnding={isEndingRoom}
        onConfirm={async () => {
          setIsEndingRoom(true);
          try {
            await onHostEndRoom?.();
          } finally {
            setIsEndingRoom(false);
            setIsConfirmEndOpen(false);
          }
        }}
      />
    </div>
  );
};
