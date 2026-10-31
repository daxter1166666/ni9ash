import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle2, AlertCircle, X, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import { MicTester } from '../services/livekitAudio';
import { useTranslation } from '../i18n/LanguageContext';

interface MicCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmJoin: () => void;
  stanceLabel: string;
}

export const MicCheckModal: React.FC<MicCheckModalProps> = ({
  isOpen,
  onClose,
  onConfirmJoin,
  stanceLabel,
}) => {
  const { t, dir } = useTranslation();
  const [micLevel, setMicLevel] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'not_found' | 'idle'>('idle');
  const testerRef = useRef<MicTester | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (testerRef.current) {
        testerRef.current.stop();
        testerRef.current = null;
      }
      setMicLevel(0);
      setPermissionStatus('idle');
      return;
    }

    // Auto-start testing mic on modal open
    const tester = new MicTester();
    testerRef.current = tester;
    setPermissionStatus('checking');

    tester.start((level) => {
      setMicLevel(level);
    }).then((res) => {
      if (res.success) {
        setPermissionStatus('granted');
      } else {
        if (res.errorType === 'denied') {
          setPermissionStatus('denied');
        } else if (res.errorType === 'not_found') {
          setPermissionStatus('not_found');
        } else {
          setPermissionStatus('denied');
        }
      }
    });

    return () => {
      if (testerRef.current) {
        testerRef.current.stop();
        testerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" dir={dir}>
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-gray-900">
              {t('micCheckModalTitle')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('micCheckModalDesc')}
            </p>
          </div>
        </div>

        {/* Live Audio Visualizer Card */}
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-indigo-50/30 p-5 mb-5 flex flex-col items-center justify-center text-center">
          {/* Animated Microphone Icon with Pulsing Waves */}
          <div className="relative my-3 flex items-center justify-center">
            {permissionStatus === 'granted' && micLevel > 15 && (
              <div
                className="absolute h-24 w-24 rounded-full bg-indigo-400/20 animate-ping"
                style={{ transform: `scale(${1 + micLevel / 100})` }}
              />
            )}
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 shadow-lg ${
                permissionStatus === 'granted'
                  ? micLevel > 15
                    ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white scale-105'
                    : 'bg-indigo-600 text-white'
                  : permissionStatus === 'denied' || permissionStatus === 'not_found'
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {permissionStatus === 'denied' || permissionStatus === 'not_found' ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </div>
          </div>

          {/* Status Label */}
          {permissionStatus === 'checking' && (
            <p className="text-xs font-semibold text-indigo-600 animate-pulse mt-2">
              {t('micCheckingPermission')}
            </p>
          )}

          {permissionStatus === 'granted' && (
            <div className="mt-2 space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {t('micReadyAndWorking')}
              </span>
              <p className="text-[11px] text-gray-500">
                {t('micSpeakToTestHint')}
              </p>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="mt-2 space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {t('micPermissionDeniedTitle')}
              </span>
              <p className="text-[11px] text-rose-500">
                {t('micPermissionDeniedDesc')}
              </p>
            </div>
          )}

          {permissionStatus === 'not_found' && (
            <div className="mt-2 space-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                <AlertCircle className="h-4 w-4" />
                {t('micNotFoundTitle')}
              </span>
              <p className="text-[11px] text-gray-500">
                {t('micNotFoundDesc')}
              </p>
            </div>
          )}

          {/* Real-time Level Meter Bar */}
          <div className="w-full mt-4">
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1">
              <span>{t('micLevelMin')}</span>
              <span>{micLevel}%</span>
              <span>{t('micLevelMax')}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  micLevel > 70
                    ? 'bg-rose-500'
                    : micLevel > 35
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Selected Stance Info */}
        <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs mb-5 border border-gray-100">
          <span className="text-gray-500">{t('selectedStanceLabel')}:</span>
          <span className="font-bold text-indigo-700">{stanceLabel}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmJoin();
              onClose();
            }}
            disabled={permissionStatus === 'denied' || permissionStatus === 'not_found'}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{t('confirmAndTakeSeat')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
