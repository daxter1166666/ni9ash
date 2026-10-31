import React from 'react';
import { Scale, Sparkles, ThumbsUp, ThumbsDown, HelpCircle, Users, MessageSquare, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { DebateRoom, Stance, UserProfile } from '../types';
import confetti from 'canvas-confetti';
import { useTranslation } from '../i18n/LanguageContext';

interface DebateSidebarProps {
  room: DebateRoom;
  currentUser: UserProfile;
  activeTab: 'referee' | 'vote' | 'questions' | 'audienceChat' | 'participants';
  onTabChange: (tab: 'referee' | 'vote' | 'questions' | 'audienceChat' | 'participants') => void;
  onVoteStance: (stance: Stance) => void;
  onUpvoteQuestion: (qId: string) => void;
  onOpenQuestionModal: () => void;
  onRequestAIReferee: () => void;
  isAnalyzingAI: boolean;
}

export const DebateSidebar: React.FC<DebateSidebarProps> = ({
  room,
  currentUser,
  activeTab,
  onTabChange,
  onVoteStance,
  onUpvoteQuestion,
  onOpenQuestionModal,
  onRequestAIReferee,
  isAnalyzingAI,
}) => {
  const { t } = useTranslation();
  const totalVotes = room.proVotes + room.conVotes + room.neutralVotes;
  const proPct = totalVotes > 0 ? Math.round((room.proVotes / totalVotes) * 100) : 50;
  const conPct = totalVotes > 0 ? Math.round((room.conVotes / totalVotes) * 100) : 50;

  const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
  const userVote = room.votedUserIds[currentUser.id];

  const handleVoteClick = (stance: Stance) => {
    onVoteStance(stance);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white shadow-xs">
      {/* Tab Navigation Strip */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-2 overflow-x-auto rounded-t-3xl">
        <button
          id="tab-referee-btn"
          onClick={() => onTabChange('referee')}
          className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'referee'
              ? 'bg-purple-600 text-white shadow-xs font-bold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>{t('tabAiReferee')}</span>
        </button>

        <button
          id="tab-vote-btn"
          onClick={() => onTabChange('vote')}
          className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'vote'
              ? 'bg-indigo-600 text-white shadow-xs font-bold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>{t('tabVote')}</span>
        </button>

        <button
          id="tab-questions-btn"
          onClick={() => onTabChange('questions')}
          className={`flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-indigo-600 text-white shadow-xs font-bold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>{t('tabQuestions')} ({room.audienceQuestions.length})</span>
        </button>

        <button
          id="tab-chat-btn"
          onClick={() => onTabChange('audienceChat')}
          className={`flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'audienceChat'
              ? 'bg-emerald-600 text-white shadow-xs font-bold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{t('tabAudienceChat')}</span>
        </button>

        <button
          id="tab-participants-btn"
          onClick={() => onTabChange('participants')}
          className={`flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
            activeTab === 'participants'
              ? 'bg-gray-800 text-white shadow-xs font-bold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>{t('tabParticipants')}</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. AI REFEREE TAB */}
        {activeTab === 'referee' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-xs">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{t('aiRefereeTitle')}</h4>
                  <p className="text-[10px] text-gray-400">{t('aiRefereeDesc')}</p>
                </div>
              </div>

              <button
                id="trigger-ai-referee-btn"
                onClick={onRequestAIReferee}
                disabled={isAnalyzingAI}
                className="flex items-center gap-1 rounded-2xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-xs active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingAI ? t('aiAnalyzing') : t('aiAnalyzeBtn')}</span>
              </button>
            </div>

            {room.aiRefereeVerdict ? (
              <div className="space-y-3.5">
                {/* Score Comparison Bar */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-emerald-600">{t('proScoreLabel')}: {room.aiRefereeVerdict.proScore}%</span>
                    <span className="text-purple-600 font-mono text-[11px]">
                      {t('recommendedWinner')}: {room.aiRefereeVerdict.recommendedWinner}
                    </span>
                    <span className="text-rose-600">{t('conScoreLabel')}: {room.aiRefereeVerdict.conScore}%</span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${room.aiRefereeVerdict.proScore}%` }}
                    />
                    <div
                      className="bg-rose-500 transition-all duration-500"
                      style={{ width: `${room.aiRefereeVerdict.conScore}%` }}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                  <span className="text-[11px] font-bold text-gray-700">{t('verdictSummaryTitle')}</span>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    {room.aiRefereeVerdict.summary}
                  </p>
                </div>

                {/* Fallacies Detected Section */}
                {room.aiRefereeVerdict.detectedFallacies && room.aiRefereeVerdict.detectedFallacies.length > 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>{t('fallaciesDetected')}</span>
                    </div>
                    <div className="space-y-2">
                      {room.aiRefereeVerdict.detectedFallacies.map((fal, i) => (
                        <div key={i} className="rounded-xl bg-white p-2.5 text-xs border border-amber-100 shadow-xs">
                          <div className="font-bold text-amber-900">
                            {fal.debaterName}: <span className="text-gray-700 font-normal">{fal.fallacyType}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{fal.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Points Comparison */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <span className="text-[11px] font-bold text-emerald-800 block mb-1">{t('proKeyPoints')}</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-700">
                      {room.aiRefereeVerdict.keyPointsPro.map((pt, idx) => (
                        <li key={idx} className="line-clamp-2">{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                    <span className="text-[11px] font-bold text-rose-800 block mb-1">{t('conKeyPoints')}</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-700">
                      {room.aiRefereeVerdict.keyPointsCon.map((pt, idx) => (
                        <li key={idx} className="line-clamp-2">{pt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                <Sparkles className="h-8 w-8 text-purple-400 mb-2 animate-pulse" />
                <p className="text-xs text-gray-700 font-bold">{t('clickAnalyzePrompt')}</p>
                <p className="text-[11px] text-gray-400 mt-1">{t('aiRefereeDesc')}</p>
              </div>
            )}
          </div>
        )}

        {/* 2. AUDIENCE LIVE VOTE TAB */}
        {activeTab === 'vote' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <h4 className="text-xs font-bold text-gray-900 mb-1">{t('voteTitle')}</h4>
              <p className="text-xs text-gray-500">
                {t('voteDesc')}
              </p>

              {/* Progress Visualizer */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-600">{t('proScoreLabel')} ({proPct}%)</span>
                  <span className="text-gray-400 font-normal">{totalVotes} {t('votesLabel')}</span>
                  <span className="text-rose-600">{t('conScoreLabel')} ({conPct}%)</span>
                </div>

                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="bg-emerald-500 rounded-r-full transition-all duration-500"
                    style={{ width: `${proPct}%` }}
                  />
                  <div
                    className="bg-rose-500 rounded-l-full transition-all duration-500"
                    style={{ width: `${conPct}%` }}
                  />
                </div>
              </div>

              {/* Voting Action Buttons */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  id="vote-pro-btn"
                  onClick={() => handleVoteClick('pro')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 font-bold transition active:scale-95 shadow-2xs ${
                    userVote === 'pro'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <ThumbsUp className={`h-5 w-5 ${userVote === 'pro' ? 'text-emerald-600 fill-emerald-600/20' : 'text-emerald-600'}`} />
                  <span className="text-xs mt-1.5">{t('voteProBtn')}</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">{room.proVotes} {t('votesLabel')}</span>
                </button>

                <button
                  id="vote-con-btn"
                  onClick={() => handleVoteClick('con')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-3 font-bold transition active:scale-95 shadow-2xs ${
                    userVote === 'con'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:bg-rose-50/40'
                  }`}
                >
                  <ThumbsDown className={`h-5 w-5 ${userVote === 'con' ? 'text-rose-600 fill-rose-600/20' : 'text-rose-600'}`} />
                  <span className="text-xs mt-1.5">{t('voteConBtn')}</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">{room.conVotes} {t('votesLabel')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. AUDIENCE QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">{t('audienceQuestionsTitle')}</span>
              <button
                id="ask-question-tab-btn"
                onClick={onOpenQuestionModal}
                className="rounded-2xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs active:scale-95"
              >
                + {t('askQuestionBtn')}
              </button>
            </div>

            {room.audienceQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                <HelpCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">{t('noQuestionsYet')}</p>
                <button
                  onClick={onOpenQuestionModal}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {t('beFirstToAsk')}
                </button>
              </div>
            ) : (
              room.audienceQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={q.senderAvatar}
                        alt={q.senderName}
                        referrerPolicy="no-referrer"
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <span className="font-bold text-gray-800">{q.senderName}</span>
                    </div>
                    <button
                      id={`upvote-q-${q.id}`}
                      onClick={() => onUpvoteQuestion(q.id)}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-0.5 text-[11px] font-bold transition active:scale-95 ${
                        q.votedBy.includes(currentUser.id)
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 shadow-xs'
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{q.votes}</span>
                    </button>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{q.question}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. AUDIENCE SIDE CHAT TAB */}
        {activeTab === 'audienceChat' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-500 block mb-2">
              {t('audienceSideChatDesc')}
            </span>
            {room.audienceMessages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                {t('noAudienceMessages')}
              </p>
            ) : (
              room.audienceMessages.map((msg) => (
                <div key={msg.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-2.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        referrerPolicy="no-referrer"
                        className="h-4 w-4 rounded-full object-cover"
                      />
                      <span>{msg.senderName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-700">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. PARTICIPANTS TAB */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 block mb-2">
                {t('debatersOnStageTitle', { current: debaters.length, max: room.maxDebaters })}
              </span>
              <div className="space-y-2">
                {debaters.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={d.avatar}
                        alt={d.name}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900">{d.name}</div>
                        <div className="text-[10px] text-gray-400">{d.handle}</div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.stance === 'pro'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : d.stance === 'con'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}
                    >
                      {d.stance === 'pro' ? t('stancePro') : d.stance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-500 block mb-2">
                {t('spectatorsCountLabel', { count: room.spectatorsCount })}
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {room.spectators.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl p-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <img
                      src={s.avatar}
                      alt={s.name}
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
