import React, { useState } from 'react';
import {
  Send,
  CornerDownRight,
  BookOpen,
  Sparkles,
  HelpCircle,
  X,
  FastForward,
  CheckCircle2,
  Flame,
  Award,
  Lightbulb,
  Scale,
  Zap,
  Lock
} from 'lucide-react';
import { ArgumentType, DebateMessage, Stance, UserProfile } from '../types';
import { playReactionPop, playApplauseChime } from '../utils/soundEffects';
import { useTranslation } from '../i18n/LanguageContext';

interface AudienceActionBarProps {
  isDebater: boolean;
  userStance: Stance;
  currentUser: UserProfile;
  replyingTo: DebateMessage | null;
  onClearReply: () => void;
  onSendMessage: (data: {
    content: string;
    type: ArgumentType;
    stance: Stance;
    citedSource?: string;
  }) => void;
  onSendAudienceMessage: (content: string) => void;
  onOpenQuestionModal: () => void;
  onSendReaction: (type: 'fire' | 'applause' | 'light' | 'balance' | 'mindblown') => void;
  onRequestJoinStage: (stance: Stance) => void;
  isStageLocked: boolean;
  vacantSeatsCount: number;
  onGenerateAIInspiration?: () => void;
  isGeneratingAI?: boolean;
  isMyTurn?: boolean;
  onPassTurn?: () => void;
}

