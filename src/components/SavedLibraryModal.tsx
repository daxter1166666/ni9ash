import React, { useState } from 'react';
import {
  Bookmark,
  X,
  BookOpen,
  Download,
  Trash2,
  Share2,
  Calendar,
  Users,
  Scale,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Search,
  ExternalLink,
  Sparkles,
  FileText
} from 'lucide-react';
import { SavedDebate } from '../types';
import { generateDebateMarkdown, downloadTextFile } from '../utils/savedLibrary';
import { useTranslation } from '../i18n/LanguageContext';

interface SavedLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedDebates: SavedDebate[];
  onRemoveDebate: (roomId: string) => void;
  onOpenLiveRoom?: (roomId: string) => void;
}

export const SavedLibraryModal: React.FC<SavedLibraryModalProps> = ({
  isOpen,
  onClose,
  savedDebates,
  onRemoveDebate,
  onOpenLiveRoom,
}) => {
  const { t, dir } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readingDebate, setReadingDebate] = useState<SavedDebate | null>(null);
  const [activeReaderTab, setActiveReaderTab] = useState<'transcript' | 'verdict' | 'votes'>('transcript');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredDebates = savedDebates.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleExport = (debate: SavedDebate) => {
    const md = generateDebateMarkdown(debate);
    const cleanName = debate.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').substring(0, 30);
    downloadTextFile(md, `munazara_${cleanName}.md`);
  };

  const handleShare = (debate: SavedDebate) => {
    const url = `${window.location.origin}/?room=${debate.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(debate.roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] max-h-[850px] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-base sm:text-lg font-bold text-gray-900">
                  {t('savedLibraryTitle')}
                </h3>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  {savedDebates.length}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {t('savedLibraryDesc')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: List view OR Reader View */}
        {readingDebate ? (
          /* Reader View */
          <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/40">
            {/* Reader Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-6 py-3.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReadingDebate(null)}
                  className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                >
                  {dir === 'rtl' ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                  <span>{t('backToLobby')}</span>
                </button>
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 max-w-md">
                  {readingDebate.title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(readingDebate)}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                  title={t('exportTranscript')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('exportTranscript')}</span>
                </button>

                {onOpenLiveRoom && (
                  <button
                    onClick={() => {
                      onOpenLiveRoom(readingDebate.roomId);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{t('enterAsAudience')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reader Sub-Tabs */}
            <div className="flex items-center border-b border-gray-100 bg-white px-6 gap-4">
              <button
                onClick={() => setActiveReaderTab('transcript')}
                className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-bold transition ${
                  activeReaderTab === 'transcript'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{t('transcriptTitle')} ({readingDebate.messages.length})</span>
              </button>

              <button
                onClick={() => setActiveReaderTab('verdict')}
                className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-bold transition ${
                  activeReaderTab === 'verdict'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>{t('finalVerdict')}</span>
              </button>

              <button
                onClick={() => setActiveReaderTab('votes')}
                className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-bold transition ${
                  activeReaderTab === 'votes'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{t('voteOutcome')}</span>
              </button>
            </div>

            {/* Reader Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Context Header Card */}
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700">
                    {readingDebate.category}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(readingDebate.savedAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="font-heading text-lg font-bold text-gray-900">{readingDebate.title}</h2>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{readingDebate.description}</p>

                {/* Debaters On Stage List */}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <span className="text-[11px] font-bold text-gray-400 block mb-2">{t('debatersOnStageTitle')}:</span>
                  <div className="flex flex-wrap gap-2">
                    {readingDebate.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs"
                      >
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="h-6 w-6 rounded-full object-cover border"
                        />
                        <span className="font-bold text-gray-900">{p.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                            p.stance === 'pro'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.stance === 'con'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {p.stance === 'pro' ? t('stancePro') : p.stance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab 1: Full Transcript */}
              {activeReaderTab === 'transcript' && (
                <div className="space-y-4">
                  {readingDebate.messages.map((msg, index) => {
                    const isSystem = msg.type === 'system';
                    const isRuling = msg.type === 'ruling';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center text-center">
                          <span className="rounded-full bg-gray-100 border border-gray-200 px-4 py-1 text-xs text-gray-500">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={msg.senderAvatar}
                              alt={msg.senderName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900">{msg.senderName}</span>
                                <span
                                  className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                                    msg.senderStance === 'pro'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : msg.senderStance === 'con'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {msg.senderStance === 'pro' ? t('stancePro') : msg.senderStance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            {msg.type === 'rebuttal' ? t('argRebuttal') : msg.type === 'poi' ? t('argPointOfOrder') : t('argMain')}
                          </span>
                        </div>

                        {msg.replyTo && (
                          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 italic">
                            {t('rebuttingTo')} {msg.replyTo.senderName}: "{msg.replyTo.snippet}"
                          </div>
                        )}

                        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>

                        {msg.citedSource && (
                          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs text-emerald-700">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="font-bold">{t('attachSourceBtn')}:</span>
                            <span>{msg.citedSource}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: AI Verdict */}
              {activeReaderTab === 'verdict' && (
                <div className="space-y-4">
                  {readingDebate.aiRefereeVerdict ? (
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-purple-100 bg-purple-50/60 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                          <Scale className="h-5 w-5 text-purple-600" />
                          <span>{t('aiRefereeTitle')}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {readingDebate.aiRefereeVerdict.summary}
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="rounded-2xl bg-white p-3 border border-purple-100">
                            <span className="text-xs font-bold text-emerald-700 block">{t('proScoreLabel')}</span>
                            <span className="text-xl font-black text-emerald-600">{readingDebate.aiRefereeVerdict.proScore}%</span>
                          </div>
                          <div className="rounded-2xl bg-white p-3 border border-purple-100">
                            <span className="text-xs font-bold text-rose-700 block">{t('conScoreLabel')}</span>
                            <span className="text-xl font-black text-rose-600">{readingDebate.aiRefereeVerdict.conScore}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Fallacies */}
                      {readingDebate.aiRefereeVerdict.detectedFallacies?.length > 0 && (
                        <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 space-y-2">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span>{t('fallaciesDetected')}</span>
                          </div>
                          {readingDebate.aiRefereeVerdict.detectedFallacies.map((fal, i) => (
                            <div key={i} className="rounded-2xl bg-white p-3 border border-amber-100 text-xs">
                              <span className="font-bold text-amber-900">{fal.debaterName}: </span>
                              <span className="font-semibold text-gray-800">{fal.fallacyType}</span>
                              <p className="text-[11px] text-gray-500 mt-1">{fal.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center">
                      <Scale className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-bold">{t('noQuestionsYet')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Votes Outcome */}
              {activeReaderTab === 'votes' && (
                <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
                  <h3 className="font-bold text-sm text-gray-900">{t('liveSentimentTitle')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                      <span className="text-xs font-bold text-emerald-700 block">{t('stancePro')}</span>
                      <span className="text-2xl font-black text-emerald-600 mt-1 block">{readingDebate.proVotes}</span>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-center">
                      <span className="text-xs font-bold text-rose-700 block">{t('stanceCon')}</span>
                      <span className="text-2xl font-black text-rose-600 mt-1 block">{readingDebate.conVotes}</span>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                      <span className="text-xs font-bold text-gray-700 block">{t('stanceNeutral')}</span>
                      <span className="text-2xl font-black text-gray-600 mt-1 block">{readingDebate.neutralVotes}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List of Saved Debates */
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search and Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white px-6 py-3.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className={`w-full rounded-2xl border border-gray-200 bg-gray-50/70 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none ${
                    dir === 'rtl' ? 'pr-9 pl-4' : 'pl-9 pr-4'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none"
                >
                  <option value="all">{t('catAll')}</option>
                  <option value="tech">{t('catTech')}</option>
                  <option value="philosophy">{t('catPhilosophy')}</option>
                  <option value="economy">{t('catEconomy')}</option>
                  <option value="society">{t('catSociety')}</option>
                  <option value="general">{t('catGeneral')}</option>
                </select>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredDebates.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
                    <Bookmark className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">{t('noSavedDebates')}</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {t('saveDebateHint')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredDebates.map((debate) => {
                    const totalVotes = debate.proVotes + debate.conVotes + debate.neutralVotes;
                    const proPct = totalVotes > 0 ? Math.round((debate.proVotes / totalVotes) * 100) : 50;

                    return (
                      <div
                        key={debate.id}
                        className="group flex flex-col justify-between rounded-3xl border border-gray-100 bg-white p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                              {debate.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" />
                                {new Date(debate.savedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              <button
                                onClick={() => onRemoveDebate(debate.roomId)}
                                className="text-gray-300 hover:text-rose-600 transition p-1"
                                title={t('removeFromLibrary')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Desc */}
                          <div>
                            <h4 className="font-heading text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition line-clamp-2">
                              {debate.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {debate.description}
                            </p>
                          </div>

                          {/* Debaters Preview */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs text-gray-500">
                            <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                              {debate.participants.slice(0, 4).map((p) => (
                                <img
                                  key={p.id}
                                  src={p.avatar}
                                  alt={p.name}
                                  className="h-6 w-6 rounded-full border-2 border-white object-cover shadow-2xs"
                                  title={p.name}
                                />
                              ))}
                              {debate.participants.length > 4 && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-600 border-2 border-white">
                                  +{debate.participants.length - 4}
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-gray-400 font-medium">
                              {debate.messages.length} {t('messagesLabel')}
                            </span>
                          </div>
                        </div>

                        {/* Actions Bottom Bar */}
                        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                          <button
                            onClick={() => setReadingDebate(debate)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs active:scale-95"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{t('readTranscript')}</span>
                          </button>

                          <button
                            onClick={() => handleExport(debate)}
                            className="rounded-2xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition shadow-2xs"
                            title={t('exportTranscript')}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleShare(debate)}
                            className="rounded-2xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition shadow-2xs"
                            title={t('share')}
                          >
                            {copiedId === debate.roomId ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Share2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
