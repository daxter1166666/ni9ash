import React, { useState } from 'react';
import { Search, Flame, Users, Sparkles, Filter, Plus, ShieldCheck, MessageSquare, Lock, Unlock, Swords, Mic } from 'lucide-react';
import { RoomCard } from './RoomCard';
import { useTranslation } from '../i18n/LanguageContext';

interface LobbyViewProps {
  rooms: any[];
  onJoinRoom: (roomId: string, role: 'debater' | 'audience') => void;
  onOpenCreateModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenAdminVoice?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  rooms,
  onJoinRoom,
  onOpenCreateModal,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenAdminVoice,
}) => {
  const { t } = useTranslation();
  const [filterMode, setFilterMode] = useState<'all' | 'voice' | 'text'>('all');
  const [filterType, setFilterType] = useState<'all' | 'solo' | '1v1' | 'group'>('all');
  const [filterSeats, setFilterSeats] = useState<number | 'all'>('all');
  const [filterLockStatus, setFilterLockStatus] = useState<'all' | 'open' | 'locked'>('all');

  const categories = [
    { id: 'all', label: t('catAll') },
    { id: 'tech', label: t('catTech') },
    { id: 'economy', label: t('catEconomy') },
    { id: 'society', label: t('catSociety') },
    { id: 'philosophy', label: t('catPhilosophy') },
    { id: 'sports', label: t('catSports') },
    { id: 'science', label: t('catScience') },
    { id: 'general', label: t('catGeneral') },
  ];

  // Filter logic
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;

    const matchesVoiceMode =
      filterMode === 'all' ||
      (filterMode === 'voice' && r.mode === 'voice') ||
      (filterMode === 'text' && r.mode !== 'voice');

    const isSolo = r.maxDebaters === 1 || r.roomType === 'solo';
    const is1v1 = (r.maxDebaters === 2 || r.roomType === '1v1') && !isSolo;
    const isGroup = r.maxDebaters >= 3 || r.roomType === 'group';

    const matchesType =
      filterType === 'all' ||
      (filterType === 'solo' && isSolo) ||
      (filterType === '1v1' && is1v1) ||
      (filterType === 'group' && isGroup);

    const matchesExactSeats =
      filterSeats === 'all' || r.maxDebaters === filterSeats;

    const isFull = r.currentDebatersCount >= r.maxDebaters;
    const matchesLock =
      filterLockStatus === 'all' ||
      (filterLockStatus === 'open' && !isFull) ||
      (filterLockStatus === 'locked' && isFull);

    return matchesSearch && matchesCategory && matchesVoiceMode && matchesType && matchesExactSeats && matchesLock;
  });

  const countVoice = rooms.filter(r => r.mode === 'voice').length;
  const countText = rooms.filter(r => r.mode !== 'voice').length;
  const countSolo = rooms.filter(r => r.maxDebaters === 1 || r.roomType === 'solo').length;
  const count1v1 = rooms.filter(r => (r.maxDebaters === 2 || r.roomType === '1v1') && r.maxDebaters !== 1).length;
  const countGroup = rooms.filter(r => r.maxDebaters >= 3 || r.roomType === 'group').length;
  const totalOpenSlots = rooms.reduce((acc, r) => acc + Math.max(0, r.maxDebaters - r.currentDebatersCount), 0);
  const totalLockedRooms = rooms.filter(r => r.currentDebatersCount >= r.maxDebaters).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* Featured Arena Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        {/* Soft pastel accent background */}
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-indigo-50/70 blur-3xl pointer-events-none"></div>
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-50/60 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-600">
              <Flame className="h-3.5 w-3.5" />
              <span>{t('heroBadge')}</span>
            </div>
            <h1 className="font-heading text-2xl font-bold sm:text-4xl text-gray-900 tracking-tight leading-tight">
              {t('heroTitle1')} <br />
              <span className="text-indigo-600">
                {t('heroTitleHighlight')}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xl">
              {t('heroDesc')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {onOpenAdminVoice && (
              <button
                id="hero-admin-voice-btn"
                onClick={onOpenAdminVoice}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                title={t('adminVoiceDashboardTitle')}
              >
                <Mic className="h-4 w-4 text-rose-500" />
                <span>{t('adminVoiceMonitorBtn')}</span>
              </button>
            )}

            <button
              id="hero-create-room-btn"
              onClick={onOpenCreateModal}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 hover:scale-[1.01] active:scale-95"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span>{t('heroCreateBtn')}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-gray-100 pt-6 sm:grid-cols-5">
          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t('statSoloRooms')}</span>
              <Mic className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">{countSolo}</div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t('stat1v1Rooms')}</span>
              <Swords className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">{count1v1}</div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t('statGroupRooms')}</span>
              <Users className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900">{countGroup}</div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t('statOpenSlots')}</span>
              <Unlock className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{totalOpenSlots} {t('statAvailableSeats')}</div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{t('statLockedRooms')}</span>
              <Lock className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="mt-1 text-xl font-bold text-red-500">{totalLockedRooms} {t('statFull')}</div>
          </div>
        </div>
      </div>

      {/* Format Filter Bar (Solo vs 1v1 vs Group vs All + Voice vs Text) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        {/* Left: Mode Toggle (All / Voice / Text) */}
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('filterAll')}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('voice')}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === 'voice'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-rose-600'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>{t('voiceRoomsOnly')}</span>
            <span className={`rounded-full px-1.5 text-[10px] ${filterMode === 'voice' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
              {countVoice}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('text')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === 'text'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('textRoomsOnly')} ({countText})
          </button>
        </div>

        {/* Main Format Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-gray-100/80 p-1.5">
          <button
            type="button"
            id="filter-all-type-btn"
            onClick={() => { setFilterType('all'); setFilterSeats('all'); }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === 'all' && filterSeats === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('filterAll')} ({rooms.length})
          </button>

          <button
            type="button"
            id="filter-solo-btn"
            onClick={() => { setFilterType('solo'); setFilterSeats(1); }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === 'solo'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <Mic className="h-3.5 w-3.5 text-purple-500" />
            <span>{t('filterSolo')}</span>
            <span className="rounded-full bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.2">{countSolo}</span>
          </button>

          <button
            type="button"
            id="filter-1v1-btn"
            onClick={() => { setFilterType('1v1'); setFilterSeats(2); }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === '1v1'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-indigo-600'
            }`}
          >
            <Swords className="h-3.5 w-3.5 text-indigo-500" />
            <span>{t('filter1v1')}</span>
            <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2">{count1v1}</span>
          </button>

          <button
            type="button"
            id="filter-group-btn"
            onClick={() => { setFilterType('group'); setFilterSeats('all'); }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              filterType === 'group'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t('filterGroup')}</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2">{countGroup}</span>
          </button>
        </div>

        {/* Seat Count Buttons: 1, 2, 3, 4, 5 */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-gray-400 ml-1">{t('customSeatCountLabel')}</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setFilterSeats(filterSeats === s ? 'all' : s);
                if (s === 1) setFilterType('solo');
                else if (s === 2) setFilterType('1v1');
                else setFilterType('group');
              }}
              className={`h-7 w-7 rounded-xl text-xs font-bold transition shadow-xs ${
                filterSeats === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Lock status toggle: All vs Open seats vs Full */}
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100/80 p-1">
          <button
            type="button"
            onClick={() => setFilterLockStatus('all')}
            className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
              filterLockStatus === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('filterAllStatus')}
          </button>
          <button
            type="button"
            onClick={() => setFilterLockStatus('open')}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
              filterLockStatus === 'open'
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-gray-500 hover:text-green-700'
            }`}
          >
            <Unlock className="h-3 w-3 text-green-600" />
            <span>{t('filterOpenOnly')}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterLockStatus('locked')}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
              filterLockStatus === 'locked'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-gray-500 hover:text-red-700'
            }`}
          >
            <Lock className="h-3 w-3 text-red-500" />
            <span>{t('filterLockedOnly')}</span>
          </button>
        </div>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="lobby-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pr-11 pl-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-2xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition shadow-xs ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-indigo-100'
                  : 'border border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoinRoom={onJoinRoom}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-xs mb-3">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-bold text-gray-900">لا توجد غرف تطابق هذا الفلتر</h3>
          <p className="mt-1 text-xs text-gray-400 max-w-sm">
            يمكنك فتح غرفة مناظرة أو نقاش جديدة الآن واختيار السعة المناسبة!
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-5 flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>{t('createNewRoom')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