export const AudienceActionBar: React.FC<AudienceActionBarProps> = ({
  isDebater,
  userStance,
  currentUser,
  replyingTo,
  onClearReply,
  onSendMessage,
  onSendAudienceMessage,
  onOpenQuestionModal,
  onSendReaction,
  onRequestJoinStage,
  isStageLocked,
  vacantSeatsCount,
  onGenerateAIInspiration,
  isGeneratingAI,
  isMyTurn,
  onPassTurn,
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [argType, setArgType] = useState<ArgumentType>('argument');
  const [stance, setStance] = useState<Stance>(userStance || 'pro');
  const [citedSource, setCitedSource] = useState('');
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [audienceText, setAudienceText] = useState('');

  const handleDebaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSendMessage({
      content: content.trim(),
      type: replyingTo ? 'rebuttal' : argType,
      stance,
      citedSource: showSourceInput ? citedSource.trim() : undefined,
    });

    setContent('');
    setCitedSource('');
    setShowSourceInput(false);
    onClearReply();
  };

  const handleAudienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audienceText.trim()) return;
    onSendAudienceMessage(audienceText.trim());
    setAudienceText('');
  };

  const handleReactionClick = (type: 'fire' | 'applause' | 'light' | 'balance' | 'mindblown') => {
    if (type === 'applause') {
      playApplauseChime();
    } else {
      playReactionPop();
    }
    onSendReaction(type);
  };

  // 1. DEBATER INTERFACE
  if (isDebater) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        {/* If it's the speaker's active turn, show a prominent pass-mic banner */}
        {isMyTurn && onPassTurn && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <span className="font-bold">{t('speakerTurnActiveNotice')}</span>
            </div>
            <button
              type="button"
              id="action-bar-pass-mic-btn"
              onClick={onPassTurn}
              className="flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-95 whitespace-nowrap"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>{t('endMyTurnBtn')}</span>
            </button>
          </div>
        )}

        {/* If Replying/Rebutting */}
        {replyingTo && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 p-2.5 text-xs text-rose-700">
            <div className="flex items-center gap-2">
              <CornerDownRight className="h-4 w-4 text-rose-600" />
              <span>
                {t('rebuttingTo')}: <strong className="text-gray-900">{replyingTo.senderName}</strong>
              </span>
              <span className="italic opacity-80 line-clamp-1">"{replyingTo.content.substring(0, 50)}..."</span>
            </div>
            <button
              onClick={onClearReply}
              className="rounded-full p-1 text-rose-600 hover:bg-rose-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleDebaterSubmit} className="space-y-3">
          {/* Controls Bar: Type, Stance, Source, AI Inspiration */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500">{t('speechTypeLabel')}:</span>
              <button
                type="button"
                onClick={() => setArgType('argument')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  argType === 'argument'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('argMain')}
              </button>
              <button
                type="button"
                onClick={() => setArgType('rebuttal')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  argType === 'rebuttal'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('argRebuttal')}
              </button>
              <button
                type="button"
                onClick={() => setArgType('poi')}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  argType === 'poi'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t('argPointOfOrder')}
              </button>
              <button
                type="button"
                onClick={() => setShowSourceInput(!showSourceInput)}
                className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold transition ${
                  showSourceInput
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BookOpen className="h-3 w-3" />
                <span>{t('attachSourceBtn')}</span>
              </button>
            </div>

            {/* AI Argument Inspiration Button */}
            {onGenerateAIInspiration && (
              <button
                id="ai-inspiration-btn"
                type="button"
                onClick={onGenerateAIInspiration}
                disabled={isGeneratingAI}
                className="flex items-center gap-1.5 rounded-2xl border border-purple-100 bg-purple-50 px-3.5 py-1 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 shadow-xs"
                title={t('aiInspireBtn')}
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>{isGeneratingAI ? t('aiThinking') : t('aiInspireBtn')}</span>
              </button>
            )}
          </div>

          {/* Optional Cited Source Field */}
          {showSourceInput && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <input
                id="source-input"
                type="text"
                value={citedSource}
                onChange={(e) => setCitedSource(e.target.value)}
                placeholder={t('sourcePlaceholder')}
                className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          )}

          {/* Textarea & Submit */}
          <div className="relative">
            <textarea
              id="debater-argument-textarea"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('argumentPlaceholder')}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none leading-relaxed shadow-xs"
            />

            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">
                {t('speakingAsLabel', { name: currentUser.name })}
              </span>
              <button
                id="send-argument-btn"
                type="submit"
                disabled={!content.trim()}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-40 transition active:scale-95"
              >
                <span>{t('submitArgumentBtn')}</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // 2. AUDIENCE / SPECTATOR INTERFACE
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col gap-3.5">
        {/* Top: Status Banner & Claim Seat Option */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            <span className="text-xs font-semibold text-gray-700">{t('audienceLiveNotice')}</span>
          </div>

          {/* If there are vacant seats on stage */}
          {!isStageLocked && vacantSeatsCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-600">
                {t('vacantSeatsNotice', { count: vacantSeatsCount })}:
              </span>
              <button
                id="audience-claim-pro-btn"
                onClick={() => onRequestJoinStage('pro')}
                className="rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition shadow-xs active:scale-95"
              >
                {t('joinPro')}
              </button>
              <button
                id="audience-claim-con-btn"
                onClick={() => onRequestJoinStage('con')}
                className="rounded-xl bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition shadow-xs active:scale-95"
              >
                {t('joinCon')}
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-[10px] font-semibold text-gray-500">
              <Lock className="h-3 w-3 text-gray-400" />
              <span>{t('stageLockedAudienceOnly')}</span>
            </span>
          )}
        </div>

        {/* Middle: Live Reaction Buttons Bar */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-2.5">
          <span className="hidden sm:inline text-xs font-bold text-gray-500">{t('audienceReactionsTitle')}:</span>
          <div className="flex flex-1 items-center justify-around gap-1 sm:justify-start sm:gap-2">
            <button
              id="reaction-fire-btn"
              onClick={() => handleReactionClick('fire')}
              className="flex items-center gap-1.5 rounded-2xl border border-amber-100 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:bg-amber-50 hover:shadow-xs transition active:scale-95 shadow-2xs"
            >
              <Flame className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              <span className="hidden md:inline text-[11px] font-bold">{t('reactFire')}</span>
            </button>

            <button
              id="reaction-applause-btn"
              onClick={() => handleReactionClick('applause')}
              className="flex items-center gap-1.5 rounded-2xl border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-xs transition active:scale-95 shadow-2xs"
            >
              <Award className="h-4 w-4 text-indigo-600" />
              <span className="hidden md:inline text-[11px] font-bold">{t('reactApplause')}</span>
            </button>

            <button
              id="reaction-light-btn"
              onClick={() => handleReactionClick('light')}
              className="flex items-center gap-1.5 rounded-2xl border border-yellow-200 bg-white px-3 py-1.5 text-xs font-semibold text-yellow-800 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-xs transition active:scale-95 shadow-2xs"
            >
              <Lightbulb className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />
              <span className="hidden md:inline text-[11px] font-bold">{t('reactLight')}</span>
            </button>

            <button
              id="reaction-balance-btn"
              onClick={() => handleReactionClick('balance')}
              className="flex items-center gap-1.5 rounded-2xl border border-purple-100 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 hover:border-purple-300 hover:bg-purple-50 hover:shadow-xs transition active:scale-95 shadow-2xs"
            >
              <Scale className="h-4 w-4 text-purple-600" />
              <span className="hidden md:inline text-[11px] font-bold">{t('reactLogic')}</span>
            </button>

            <button
              id="reaction-mindblown-btn"
              onClick={() => handleReactionClick('mindblown')}
              className="flex items-center gap-1.5 rounded-2xl border border-rose-100 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:shadow-xs transition active:scale-95 shadow-2xs"
            >
              <Zap className="h-4 w-4 text-rose-500 fill-rose-500/20" />
              <span className="hidden md:inline text-[11px] font-bold">{t('reactMindblown')}</span>
            </button>
          </div>

          {/* Ask Debaters a Question Button */}
          <button
            id="open-ask-question-btn"
            onClick={onOpenQuestionModal}
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-100 active:scale-95 whitespace-nowrap"
          >
            <HelpCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{t('askQuestionBtn')}</span>
          </button>
        </div>

        {/* Bottom: Quick Spectator Chatter Input */}
        <form onSubmit={handleAudienceSubmit} className="flex items-center gap-2">
          <input
            id="audience-chat-input"
            type="text"
            value={audienceText}
            onChange={(e) => setAudienceText(e.target.value)}
            placeholder={t('spectatorChatPlaceholder')}
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none shadow-xs"
          />
          <button
            id="send-audience-comment-btn"
            type="submit"
            disabled={!audienceText.trim()}
            className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 transition active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('sendCommentBtn')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
