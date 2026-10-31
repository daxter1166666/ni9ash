import React, { useState } from 'react';
import { X, Sparkles, Flame, Users, Swords, Mic, Check, ShieldAlert, Radio } from 'lucide-react';
import { Stance } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    title: string;
    description: string;
    category: 'tech' | 'philosophy' | 'economy' | 'society' | 'sports' | 'science' | 'general';
    roomType: 'solo' | '1v1' | 'group';
    maxDebaters: number;
    turnDurationSec: number;
    hostStance: Stance;
    tags: string[];
    mode: 'text' | 'voice';
    freeTalk: boolean;
  }) => void;
  isCreating?: boolean;
  voiceOnlyMode?: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  isCreating = false,
  voiceOnlyMode = false,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'text' | 'voice'>(voiceOnlyMode ? 'voice' : 'voice');
  const [freeTalk, setFreeTalk] = useState<boolean>(false);
  const [roomType, setRoomType] = useState<'solo' | '1v1' | 'group'>('1v1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'tech' | 'philosophy' | 'economy' | 'society' | 'sports' | 'science' | 'general'>('tech');
  const [maxDebaters, setMaxDebaters] = useState<number>(2);
  const [turnDurationSec, setTurnDurationSec] = useState<number>(90);
  const [hostStance, setHostStance] = useState<Stance>('pro');
  const [customTags, setCustomTags] = useState<string>('مناظرة_صوتية, حوار');

  if (!isOpen) return null;

  const handleRoomTypeChange = (type: 'solo' | '1v1' | 'group', defaultSeats?: number) => {
    setRoomType(type);
    if (type === 'solo') {
      setMaxDebaters(1);
      setCustomTags('إلقاء_منفرد, أفكار');
    } else if (type === '1v1') {
      setMaxDebaters(2);
      setCustomTags('مناظرة_1v1, حوار');
    } else {
      setMaxDebaters(defaultSeats || 5);
      setCustomTags('نقاش_جماعي, حوار');
    }
  };

  const handleSeatCountChange = (seats: number) => {
    setMaxDebaters(seats);
    if (seats === 1) setRoomType('solo');
    else if (seats === 2) setRoomType('1v1');
    else setRoomType('group');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const tagsArray = customTags
      .split(/[,،]/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);

    onCreateRoom({
      title: title.trim(),
      description: description.trim(),
      category,
      roomType: maxDebaters === 1 ? 'solo' : maxDebaters === 2 ? '1v1' : 'group',
      maxDebaters: Math.max(1, Math.min(5, Number(maxDebaters))),
      turnDurationSec: Number(turnDurationSec),
      hostStance,
      tags: tagsArray.length > 0 ? tagsArray : [roomType === 'solo' ? 'إلقاء_منفرد' : roomType === '1v1' ? 'مناظرة_1v1' : 'نقاش_جماعي', mode === 'voice' ? 'غرفة_صوتية' : 'مناظرة'],
      mode: voiceOnlyMode ? 'voice' : mode,
      freeTalk: mode === 'voice' ? freeTalk : false,
    });
  };

  const categories = [
    { id: 'tech', label: t('catTech') },
    { id: 'economy', label: t('catEconomy') },
    { id: 'society', label: t('catSociety') },
    { id: 'philosophy', label: t('catPhilosophy') },
    { id: 'sports', label: t('catSports') },
    { id: 'science', label: t('catScience') },
    { id: 'general', label: t('catGeneral') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div
        id="create-room-modal-container"
        className="relative my-8 w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900 sm:p-8"
      >
        {/* Close Button */}
        <button
          id="close-create-modal-btn"
          onClick={onClose}
          className="absolute left-6 top-6 rounded-2xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>{t('createModalBadge')}</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-gray-900">
            {t('createModalTitle')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('createModalDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mode Selector: Voice Room vs Text Debate */}
          {!voiceOnlyMode ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                {t('roomCommunicationModeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="select-mode-voice-btn"
                  onClick={() => setMode('voice')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-start transition ${
                    mode === 'voice'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600 text-indigo-950'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t('voiceModeTitle')} 🎙️</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{t('voiceModeDesc')}</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="select-mode-text-btn"
                  onClick={() => setMode('text')}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-start transition ${
                    mode === 'text'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600 text-indigo-950'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700 shrink-0">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t('textModeTitle')} 📝</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{t('textModeDesc')}</div>
                  </div>
                </button>
              </div>

              {/* Free talk toggle when voice mode is selected */}
              {mode === 'voice' && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{t('freeTalkOptionTitle')}</div>
                    <div className="text-[11px] text-gray-500">{t('freeTalkOptionDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={freeTalk}
                      onChange={(e) => setFreeTalk(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Mic className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-950">{t('voiceOnlyActiveTitle')}</div>
                  <div className="text-[11px] text-indigo-700">{t('voiceOnlyActiveDesc')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Format / Seat Type Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              {t('roomModeLabel')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Solo Card */}
              <button
                type="button"
                id="select-solo-mode-btn"
                onClick={() => handleRoomTypeChange('solo')}
                className={`relative flex flex-col p-4 rounded-2xl border text-start transition ${
                  roomType === 'solo'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <Mic className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  {roomType === 'solo' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-gray-900">{t('badgeSolo')}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                  {t('modeSoloDesc')}
                </div>
              </button>

              {/* 1v1 Card */}
              <button
                type="button"
                id="select-1v1-mode-btn"
                onClick={() => handleRoomTypeChange('1v1')}
                className={`relative flex flex-col p-4 rounded-2xl border text-start transition ${
                  roomType === '1v1'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                    <Swords className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  {roomType === '1v1' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-gray-900">{t('badge1v1')}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                  {t('mode1v1Desc')}
                </div>
              </button>

              {/* Group Card */}
              <button
                type="button"
                id="select-group-mode-btn"
                onClick={() => handleRoomTypeChange('group', 5)}
                className={`relative flex flex-col p-4 rounded-2xl border text-start transition ${
                  roomType === 'group'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Users className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  {roomType === 'group' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs text-gray-900">{t('filterGroup')}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                  {t('modeGroupDesc')}
                </div>
              </button>
            </div>
          </div>

          {/* Exact Seat Count Selector (1 to 5) */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-800">{t('seatCapacityLimit')}</span>
              <span className="text-xs font-bold text-indigo-600">
                {maxDebaters === 1 ? t('soloSpeakerSeat') : maxDebaters === 2 ? t('duelSeats') : t('badgeGroupSeats', { count: maxDebaters })}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((seats) => (
                <button
                  key={seats}
                  type="button"
                  onClick={() => handleSeatCountChange(seats)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-bold transition ${
                    maxDebaters === seats
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-extrabold">{seats}</span>
                  <span className="text-[10px] font-normal opacity-90">
                    {seats === 1 ? t('badgeSolo') : seats === 2 ? '1v1' : t('seatsUnit')}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {t('lockNotice', { count: maxDebaters })}
            </p>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('roomTopicLabel')} *
              </label>
              <input
                id="create-room-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('roomTopicPlaceholder')}
                required
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('roomContextLabel')} *
              </label>
              <textarea
                id="create-room-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t('roomContextPlaceholder')}
                required
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs resize-none"
              />
            </div>
          </div>

          {/* Category & Turn Duration & Host Stance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('categoryLabel')}
              </label>
              <select
                id="create-room-category-select"
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('turnTimeLabel')}
              </label>
              <select
                id="create-room-turn-select"
                value={turnDurationSec}
                onChange={(e) => setTurnDurationSec(Number(e.target.value))}
                className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              >
                <option value={45}>45 {t('secondsUnit')}</option>
                <option value={60}>60 {t('secondsUnit')}</option>
                <option value={90}>90 {t('secondsUnit')} ({t('recommendedPreset')})</option>
                <option value={120}>120 {t('secondsUnit')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {t('yourStanceLabel')}
              </label>
              <select
                id="create-room-stance-select"
                value={hostStance}
                onChange={(e: any) => setHostStance(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              >
                <option value="pro">{t('stancePro')} ✓</option>
                <option value="con">{t('stanceCon')} ✕</option>
                <option value="neutral">{t('stanceNeutral')} =</option>
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              id="submit-create-room-btn"
              disabled={isCreating || !title.trim() || !description.trim()}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isCreating ? t('launchingRoom') : t('launchRoomBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
