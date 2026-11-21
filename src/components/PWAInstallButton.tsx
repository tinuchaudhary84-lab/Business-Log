import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  MessageCircle,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface PWAInstallButtonProps {
  label: string;
  lang?: Language;
  compact?: boolean;
  showInstalledBadge?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  label,
  lang = 'gu',
  compact = false,
  showInstalledBadge = false,
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    if (!showInstalledBadge) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{lang === 'gu' ? 'એપ ઇન્સ્ટોલ થયેલ છે' : 'App Installed'}</span>
      </div>
    );
  }

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin || window.location.href : '';
  const waText =
    lang === 'gu'
      ? `મોબાઇલમાં એપ ડાઉનલોડ / ઇન્સ્ટોલ કરવા માટે નીચેની લિંક Chrome બ્રાઉઝરમાં ખોલો:\n${appUrl}`
      : `Open this link in Chrome / Safari on your phone to download & install the app:\n${appUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const displayLabel = compact ? (lang === 'gu' ? 'ડાઉનલોડ' : 'Download') : label;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer whitespace-nowrap shrink-0 ${
          compact
            ? 'min-h-[36px] px-2.5 text-xs'
            : 'w-full min-h-[44px] px-4 py-2 text-sm'
        }`}
        title={label}
        aria-label={label}
      >
        {isIOS ? (
          <Smartphone className="w-4 h-4 shrink-0" />
        ) : (
          <Download className="w-4 h-4 shrink-0" />
        )}
        <span>{displayLabel}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'gu' ? 'એપ ડાઉનલોડ / ઇન્સ્ટોલ કરો' : 'Download & Install App'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isInIframe && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-medium leading-relaxed">
                  {lang === 'gu'
                    ? 'અત્યારે એપ પ્રિવ્યૂ બોક્સની અંદર ખુલી છે. લિંક WhatsApp પર મોકલો અથવા કોપી કરીને Chrome માં ખોલો:'
                    : 'Opened inside a preview frame. Send link on WhatsApp or copy and open directly in Chrome / Safari:'}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[38px] px-3 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-700"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {lang === 'gu' ? 'WhatsApp દ્વારા લિંક મોકલો' : 'Send Link via WhatsApp'}
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full min-h-[38px] px-3 rounded-lg bg-amber-600 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-700 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{lang === 'gu' ? 'લિંક કોપી થઈ ગઈ!' : 'Link Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{lang === 'gu' ? 'એપ લિંક કોપી કરો' : 'Copy App Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {isIOS ? (
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p>
                  {lang === 'gu'
                    ? 'iPhone / iPad પર ઇન્સ્ટોલ કરવા માટે:'
                    : 'To install on iPhone / iPad:'}
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    {lang === 'gu'
                      ? 'Safari બ્રાઉઝરમાં નીચે Share આઇકન પર ટચ કરો.'
                      : 'Tap the Share icon in the Safari toolbar.'}
                  </li>
                  <li>
                    {lang === 'gu'
                      ? 'નીચે સ્ક્રોલ કરીને "Add to Home Screen" પસંદ કરો.'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p>
                  {lang === 'gu'
                    ? 'Android મોબાઇલ / Chrome માં ડાઉનલોડ કરવા માટે:'
                    : 'To install on Android / Desktop Chrome:'}
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    {lang === 'gu'
                      ? 'Chrome બ્રાઉઝરમાં એપની લિંક સીધી ખોલો.'
                      : 'Open the app URL directly in Chrome.'}
                  </li>
                  <li>
                    {lang === 'gu'
                      ? 'બ્રાઉઝરના ઉપર જમણા ખૂણે મેનૂ (⋮) દબાવો → "Install app" અથવા "Add to Home screen" પર ક્લિક કરો.'
                      : 'Tap the browser menu (⋮) → "Install app" or "Add to Home screen".'}
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
            >
              {lang === 'gu' ? 'સમજાયું' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
