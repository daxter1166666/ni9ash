import React, { useState } from 'react';
import { X, HelpCircle, Send } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitQuestion: (question: string) => void;
}

export const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmitQuestion,
}) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSubmitQuestion(question.trim());
    setQuestion('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        id="ask-question-modal"
        className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900"
      >
        <button
          onClick={onClose}
          className="absolute left-6 top-6 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-3 flex items-center gap-2 text-indigo-600">
          <HelpCircle className="h-5 w-5" />
          <h3 className="font-heading text-lg font-bold text-gray-900">{t('askQuestionModalTitle')}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {t('askQuestionModalDesc')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            id="question-text-input"
            required
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('questionPlaceholder')}
            className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none shadow-xs"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              id="submit-question-btn"
              type="submit"
              disabled={!question.trim()}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-40 active:scale-95"
            >
              <span>{t('submitQuestionBtn')}</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
