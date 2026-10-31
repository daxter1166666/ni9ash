import React, { useState, useEffect } from 'react';
import {
  PenTool,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Zap,
  ListPlus,
  ArrowRight,
  BookOpen,
  Send,
  AlertTriangle,
  Clock,
  Flame,
  Scale
} from 'lucide-react';
import { DebaterScratchpad, QuickPoint, Stance } from '../types';
import {
  FALLACY_TEMPLATES,
  getInitialScratchpad,
  saveScratchpad,
  calculateSpeechStats,
  generateSmartRefutationIdeas
} from '../utils/scratchpad';
import { useTranslation } from '../i18n/LanguageContext';

interface DebateScratchpadDrawerProps {
  roomId: string;
  userId: string;
  roomTitle: string;
  userStance: Stance;
  isDebater: boolean;
  isMyTurn: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onTransferDraftToInput: (text: string) => void;
  onSendDraftDirectly?: (text: string) => void;
  onToggleReadyStatus?: (isReady: boolean) => void;
  quotedSnippet?: { text: string; sender: string; timestamp: number } | null;
  onClearQuotedSnippet?: () => void;
}

export const DebateScratchpadDrawer: React.FC<DebateScratchpadDrawerProps> = ({
  roomId,
  userId,
  roomTitle,
  userStance,
  isDebater,
  isMyTurn,
  isOpen,
  onToggleOpen,
  onTransferDraftToInput,
  onSendDraftDirectly,
  onToggleReadyStatus,
  quotedSnippet,
  onClearQuotedSnippet,
}) => {
  const { t, dir } = useTranslation();

  // Scratchpad data
  const [scratchpad, setScratchpad] = useState<DebaterScratchpad>(() =>
    getInitialScratchpad(roomId, userId)
  );

  const [newPointText, setNewPointText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isTransferred, setIsTransferred] = useState(false);
  const [activeSection, setActiveSection] = useState<'points' | 'fallacies' | 'ideas'>('points');
  const [isExpandedFull, setIsExpandedFull] = useState(false);

  // Auto-save whenever scratchpad changes
  useEffect(() => {
    saveScratchpad(roomId, userId, scratchpad);
    if (onToggleReadyStatus) {
      onToggleReadyStatus(scratchpad.isReadyToFire);
    }
  }, [scratchpad, roomId, userId]);

  // Handle incoming quote-to-draft from chat
  useEffect(() => {
    if (quotedSnippet && quotedSnippet.text) {
      const quoteBlock = `\n> اقتباس من "${quotedSnippet.sender}":\n> "${quotedSnippet.text}"\nالرد والتفنيد:\n`;
      setScratchpad((prev) => ({
        ...prev,
        draftText: prev.draftText ? `${prev.draftText}\n${quoteBlock}` : quoteBlock,
        isReadyToFire: true,
      }));

      // Automatically open drawer if it was closed
      if (!isOpen) {
        onToggleOpen();
      }

      if (onClearQuotedSnippet) {
        onClearQuotedSnippet();
      }
    }
  }, [quotedSnippet, isOpen, onToggleOpen, onClearQuotedSnippet]);

  const stats = calculateSpeechStats(scratchpad.draftText);

  const handleUpdateDraft = (text: string) => {
    setScratchpad((prev) => ({
      ...prev,
      draftText: text,
      isReadyToFire: text.trim().length > 10,
    }));
  };

  const handleAddQuickPoint = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPointText.trim()) return;

    const newPoint: QuickPoint = {
      id: 'point-' + Date.now(),
      text: newPointText.trim(),
      isAddressed: false,
    };

    setScratchpad((prev) => ({
      ...prev,
      quickPoints: [newPoint, ...prev.quickPoints],
    }));
    setNewPointText('');
  };

  const handleTogglePointAddressed = (id: string) => {
    setScratchpad((prev) => ({
      ...prev,
      quickPoints: prev.quickPoints.map((p) =>
        p.id === id ? { ...p, isAddressed: !p.isAddressed } : p
      ),
    }));
  };

  const handleDeletePoint = (id: string) => {
    setScratchpad((prev) => ({
      ...prev,
      quickPoints: prev.quickPoints.filter((p) => p.id !== id),
    }));
  };

  const handleAppendPointToDraft = (text: string) => {
    const formatted = `\n• ${text}`;
    handleUpdateDraft(scratchpad.draftText ? `${scratchpad.draftText}\n${formatted}` : formatted);
  };

  const handleInsertFallacy = (prefix: string) => {
    handleUpdateDraft(scratchpad.draftText ? `${scratchpad.draftText}\n\n${prefix}` : prefix);
  };

  const handleTransferToInput = () => {
    if (!scratchpad.draftText.trim()) return;
    onTransferDraftToInput(scratchpad.draftText);
    setIsTransferred(true);
    setTimeout(() => setIsTransferred(false), 2000);
  };

  const handleDirectSend = () => {
    if (!scratchpad.draftText.trim() || !onSendDraftDirectly) return;
    onSendDraftDirectly(scratchpad.draftText);
    // Optionally clear or mark sent
    setScratchpad((prev) => ({
      ...prev,
      draftText: '',
      isReadyToFire: false,
    }));
  };

  const handleCopy = () => {
    if (!scratchpad.draftText.trim()) return;
    navigator.clipboard.writeText(scratchpad.draftText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearDraft = () => {
    if (window.confirm(t('clearDraftConfirm'))) {
      setScratchpad((prev) => ({
        ...prev,
        draftText: '',
        isReadyToFire: false,
      }));
    }
  };

  const handleToggleReady = () => {
    const nextVal = !scratchpad.isReadyToFire;
    setScratchpad((prev) => ({ ...prev, isReadyToFire: nextVal }));
  };

  const smartIdeas = generateSmartRefutationIdeas(roomTitle, userStance === 'pro');

  return (
    <>
      {/* 1. FLOATING QUICK LAUNCH TRIGGER BUTTON (Always visible at corner of arena) */}
      <div className="fixed bottom-20 end-5 z-40 flex flex-col items-end gap-2">
        {/* Glow Notification Badge when it is my turn and I have a drafted response */}
        {isMyTurn && scratchpad.draftText.trim().length > 0 && !isOpen && (
          <div className="animate-bounce flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-lg border border-amber-300">
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>{t('turnArrivalAlert')}</span>
          </div>
        )}

        <button
          id="toggle-scratchpad-btn"
          onClick={onToggleOpen}
          className={`group flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-xl transition-all duration-300 active:scale-95 ${
            isOpen
              ? 'bg-gray-900 text-white border border-gray-700'
              : scratchpad.isReadyToFire || (scratchpad.draftText.trim().length > 0)
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200/50 ring-2 ring-indigo-400/40'
              : 'bg-white text-gray-800 border border-gray-200 hover:border-indigo-300 shadow-md'
          }`}
          title={t('scratchpadTitle')}
        >
          <div className="relative">
            <PenTool className="h-4 w-4" />
            {scratchpad.draftText.trim().length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <span>{t('scratchpadFloatingBtn')}</span>

          {stats.words > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                isOpen
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-indigo-500/30 text-white border border-white/20'
              }`}
            >
              {stats.words} {dir === 'rtl' ? 'كلمة' : 'w'}
            </span>
          )}

          {scratchpad.isReadyToFire && !isOpen && (
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-300">
              <Zap className="h-3 w-3 fill-amber-300" />
            </span>
          )}
        </button>
      </div>

      {/* 2. DOCKABLE / FLOATING SCRATCHPAD DRAWER */}
      {isOpen && (
        <div
          id="scratchpad-drawer-container"
          className={`fixed z-50 transition-all duration-300 ${
            isExpandedFull
              ? 'inset-3 sm:inset-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden'
              : 'bottom-20 end-5 w-[94vw] sm:w-[480px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden ring-1 ring-black/5'
          }`}
          dir={dir}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-indigo-50/40 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <PenTool className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                    {t('scratchpadTitle')}
                  </h3>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {t('draftReadyTag')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 line-clamp-1">
                  {t('scratchpadDesc')}
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpandedFull(!isExpandedFull)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                title={isExpandedFull ? t('minimizeScratchpad') : t('maximizeScratchpad')}
              >
                {isExpandedFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={onToggleOpen}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                title={t('closeScratchpad')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* TURN ARRIVAL BANNER (Prominently alerts when it is the user's turn) */}
          {isMyTurn && (
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-4 py-2.5 text-white shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-white animate-ping"></span>
                <span className="text-xs font-black">
                  {t('turnArrivalAlert')}
                </span>
              </div>
              <button
                onClick={handleTransferToInput}
                className="flex items-center gap-1 rounded-xl bg-white px-3 py-1 text-xs font-bold text-amber-700 shadow-xs hover:bg-amber-50 active:scale-95 transition"
              >
                <span>{t('insertIntoTurnBtn')}</span>
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* Live Stats & Readiness Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50/80 p-2.5 border border-gray-100 text-xs">
              <div className="flex items-center gap-3 text-gray-600">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  <strong>{stats.words}</strong> {dir === 'rtl' ? 'كلمة' : 'words'} (~{stats.estimatedSeconds}s)
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] text-gray-500">
                  {stats.characters} {dir === 'rtl' ? 'حرف' : 'chars'}
                </span>
              </div>

              {/* Ready to speak switch */}
              <button
                type="button"
                onClick={handleToggleReady}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition shadow-xs ${
                  scratchpad.isReadyToFire
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
                title={t('readyToSpeakHint')}
              >
                <Zap className={`h-3 w-3 ${scratchpad.isReadyToFire ? 'fill-white' : 'text-gray-400'}`} />
                <span>{t('readyToSpeakBadge')}</span>
              </button>
            </div>

            {/* Main Draft Textarea */}
            <div className="relative">
              <textarea
                id="scratchpad-draft-textarea"
                rows={isExpandedFull ? 9 : 5}
                value={scratchpad.draftText}
                onChange={(e) => handleUpdateDraft(e.target.value)}
                placeholder={t('scratchpadPlaceholder')}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none leading-relaxed shadow-inner"
              />

              {/* Action Ribbon below Textarea */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTransferToInput}
                    disabled={!scratchpad.draftText.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-40 transition active:scale-95"
                    title={t('insertIntoTurnBtn')}
                  >
                    {isTransferred ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    <span>{isTransferred ? t('insertedSuccess') : t('insertIntoTurnBtn')}</span>
                  </button>

                  {/* Direct Fire if it is my turn */}
                  {isMyTurn && onSendDraftDirectly && (
                    <button
                      type="button"
                      onClick={handleDirectSend}
                      disabled={!scratchpad.draftText.trim()}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition active:scale-95"
                      title={t('sendDraftDirectlyBtn')}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{t('sendDraftDirectlyBtn')}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!scratchpad.draftText.trim()}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition"
                    title={t('copyDraftBtn')}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearDraft}
                    disabled={!scratchpad.draftText.trim()}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition"
                    title={t('clearDraftBtn')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Toolkit Tabs: Points Checklist / Fallacies / AI Ideas */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 space-y-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('points')}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    activeSection === 'points'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ListPlus className="h-3 w-3" />
                  <span>{t('quickPointsTitle')}</span>
                  {scratchpad.quickPoints.length > 0 && (
                    <span className="rounded-full bg-white/30 px-1.5 text-[10px]">
                      {scratchpad.quickPoints.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('fallacies')}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    activeSection === 'fallacies'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t('fallaciesTitle')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('ideas')}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition ${
                    activeSection === 'ideas'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  <span>{t('smartSparksTitle')}</span>
                </button>
              </div>

              {/* TAB 1: QUICK POINTS CHECKLIST */}
              {activeSection === 'points' && (
                <div className="space-y-2.5">
                  <form onSubmit={handleAddQuickPoint} className="flex gap-1.5">
                    <input
                      type="text"
                      value={newPointText}
                      onChange={(e) => setNewPointText(e.target.value)}
                      placeholder={t('addPointPlaceholder')}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newPointText.trim()}
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
                    >
                      {t('addPointBtn')}
                    </button>
                  </form>

                  {scratchpad.quickPoints.length === 0 ? (
                    <p className="text-[11px] text-gray-400 text-center py-2 italic">
                      {t('noPointsYetHint')}
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {scratchpad.quickPoints.map((point) => (
                        <div
                          key={point.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-2 text-xs transition ${
                            point.isAddressed
                              ? 'border-gray-100 bg-gray-100/70 text-gray-400 line-through'
                              : 'border-gray-200 bg-white text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={point.isAddressed}
                              onChange={() => handleTogglePointAddressed(point.id)}
                              className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="truncate">{point.text}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAppendPointToDraft(point.text)}
                              className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
                              title={t('insertPointIntoDraft')}
                            >
                              + {t('insertPointShort')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePoint(point.id)}
                              className="p-1 text-gray-400 hover:text-rose-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FALLACY RADAR CHIPS */}
              {activeSection === 'fallacies' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500">
                    {t('fallacyRadarHint')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {FALLACY_TEMPLATES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleInsertFallacy(dir === 'rtl' ? item.prefix : item.prefixEn)}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-start text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition shadow-xs active:scale-95"
                      >
                        <span className="text-sm">{item.emoji}</span>
                        <span className="truncate">
                          {dir === 'rtl' ? item.title : item.titleEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SMART ARGUMENT SPARKS */}
              {activeSection === 'ideas' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500">
                    {t('smartSparksDesc')}
                  </p>
                  <div className="space-y-1.5">
                    {smartIdeas.map((idea, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleAppendPointToDraft(idea)}
                        className="group flex cursor-pointer items-start gap-2 rounded-xl border border-purple-100 bg-white p-2.5 text-xs text-gray-700 hover:border-purple-300 hover:bg-purple-50/40 transition shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span className="flex-1 leading-relaxed text-[11px]">{idea}</span>
                        <span className="text-[10px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                          + {t('insertPointShort')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
