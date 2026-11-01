import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, Flame, Sparkles, User, Users, Globe, ChevronDown, Check, Bookmark } from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';

interface HeaderProps {
  currentUser: UserProfile;
  onOpenCreateModal: () => void;
  onOpenProfileModal: () => void;
  onOpenLibrary: () => void;
  savedDebatesCount?: number;
  onBackToLobby?: () => void;
  isInRoom?: boolean;
  totalActiveRooms?: number;
  totalDebaters?: number;
  totalSpectators?: number;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenCreateModal,
  onOpenProfileModal,
  onOpenLibrary,
  savedDebatesCount = 0,
  onBackToLobby,
  isInRoom,
  totalActiveRooms = 4,
  totalDebaters = 12,
  totalSpectators = 340,
  onOpenAuthModal,
}) => {
  const { t, language, setLanguage, languages } = useTranslation();
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-4">
          <button
            id="brand-logo-btn"
            onClick={onBackToLobby}
            className="group flex items-center gap-3 text-start focus:outline-none"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100 transition group-hover:scale-105">
              <MessageSquare className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-2xl font-bold tracking-tight text-indigo-600">
                  {t('brandName')}
                </span>
                <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                  {t('brandBadge')}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 max-w-xs truncate">
                {t('brandTagline')}
              </p>
            </div>
          </button>
        </div>

        {/* Global Live Ticker (Desktop) */}
        {!isInRoom && (
          <div className="hidden items-center gap-5 rounded-full border border-gray-100 bg-gray-50 px-4 py-1.5 text-xs text-gray-600 lg:flex">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-600">{totalActiveRooms}</span>
              <span className="text-gray-400">{t('activeRoomsCount')}</span>
            </div>
            <div className="h-3 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-gray-900">{totalDebaters}</span>
              <span className="text-gray-400">{t('onStageDebaters')}</span>
            </div>
            <div className="h-3 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-semibold text-gray-900">{totalSpectators}</span>
              <span className="text-gray-400">{t('audienceCount')}</span>
            </div>
          </div>
        )}

        {/* Actions, Language Selector & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              id="language-selector-btn"
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-300 shadow-xs"
              title={t('changeLanguage')}
            >
              <span className="text-sm">{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.nativeName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-200/50 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  {t('changeLanguage')}
                </div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs transition text-start ${
                      language === l.code
                        ? 'bg-indigo-50/80 font-bold text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{l.flag}</span>
                      <span>{l.nativeName}</span>
                    </div>
                    {language === l.code && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Saved Debates Library Button */}
          <button
            id="open-library-header-btn"
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 shadow-xs"
            title={t('savedLibraryTitle')}
          >
            <Bookmark className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">{t('savedLibraryTitle')}</span>
            {savedDebatesCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-extrabold text-white">
                {savedDebatesCount}
              </span>
            )}
          </button>

          {isInRoom && (
            <button
              id="back-to-lobby-btn"
              onClick={onBackToLobby}
              className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-300 shadow-xs"
            >
              {t('backToLobby')}
            </button>
          )}

          <button
            id="open-create-room-btn"
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 hover:shadow-indigo-200"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span className="hidden xs:inline">{t('createNewRoom')}</span>
          </button>

          {/* User Profile Trigger */}
          <button
            id="user-profile-btn"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-1.5 sm:px-3 transition hover:border-indigo-100 hover:bg-indigo-50/50 shadow-xs"
            title={t('userProfile')}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-xl object-cover ring-2 ring-white shadow-xs"
            />
            <div className="hidden text-start sm:block">
              <div className="text-xs font-bold text-gray-900 line-clamp-1">{currentUser.name}</div>
              <div className="text-[10px] font-medium text-indigo-600">{currentUser.handle}</div>
            </div>
          </button>

          {/* Quick Auth / PIN Login Button */}
          <button
            id="open-auth-modal-btn"
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 shadow-xs"
            title="تسجيل الدخول / الرمز السري"
          >
            <span>🔑</span>
            <span className="hidden md:inline">الدخول برمز</span>
          </button>
        </div>
      </div>
    </header>
  );
};
