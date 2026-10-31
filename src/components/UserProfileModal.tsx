import React, { useState } from 'react';
import { X, User, Check, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
}) => {
  const { t, language, setLanguage, languages } = useTranslation();
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bio, setBio] = useState(currentUser.bio || '');

  if (!isOpen) return null;

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProfile({
      ...currentUser,
      name: name.trim(),
      handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
      avatar,
      bio: bio.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        id="user-profile-modal"
        className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900"
      >
        <button
          onClick={onClose}
          className="absolute left-6 top-6 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-2.5 text-indigo-600">
          <User className="h-5 w-5" />
          <h3 className="font-heading text-lg font-bold text-gray-900">{t('profileTitle')}</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              {t('chooseAvatarLabel')}
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto py-1">
              {sampleAvatars.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(url)}
                  className={`relative rounded-2xl p-0.5 transition ${
                    avatar === url
                      ? 'ring-2 ring-indigo-600 scale-105 shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={url}
                    alt="avatar option"
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 rounded-2xl object-cover"
                  />
                  {avatar === url && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('fullNameLabel')}
            </label>
            <input
              id="profile-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
          </div>

          {/* Handle */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('handleLabel')}
            </label>
            <input
              id="profile-handle-input"
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
          </div>

          {/* Language Selector inside Profile */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('appLanguageLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition ${
                    language === l.code
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </div>
                  {language === l.code && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t('bioLabel')}
            </label>
            <textarea
              id="profile-bio-input"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('bioPlaceholder')}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none shadow-xs resize-none"
            />
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
            <div className="rounded-2xl bg-gray-50 p-2 border border-gray-100">
              <div className="text-[10px] text-gray-400">{t('debatesParticipated')}</div>
              <div className="text-sm font-bold text-gray-900">{currentUser.debatesCount}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-2 border border-gray-100">
              <div className="text-[10px] text-gray-400">{t('winsLabel')}</div>
              <div className="text-sm font-bold text-emerald-600">{currentUser.winsCount}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-2 border border-gray-100">
              <div className="text-[10px] text-gray-400">{t('audienceVotesReceived')}</div>
              <div className="text-sm font-bold text-indigo-600">{currentUser.audienceVotesReceived}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700"
            >
              {t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
