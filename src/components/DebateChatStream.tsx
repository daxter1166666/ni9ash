import React from 'react';
import { Quote, ThumbsUp, Sparkles, Scale, BookOpen, AlertCircle, CornerDownRight } from 'lucide-react';
import { DebateMessage, UserProfile } from '../types';
import { useTranslation } from '../i18n/LanguageContext';

interface DebateChatStreamProps {
  messages: DebateMessage[];
  currentUser: UserProfile;
  onReplyTo: (message: DebateMessage) => void;
  onLikeMessage?: (messageId: string) => void;
  isCurrentUserDebater: boolean;
}

export const DebateChatStream: React.FC<DebateChatStreamProps> = ({
  messages,
  currentUser,
  onReplyTo,
  onLikeMessage,
  isCurrentUserDebater,
}) => {
  const { t } = useTranslation();

  if (messages.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-xs">
        <Scale className="h-10 w-10 text-gray-300 mb-3" />
        <h4 className="text-sm font-bold text-gray-700">{t('emptyStreamTitle')}</h4>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          {t('emptyStreamDesc')}
        </p>
      </div>
    );
  }

  const getTypeDetails = (type: string) => {
    switch (type) {
      case 'rebuttal':
        return { label: t('argRebuttal'), bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600', icon: <CornerDownRight className="h-3 w-3" /> };
      case 'poi':
        return { label: t('argPointOfOrder'), bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: <AlertCircle className="h-3 w-3" /> };
      case 'citation':
        return { label: t('attachSourceBtn'), bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600', icon: <BookOpen className="h-3 w-3" /> };
      case 'ruling':
        return { label: t('tabAiReferee'), bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700', icon: <Scale className="h-3 w-3" /> };
      case 'system':
        return { label: 'System', bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', icon: <Sparkles className="h-3 w-3" /> };
      default:
        return { label: t('argMain'), bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-600', icon: <Quote className="h-3 w-3" /> };
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isMe = msg.senderId === currentUser.id;
        const isSystem = msg.type === 'system';
        const isRuling = msg.type === 'ruling';
        const badge = getTypeDetails(msg.type);

        if (isSystem) {
          return (
            <div
              key={msg.id}
              className="flex items-center justify-center my-3 text-center"
            >
              <div className="rounded-full border border-gray-200 bg-gray-100/80 px-4 py-1.5 text-xs text-gray-500 shadow-xs">
                <span>{msg.content}</span>
              </div>
            </div>
          );
        }

        if (isRuling) {
          return (
            <div
              key={msg.id}
              className="my-4 rounded-3xl border border-purple-100 bg-purple-50/70 p-5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-purple-600 border border-purple-100 shadow-xs">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-900">{msg.senderName}</h4>
                    <span className="text-[10px] text-purple-500">{t('aiRefereeDesc')}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-purple-400">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-800 font-medium">
                {msg.content}
              </p>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            id={`debate-message-${msg.id}`}
            className="group rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-indigo-100 hover:shadow-sm"
          >
            {/* Header: Sender Info & Stance */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  referrerPolicy="no-referrer"
                  className={`h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-xs ${
                    msg.senderStance === 'pro'
                      ? 'border-2 border-emerald-500'
                      : msg.senderStance === 'con'
                      ? 'border-2 border-rose-500'
                      : 'border-2 border-gray-300'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {msg.senderName}
                    </span>
                    {isMe && (
                      <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.2 text-[9px] font-bold text-indigo-600">
                        {t('youLabel')}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        msg.senderStance === 'pro'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : msg.senderStance === 'con'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {msg.senderStance === 'pro' ? t('stancePro') : msg.senderStance === 'con' ? t('stanceCon') : t('stanceNeutral')}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Argument Type Badge */}
              <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            </div>

            {/* If Replying/Rebutting */}
            {msg.replyTo && (
              <div className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 border-r-3 border-r-indigo-500">
                <div className="flex items-center gap-1 text-[11px] font-bold text-gray-800 mb-1">
                  <CornerDownRight className="h-3 w-3 text-indigo-600" />
                  <span>{t('rebuttingTo')} {msg.replyTo.senderName}:</span>
                </div>
                <p className="line-clamp-2 italic text-[11px] text-gray-500">
                  "{msg.replyTo.snippet}"
                </p>
              </div>
            )}

            {/* Argument Content Text Box */}
            <div className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
              isMe 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-gray-50 text-gray-800 border border-gray-100'
            }`}>
              {msg.content}
            </div>

            {/* Cited Source */}
            {msg.citedSource && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold">{t('attachSourceBtn')}:</span>
                <span>{msg.citedSource}</span>
              </div>
            )}

            {/* Actions: Rebut / Like */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs text-gray-400">
              <div className="flex items-center gap-3">
                <button
                  id={`like-msg-${msg.id}`}
                  onClick={() => onLikeMessage?.(msg.id)}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 transition font-medium active:scale-95"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{msg.likesCount || 0}</span>
                </button>
              </div>

              {/* Only debaters can rebut directly onto the stage */}
              {isCurrentUserDebater && !isMe && (
                <button
                  id={`rebut-msg-btn-${msg.id}`}
                  onClick={() => onReplyTo(msg)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-xs active:scale-95"
                >
                  <CornerDownRight className="h-3 w-3" />
                  <span>{t('argRebuttal')}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
