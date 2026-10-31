import React from 'react';
import { Users, Lock, Unlock, MessageSquare, ArrowLeft, ArrowRight, Scale, Swords, Mic } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface RoomCardProps {
  room: {
    id: string;
    title: string;
    description: string;
    category: string;
    roomType?: 'solo' | '1v1' | 'group';
    maxDebaters: number;
    currentDebatersCount: number;
    isLockedForDebaters: boolean;
    hostName: string;
    hostAvatar: string;
    status: string;
    spectatorsCount: number;
    messagesCount: number;
    tags: string[];
    participants?: { id: string; name: string; avatar: string; stance: string; role: string }[];
    createdAt: string;
    mode?: 'text' | 'voice';
    freeTalk?: boolean;
  };
  onJoinRoom: (roomId: string, requestedRole: 'debater' | 'audience') => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onJoinRoom }) => {
  const { t, dir } = useTranslation();
  const isSolo = room.maxDebaters === 1 || room.roomType === 'solo';
  const is1v1 = (room.maxDebaters === 2 || room.roomType === '1v1') && !isSolo;
  const isFull = room.currentDebatersCount >= room.maxDebaters;
  const remainingSlots = Math.max(0, room.maxDebaters - room.currentDebatersCount);
  const isVoice = room.mode === 'voice';

  // Category labels with clean color pairings
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'tech': return { label: t('catTech'), badge: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      case 'philosophy': return { label: t('catPhilosophy'), badge: 'bg-purple-50 text-purple-600 border-purple-100' };
      case 'economy': return { label: t('catEconomy'), badge: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'society': return { label: t('catSociety'), badge: 'bg-amber-50 text-amber-700 border-amber-100' };
      case 'sports': return { label: t('catSports'), badge: 'bg-rose-50 text-rose-600 border-rose-100' };
      case 'science': return { label: t('catScience'), badge: 'bg-sky-50 text-sky-600 border-sky-100' };
      default: return { label: t('catGeneral'), badge: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const cat = getCategoryLabel(room.category);

  return (
    <div
      id={`room-card-${room.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xs transition-all duration-300 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50/50"
    >
      {/* Top Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Voice Mode Badge */}
          {isVoice && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
              <Mic className="h-3 w-3" />
              <span>{t('voiceRoomBadge')}</span>
            </span>
          )}

          {/* Room Type Pill */}
          {isSolo ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50/80 px-2.5 py-0.5 text-xs font-bold text-purple-700">
              <Mic className="h-3 w-3" />
              <span>{t('badgeSolo')}</span>
            </span>
          ) : is1v1 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              <Swords className="h-3 w-3" />
              <span>{t('badge1v1')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <Users className="h-3 w-3" />
              <span>{t('badgeGroupSeats', { count: room.maxDebaters })}</span>
            </span>
          )}

          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cat.badge}`}>
            {cat.label}
          </span>
        </div>

        {/* Lock / Capacity Indicator Badge */}
        {isFull ? (
          <div className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500">
            <Lock className="h-3.5 w-3.5 text-red-500" />
            <span>{t('statusFull', { current: room.currentDebatersCount, max: room.maxDebaters })}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600">
            <Unlock className="h-3.5 w-3.5 text-green-600" />
            <span>{t('statusOpen', { remaining: remainingSlots, current: room.currentDebatersCount, max: room.maxDebaters })}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold leading-snug text-gray-900 group-hover:text-indigo-600 transition-colors">
          {room.title}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
          {room.description}
        </p>

        {/* Debaters Stage Avatars & Slot Visualizer */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-3.5">
          <div className="mb-2.5 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-gray-700">
              {isSolo
                ? t('stageSoloTitle')
                : is1v1
                ? t('stage1v1Title')
                : t('stageGroupTitle', { count: room.maxDebaters })}
            </span>
            {isFull ? (
              <span className="text-red-500 font-medium">{t('stageFullSpectators')}</span>
            ) : (
              <span className="text-indigo-600 font-medium">
                {is1v1 ? t('stageWaitingChallenge') : t('stageOpenToJoin')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {/* Render Filled Slots */}
            {room.participants && room.participants.map((p, idx) => (
              <div
                key={p.id || idx}
                className="group/avatar relative flex flex-col items-center"
                title={`${p.name} - ${p.stance === 'pro' ? t('stancePro') : p.stance === 'con' ? t('stanceCon') : t('stanceNeutral')}`}
              >
                <div className="relative">
                  <img
                    src={p.avatar}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className={`h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-xs ${
                      p.stance === 'pro'
                        ? 'border-2 border-emerald-500'
                        : p.stance === 'con'
                        ? 'border-2 border-rose-500'
                        : 'border-2 border-amber-500'
                    }`}
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-xs ${
                      p.stance === 'pro'
                        ? 'bg-emerald-500'
                        : p.stance === 'con'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                  >
                    {p.stance === 'pro' ? '✓' : p.stance === 'con' ? '✕' : '='}
                  </span>
                </div>
                <span className="mt-1 max-w-[55px] truncate text-[10px] text-gray-600 font-medium">
                  {p.name.split(' ')[0]}
                </span>
              </div>
            ))}

            {/* VS separator for 1v1 if 1 is present */}
            {is1v1 && room.participants && room.participants.length === 1 && (
              <div className="flex items-center justify-center px-1 font-extrabold text-[11px] text-indigo-500 bg-indigo-50 rounded-full h-6 w-6">
                VS
              </div>
            )}

            {/* Render Empty Slots */}
            {Array.from({ length: remainingSlots }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex flex-col items-center justify-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 text-xs font-semibold shadow-xs">
                  {is1v1 ? 'VS' : `+${idx + 1}`}
                </div>
                <span className="mt-1 text-[10px] text-gray-400">
                  {is1v1 ? t('opponentSeatVacant') : t('vacantSlot', { num: idx + 1 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {room.tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Stats & Actions */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5" title={t('audienceCount')}>
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-semibold text-gray-800">{room.spectatorsCount}</span>
            <span className="hidden sm:inline text-gray-400">{t('spectatorsLabel')}</span>
          </div>
          <div className="flex items-center gap-1.5" title={t('messagesLabel')}>
            <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold text-gray-800">{room.messagesCount}</span>
            <span className="hidden sm:inline text-gray-400">{t('messagesLabel')}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          {!isFull ? (
            <button
              id={`join-debater-btn-${room.id}`}
              onClick={() => onJoinRoom(room.id, 'debater')}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 active:scale-95"
            >
              {is1v1 ? (
                <>
                  <Swords className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{t('acceptChallenge')}</span>
                </>
              ) : isSolo ? (
                <>
                  <Mic className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{t('claimSeat')}</span>
                </>
              ) : (
                <>
                  <Scale className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{t('joinAsDebater')}</span>
                </>
              )}
            </button>
          ) : (
            <button
              id={`join-audience-btn-${room.id}`}
              onClick={() => onJoinRoom(room.id, 'audience')}
              className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
            >
              <span>{t('enterAsAudience')}</span>
              {dir === 'rtl' ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
