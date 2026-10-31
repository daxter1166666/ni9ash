import React from 'react';
import {
  Lock,
  Unlock,
  Mic,
  Timer,
  LogOut,
  Swords,
  Users,
  FastForward,
  CheckCircle2,
  Volume2,
  RotateCw,
  Check,
  X
} from 'lucide-react';
import { DebateRoom, UserProfile } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface DebaterStageBarProps {
  room: DebateRoom;
  currentUser: UserProfile;
  onJoinAsDebater: (stance: 'pro' | 'con' | 'neutral') => void;
  onStepDown: () => void;
  onNextTurn: (options?: { manualPass?: boolean; speakerName?: string }) => void;
  isCurrentUserDebater: boolean;
  isCurrentUserHost: boolean;
  timeLeftInTurn: number;
}

export const DebaterStageBar: React.FC<DebaterStageBarProps> = ({
  room,
  currentUser,
  onJoinAsDebater,
  onStepDown,
  onNextTurn,
  isCurrentUserDebater,
  isCurrentUserHost,
  timeLeftInTurn,
}) => {
  const { t } = useTranslation();
  const isSolo = room.maxDebaters === 1 || room.roomType === 'solo';
  const is1v1 = (room.maxDebaters === 2 || room.roomType === '1v1') && !isSolo;
  const debaters = room.participants.filter((p) => p.role === 'host' || p.role === 'debater');
  const debaterCount = debaters.length;
  const isLocked = debaterCount >= room.maxDebaters;
  const vacantSlotsCount = Math.max(0, room.maxDebaters - debaterCount);

  const activeSpeaker = debaters.find((d) => d.id === room.currentSpeakerId) || debaters[0];
  const isCurrentSpeakerMe = room.currentSpeakerId === currentUser.id;

  const handleManualPassTurn = () => {
    onNextTurn({
      manualPass: true,
      speakerName: currentUser.name,
    });
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
        {/* Left: Capacity & Stage Lock Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
            {isSolo ? <Mic className="h-4 w-4" /> : is1v1 ? <Swords className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-900">
                {isSolo
                  ? t('stageSoloTitle')
                  : is1v1
                  ? t('stage1v1Title')
                  : t('stageGroupTitle', { count: room.maxDebaters })}
              </span>
              {isLocked ? (
                <span className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-500">
                  <Lock className="h-3 w-3 text-red-500" />
                  {t('statusFull', { current: debaterCount, max: room.maxDebaters })}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-600">
                  <Unlock className="h-3 w-3 text-green-600" />
                  {t('statusOpen', { remaining: vacantSlotsCount, current: debaterCount, max: room.maxDebaters })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              {isSolo
                ? t('soloSpeakerSeat') + ' • ' + t('stageSoloHint')
                : is1v1
                ? (isLocked ? t('duelLockedHint') : t('duelOpenHint'))
                : (isLocked ? t('groupLockedHint', { count: room.maxDebaters }) : t('groupOpenHint'))}
            </p>
          </div>
        </div>

        {/* Right: Speaker Turn, Timer & Pass Mic Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {activeSpeaker && room.turnDurationSec > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs shadow-xs">
              <Timer className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-gray-500">
                {t('speakingTurn')}: <strong className="text-gray-900">{activeSpeaker.name.split(' ')[0]}</strong>
              </span>
              <span className={`font-mono font-bold ${timeLeftInTurn < 15 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                {Math.floor(timeLeftInTurn / 60)}:{String(timeLeftInTurn % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Active Speaker: Manual "End My Turn Early / Pass Mic" Button */}
          {isCurrentSpeakerMe && debaters.length > 1 && (
            <button
              id="speaker-pass-mic-btn"
              onClick={handleManualPassTurn}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-200 transition hover:from-amber-600 hover:to-amber-700 animate-pulse active:scale-95"
              title={t('passTurnTitle')}
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>{t('endMyTurnBtn')}</span>
            </button>
          )}

          {/* Host Turn Switcher */}
          {isCurrentUserHost && !isCurrentSpeakerMe && (
            <button
              id="switch-turn-host-btn"
              onClick={() => onNextTurn()}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 shadow-xs active:scale-95"
              title={t('passTurnTitle')}
            >
              <RotateCw className="h-3.5 w-3.5 text-gray-500" />
              <span>{t('nextTurnBtn')}</span>
            </button>
          )}

          {/* Step down / Leave stage */}
          {isCurrentUserDebater && !isCurrentUserHost && (
            <button
              id="step-down-btn"
              onClick={onStepDown}
              className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-xs"
              title={t('stepDownTitle')}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('leaveStage')}</span>
            </button>
          )}
        </div>
      </div>

      {/* STAGE LAYOUT 1: Solo Keynote (1 Seat) */}
      {isSolo && (
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/30 p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={debaters[0]?.avatar || currentUser.avatar}
                  alt={debaters[0]?.name || 'Presenter'}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md ring-4 ring-purple-100"
                />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                  <Mic className="h-3.5 w-3.5" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-base font-bold text-gray-900">
                    {debaters[0]?.name}
                  </span>
                  {debaters[0]?.id === currentUser.id && (
                    <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">
                      {t('youLabel')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{debaters[0]?.handle}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                    {t('badgeSolo')} • {t('hostLabel')}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {t('soloPresentationInProg')}
                  </span>
                </div>
              </div>
            </div>

            {/* Solo Controls */}
            <div className="flex items-center gap-2">
              {debaters[0]?.id === currentUser.id ? (
                <button
                  onClick={handleManualPassTurn}
                  className="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 active:scale-95"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  <span>{t('startNewRoundBtn')}</span>
                </button>
              ) : (
                <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-2 text-xs font-medium text-purple-700 text-center">
                  {t('listeningAudienceNotice')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE LAYOUT 2: 1v1 Versus Layout (2 Seats) */}
      {is1v1 && (
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-emerald-50/40 via-white to-rose-50/40 p-4">
          {/* Pro Corner / Debater 1 */}
          <div className="flex-1 w-full">
            {debaters[0] ? (
              <div
                className={`relative flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-xs transition ${
                  debaters[0].id === room.currentSpeakerId
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-gray-200'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={debaters[0].avatar}
                    alt={debaters[0].name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 truncate">{debaters[0].name}</span>
                    {debaters[0].id === currentUser.id && <span className="text-[10px] text-indigo-600 font-bold">({t('youLabel')})</span>}
                    {debaters[0].id === room.currentSpeakerId && (
                      <span className="rounded-full bg-indigo-600 text-white px-2 py-0.2 text-[9px] font-bold">
                        {t('speakingTurn')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {debaters[0].stance === 'pro' ? t('stancePro') : debaters[0].stance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                    </span>
                    <span className="text-[10px] text-gray-400">{t('hostLabel')}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* VS Center Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-200">
              VS
            </div>
            <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{t('badge1v1')}</span>
          </div>

          {/* Con Corner / Debater 2 (or Claimable Slot) */}
          <div className="flex-1 w-full">
            {debaters[1] ? (
              <div
                className={`relative flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-xs transition ${
                  debaters[1].id === room.currentSpeakerId
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-gray-200'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={debaters[1].avatar}
                    alt={debaters[1].name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover border-2 border-rose-500 shadow-xs"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                    <X className="h-3 w-3 stroke-[3]" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900 truncate">{debaters[1].name}</span>
                    {debaters[1].id === currentUser.id && <span className="text-[10px] text-indigo-600 font-bold">({t('youLabel')})</span>}
                    {debaters[1].id === room.currentSpeakerId && (
                      <span className="rounded-full bg-indigo-600 text-white px-2 py-0.2 text-[9px] font-bold">
                        {t('speakingTurn')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      {debaters[1].stance === 'pro' ? t('stancePro') : debaters[1].stance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                    </span>
                    <span className="text-[10px] text-gray-400">{t('challengerLabel')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/40 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-rose-300 bg-white text-rose-500 text-xs font-bold">
                    1v1
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800">{t('opponentSeatVacant')}</span>
                    <p className="text-[10px] text-gray-500">{t('acceptChallengePrompt', { name: debaters[0]?.name.split(' ')[0] })}</p>
                  </div>
                </div>

                {!isCurrentUserDebater && (
                  <button
                    id="claim-1v1-seat-btn"
                    onClick={() => onJoinAsDebater(debaters[0]?.stance === 'pro' ? 'con' : 'pro')}
                    className="shrink-0 flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition active:scale-95"
                  >
                    <Swords className="h-3.5 w-3.5" />
                    <span>{t('acceptChallenge')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE LAYOUT 3: Group Discussion Seats Grid (3 to 5 Seats) */}
      {!isSolo && !is1v1 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {/* Render Occupied Debaters */}
          {debaters.map((debater) => {
            const isSpeaking = debater.id === room.currentSpeakerId;
            const isMe = debater.id === currentUser.id;

            return (
              <div
                key={debater.id}
                className={`relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all ${
                  isSpeaking
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-500'
                    : 'border-gray-100 bg-white hover:border-gray-200 shadow-xs'
                }`}
              >
                {/* Turn Speaker Indicator */}
                {isSpeaking && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs whitespace-nowrap">
                    {t('speakingTurn')}
                  </div>
                )}

                {/* Avatar + Stance Ring */}
                <div className="relative mt-1 mb-2">
                  <img
                    src={debater.avatar}
                    alt={debater.name}
                    referrerPolicy="no-referrer"
                    className={`h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-xs ${
                      debater.stance === 'pro'
                        ? 'border-2 border-emerald-500'
                        : debater.stance === 'con'
                        ? 'border-2 border-rose-500'
                        : 'border-2 border-amber-500'
                    }`}
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ${
                      debater.stance === 'pro'
                        ? 'bg-emerald-500'
                        : debater.stance === 'con'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  >
                    {debater.stance === 'pro' ? '✓' : debater.stance === 'con' ? '✕' : '='}
                  </span>
                </div>

                {/* Name & Handle */}
                <div className="w-full">
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-gray-900 truncate">
                    <span>{debater.name}</span>
                    {isMe && <span className="text-[10px] text-indigo-600 font-bold">({t('youLabel')})</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">{debater.handle}</div>
                </div>

                {/* Stance Pill & Role */}
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      debater.stance === 'pro'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : debater.stance === 'con'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {debater.stance === 'pro' ? t('stancePro') : debater.stance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                  </span>
                  {debater.role === 'host' && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                      {t('hostLabel')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Render Vacant Slots for Spectators to Claim */}
          {Array.from({ length: vacantSlotsCount }).map((_, index) => (
            <div
              key={`vacant-slot-${index}`}
              className="flex flex-col items-center justify-between rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-3 text-center transition hover:border-indigo-200 hover:bg-indigo-50/20"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 shadow-xs">
                <Mic className="h-4 w-4 opacity-50" />
              </div>

              <div className="my-1.5">
                <span className="text-xs font-bold text-gray-600">{t('vacantSlot', { num: debaterCount + index + 1 })}</span>
                <p className="text-[10px] text-gray-400">{t('openForAudience')}</p>
              </div>

              {/* Quick Claim Buttons if user is audience */}
              {!isCurrentUserDebater ? (
                <div className="flex w-full flex-col gap-1">
                  <button
                    id={`claim-seat-pro-btn-${index}`}
                    onClick={() => onJoinAsDebater('pro')}
                    className="rounded-xl bg-emerald-600 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-700 shadow-xs active:scale-95"
                  >
                    {t('joinPro')}
                  </button>
                  <button
                    id={`claim-seat-con-btn-${index}`}
                    onClick={() => onJoinAsDebater('con')}
                    className="rounded-xl bg-rose-600 py-1 text-[10px] font-bold text-white transition hover:bg-rose-700 shadow-xs active:scale-95"
                  >
                    {t('joinCon')}
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-medium text-gray-400">{t('waitingForDebater')}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
