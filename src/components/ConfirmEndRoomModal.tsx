import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface ConfirmEndRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEnding?: boolean;
  roomTitle?: string;
}

export const ConfirmEndRoomModal: React.FC<ConfirmEndRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isEnding = false,
  roomTitle,
}) => {
  const { t, dir } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        dir={dir}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isEnding}
          className="absolute top-4 left-4 sm:left-auto sm:right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Content */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mb-4 shadow-xs">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h3 className="font-heading text-lg font-bold text-gray-900">
            {t('confirmEndRoomTitle') || 'إنهاء الغرفة رسمياً'}
          </h3>

          {roomTitle && (
            <p className="mt-1 text-xs font-semibold text-rose-600 line-clamp-1 max-w-[90%]">
              «{roomTitle}»
            </p>
          )}

          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            {t('confirmEndRoomPrompt') ||
              'هل أنت متأكد من رغبتك في إنهاء هذه الغرفة فوراً؟ سيتم اختتام النقاش وإيقاف البث وإعادة جميع المشاركين والجمهور إلى الردهة.'}
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex w-full flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isEnding}
              className="w-full sm:w-1/2 rounded-2xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-50"
            >
              {t('cancelBtn') || 'تراجع وإلغاء'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isEnding}
              className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-rose-700 transition shadow-md shadow-rose-200 active:scale-95 disabled:opacity-50"
            >
              {isEnding ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('endingRoomProgress') || 'جارٍ الإنهاء...'}</span>
                </>
              ) : (
                <span>{t('confirmEndRoomAction') || 'نعم، إنهاء الغرفة'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
