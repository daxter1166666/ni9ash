import React, { useState, useEffect } from 'react';
import { X, Mic, Radio, Users, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { AdminVoiceRoomSummary } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface AdminVoiceRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (roomId: string) => void;
}

export const AdminVoiceRoomsModal: React.FC<AdminVoiceRoomsModalProps> = ({
  isOpen,
  onClose,
  onSelectRoom,
}) => {
  const { t, dir } = useTranslation();
  const [voiceRooms, setVoiceRooms] = useState<AdminVoiceRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminVoiceRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/voice-rooms');
      const data = await res.json();
      if (data.success && data.voiceRooms) {
        setVoiceRooms(data.voiceRooms);
      }
    } catch (e) {
      console.warn('Error fetching admin voice rooms:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminVoiceRooms();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" dir={dir}>
      <div className="relative w-full max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-gray-900">
                {t('adminVoiceDashboardTitle')}
              </h3>
              <p className="text-xs text-gray-500">
                {t('adminVoiceDashboardSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={fetchAdminVoiceRooms}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
            {t('loading')}...
          </div>
        ) : voiceRooms.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 space-y-1">
            <Mic className="mx-auto h-8 w-8 text-gray-300" />
            <p>{t('noLiveVoiceRoomsActive')}</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
            {voiceRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3.5 hover:bg-white hover:border-indigo-100 transition shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-gray-900 truncate">{room.title}</h4>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {room.isFreeTalk ? t('modeFreeTalk') : t('modeTurnBased')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>{t('host')}: <strong>{room.hostName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.currentDebatersCount}/{room.maxDebaters} {t('speakers')}
                    </span>
                    <span>•</span>
                    <span>{room.spectatorsCount} {t('listeners')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {room.durationMinutes}m
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectRoom(room.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t('joinRoomBtn')}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
