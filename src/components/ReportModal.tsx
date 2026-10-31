import React, { useState } from 'react';
import { Flag, X, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle: string;
  reporterId: string;
  reporterName: string;
  targetUser?: { id: string; name: string; role: string } | null;
  onSubmitReport: (data: {
    targetId: string;
    targetName: string;
    targetRole: string;
    reason: string;
    details: string;
  }) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  targetUser,
  onSubmitReport,
}) => {
  const { t, dir } = useTranslation();
  const [selectedReason, setSelectedReason] = useState('offensive_speech');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport({
      targetId: targetUser ? targetUser.id : roomId,
      targetName: targetUser ? targetUser.name : roomTitle,
      targetRole: targetUser ? targetUser.role : 'room',
      reason: selectedReason,
      details: details.trim(),
    });
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1500);
  };

  const reasons = [
    { id: 'offensive_speech', label: t('reportReasonOffensive') },
    { id: 'harassment', label: t('reportReasonHarassment') },
    { id: 'audio_spam', label: t('reportReasonAudioSpam') },
    { id: 'misinformation', label: t('reportReasonMisinfo') },
    { id: 'other', label: t('reportReasonOther') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" dir={dir}>
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t('reportReceivedTitle')}</h3>
            <p className="text-xs text-gray-500">{t('reportReceivedDesc')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-gray-900">
                  {targetUser ? t('reportUserTitle', { name: targetUser.name }) : t('reportRoomTitle')}
                </h3>
                <p className="text-xs text-gray-500">{t('reportSubtitle')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">{t('reportSelectReason')}</label>
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer transition ${
                      selectedReason === r.id
                        ? 'border-rose-400 bg-rose-50/60 font-semibold text-rose-900'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">{t('reportDetailsOptional')}</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('reportDetailsPlaceholder')}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t('submitReportBtn')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
