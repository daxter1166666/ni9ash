import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, Share, Info } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('munazara_pwa_dismissed') === 'true';
  });
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isApp = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsDismissed(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      alert(t('pwaDesc'));
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('munazara_pwa_dismissed', 'true');
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Header Compact PWA Promotion Banner */}
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white px-4 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-xs">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold sm:text-sm">{t('pwaTitle')}</span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.2 text-[10px] font-bold text-emerald-200">
                  {t('pwaBadge')}
                </span>
              </div>
              <p className="text-[11px] text-indigo-100/80 hidden sm:block">
                {t('pwaDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="install-pwa-banner-btn"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-50 active:scale-95 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('pwaInstallBtn')}</span>
            </button>
            <button
              id="dismiss-pwa-banner-btn"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-indigo-200 hover:bg-white/10 hover:text-white transition"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-start shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">{t('pwaIosTitle')}</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 space-y-3 text-xs text-gray-600">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                  1
                </span>
                <p>{t('pwaIosStep1')}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                  2
                </span>
                <p>{t('pwaIosStep2')}</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                  3
                </span>
                <p>{t('pwaIosStep3')}</p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full rounded-2xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-xs"
            >
              {t('pwaGotIt')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
