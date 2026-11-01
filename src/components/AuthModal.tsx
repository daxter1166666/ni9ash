import React, { useState } from 'react';
import { KeyRound, User, Lock, Sparkles, LogIn, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onLoginSuccess: (user: UserProfile, secretPin: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [name, setName] = useState(currentUser.name || '');
  const [loginPin, setLoginPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate a random secret PIN
  const handleGenerateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const randomPin = 'MUN-' + Math.floor(1000 + Math.random() * 9000);
    setGeneratedPin(randomPin);

    const updatedUser: UserProfile = {
      ...currentUser,
      name: name.trim(),
      handle: '@' + name.trim().replace(/\s+/g, '_').toLowerCase() + '_' + Math.floor(10 + Math.random() * 90),
    };

    try {
      localStorage.setItem(`munazara_account_${randomPin}`, JSON.stringify(updatedUser));
      localStorage.setItem('munazara_active_pin', randomPin);
    } catch {}

    onLoginSuccess(updatedUser, randomPin);
  };

  // Login with existing secret PIN
  const handleLoginWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPin = loginPin.trim().toUpperCase();
    if (!cleanPin) return;

    try {
      const savedData = localStorage.getItem(`munazara_account_${cleanPin}`);
      if (savedData) {
        const userObj: UserProfile = JSON.parse(savedData);
        localStorage.setItem('munazara_active_pin', cleanPin);
        onLoginSuccess(userObj, cleanPin);
        onClose();
      } else {
        setError('رمز الدخول غير صحيح أو غير مسجل على هذا المتصفح. تأكد من الرمز السري.');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول.');
    }
  };

  const handleCopyPin = () => {
    if (generatedPin) {
      navigator.clipboard.writeText(generatedPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-gray-900">
        {/* Header Tabs */}
        <div className="mb-6 flex rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === 'register'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            حساب جديد برمز سري 🔑
          </button>
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === 'login'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            دخول من جهاز آخر 📲
          </button>
        </div>

        {tab === 'register' ? (
          <div>
            {!generatedPin ? (
              <form onSubmit={handleGenerateAccount} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-gray-900">إنشاء حساب برمز سري</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    أدخل اسمك فقط وسنقوم بتوليد رمز سري خاص بك تستطيع استخدامه للدخول من أي هاتف أو حاسوب!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    اسمك المعروض أو اللقب
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: طارق الفكري"
                      className="w-full rounded-2xl border border-gray-200 bg-white pr-10 pl-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>توليد الحساب والرمز السري</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900">تم إنشاء حسابك بنجاح!</h3>
                <p className="text-xs text-gray-500">
                  احتفظ بهذا الرمز السري في مكان آمن. يمكنك إدخاله في أي جهاز آخر لتسجيل دخولك فوراً:
                </p>

                <div className="my-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">رموزك السري للدخول</div>
                  <div className="font-mono text-2xl font-black text-indigo-900 tracking-widest">{generatedPin}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'تم النسخ ✓' : 'نسخ الرمز السري'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setGeneratedPin(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
                  >
                    <span>الدخول للمنصة</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleLoginWithPin} className="space-y-4">
            <div className="text-center mb-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
                <LogIn className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-gray-900">تسجيل الدخول برمز سري</h3>
              <p className="text-xs text-gray-500 mt-1">
                أدخل الرمز السري (مثل: MUN-XXXX) الذي تم توليده لك سابقاً لاستعادة حسابك على هذا الجهاز.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 font-medium text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                الرمز السري للحساب
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="MUN-XXXX"
                  className="w-full rounded-2xl border border-gray-200 bg-white pr-10 pl-3.5 py-2.5 font-mono text-sm tracking-wider uppercase text-gray-900 focus:border-indigo-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition"
            >
              <LogIn className="h-4 w-4" />
              <span>دخول سريع للحساب</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
