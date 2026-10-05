import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

interface AuthCardProps {
  onSuccess: () => void;
  attempts: number;
  setAttempts: React.Dispatch<React.SetStateAction<number>>;
  lockoutUntil: number;
  setLockoutUntil: React.Dispatch<React.SetStateAction<number>>;
  waitTime: number;
  setWaitTime: React.Dispatch<React.SetStateAction<number>>;
}

const ClaudeSparkIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 text-[#CC785C]' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25c.414 0 .75.336.75.75v3.195a6.75 6.75 0 0 1 5.055 5.055H21a.75.75 0 0 1 0 1.5h-3.195a6.75 6.75 0 0 1-5.055 5.055V21a.75.75 0 0 1-1.5 0v-3.195a6.75 6.75 0 0 1-5.055-5.055H3a.75.75 0 0 1 0-1.5h3.195a6.75 6.75 0 0 1 5.055-5.055V3c0-.414.336-.75.75-.75z" />
  </svg>
);

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccess,
  attempts,
  setAttempts,
  lockoutUntil,
  setLockoutUntil,
  waitTime,
  setWaitTime,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Dynamic lockout loop
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        const diffSeconds = Math.ceil((lockoutUntil - now) / 1000);
        setRemainingTime(diffSeconds);
      } else {
        if (remainingTime > 0) {
          setRemainingTime(0);
          setErrorMessage('You can try again now. Please enter the passcode.');
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil, remainingTime]);

  const isLocked = remainingTime > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (passwordInput === '168168') {
      setErrorMessage(null);
      setAttempts(0);
      onSuccess();
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        const newLockoutUntil = Date.now() + waitTime * 1000;
        setLockoutUntil(newLockoutUntil);
        setRemainingTime(waitTime);
        setErrorMessage(`Security lockout active. Try again in ${waitTime} seconds.`);
        setWaitTime((prev) => prev + 10);
        setAttempts(0);
      } else {
        const remaining = 3 - nextAttempts;
        setErrorMessage(`Incorrect passcode. ${remaining} attempt(s) remaining.`);
      }
      setPasswordInput('');
    }
  };

  const autofillKey = () => {
    if (isLocked) return;
    setPasswordInput('168168');
  };

  const triggerTestWrong = () => {
    if (isLocked) return;
    setPasswordInput('wrong_code');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-[#FBF9F6]">
      <div className="w-full max-w-md rounded-2xl border border-[#E7E1D6] bg-white p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        {/* Claude Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F1E8] border border-[#EAE3D6] shadow-2xs">
            {isLocked ? (
              <Clock className="h-6 w-6 text-[#CC785C] animate-pulse" />
            ) : (
              <ClaudeSparkIcon className="h-6 w-6 text-[#CC785C]" />
            )}
          </div>

          <h2 className="text-2xl font-serif font-medium tracking-tight text-[#191919]">
            Welcome to Claude
          </h2>
          <p className="mt-1 text-xs text-[#7A746B]">
            Enter your passcode to unlock your personal workspace
          </p>
        </div>

        {/* Lockout Banner */}
        {isLocked ? (
          <div className="mb-5 rounded-xl border border-[#F0D5CE] bg-[#FAF3F0] p-4 text-[#8C3A27]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-[#CC785C] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-medium text-[#191919]">Lockout in effect</p>
                <p className="font-mono font-bold text-[#CC785C] text-sm">
                  {remainingTime} seconds remaining
                </p>
                <p className="text-[11px] text-[#7A746B]">
                  Temporary hold to prevent repeated attempts.
                </p>
              </div>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-5 rounded-xl border border-[#EED7CE] bg-[#FDF7F5] p-3 text-xs text-[#9E4530]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#CC785C] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="chatbot-password-input"
                className="text-xs font-medium text-[#3D3A35]"
              >
                Passcode
              </label>
              <span className="text-[11px] text-[#8C8479]">
                Hint: 168168
              </span>
            </div>
            <div className="relative">
              <input
                id="chatbot-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={isLocked}
                placeholder={isLocked ? 'Please wait...' : 'Enter 6-digit passcode...'}
                className="w-full rounded-xl border border-[#E0D8CB] bg-[#FAF8F5] px-3.5 py-2.5 pl-10 text-sm text-[#191919] placeholder-[#9E978C] focus:border-[#CC785C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CC785C]/15 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-mono"
                autoComplete="current-password"
                required
              />
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#9E978C]" />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLocked}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#CC785C] hover:bg-[#BA674C] py-2.5 px-4 text-sm font-medium text-white shadow-xs hover:shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Unlock Workspace</span>
          </button>
        </form>

        {/* Quick Helper Buttons */}
        <div className="mt-6 pt-5 border-t border-[#EDE7DD]">
          <div className="text-[11px] font-medium text-[#8C8479] uppercase tracking-wider text-center mb-2">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="fill-demo-key-btn"
              type="button"
              onClick={autofillKey}
              disabled={isLocked}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E0D8CB] bg-[#FAF8F5] hover:bg-[#F2ECE1] px-3 py-1.5 text-xs text-[#4A453E] transition-colors disabled:opacity-40"
            >
              <KeyRound className="h-3 w-3 text-[#CC785C]" />
              <span>Autofill 168168</span>
            </button>

            <button
              id="test-wrong-pass-btn"
              type="button"
              onClick={triggerTestWrong}
              disabled={isLocked}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E0D8CB] bg-[#FAF8F5] hover:bg-[#F2ECE1] px-3 py-1.5 text-xs text-[#4A453E] transition-colors disabled:opacity-40"
            >
              <AlertTriangle className="h-3 w-3 text-[#CC785C]" />
              <span>Test Wrong Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
