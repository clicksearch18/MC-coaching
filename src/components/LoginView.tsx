import React, { useState } from 'react';
import { ShieldCheck, UserCheck, ArrowRight, KeyRound, Mail } from 'lucide-react';
import { StudentProfile } from '../types';

interface LoginViewProps {
  students: StudentProfile[];
  initialMode?: 'STUDENT' | 'ADMIN';
  onLoginStudent: (studentId: string) => void;
  onLoginAdmin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  students,
  initialMode = 'STUDENT',
  onLoginStudent,
  onLoginAdmin
}) => {
  const [loginTab, setLoginTab] = useState<'STUDENT' | 'ADMIN'>(initialMode);
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const query = studentIdentifier.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Enter your email or access code.');
      return;
    }

    const matched = students.find(
      s =>
        s.email?.toLowerCase() === query ||
        s.accessCode?.toLowerCase() === query ||
        s.id.toLowerCase() === query
    );

    if (!matched) {
      setErrorMsg('Invalid email or access code.');
      return;
    }

    onLoginStudent(matched.id);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = adminPasscode.trim().toLowerCase();
    if (!code || (code !== 'concussion' && code !== 'admin' && code !== 'cam005')) {
      setErrorMsg('Invalid admin passcode.');
      return;
    }
    onLoginAdmin();
  };

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Subtle top-center cyan ambient glow matching joshbeechraft.com */}
      <div className="w-[500px] h-[360px] rounded-full bg-[#09ADEF]/10 blur-[130px] pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" />

      {/* Top Brand Wordmark Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10">
        <div className="font-display text-2xl sm:text-3xl tracking-wide select-none">
          <span className="text-[#09ADEF]">JOSH</span>{' '}
          <span className="text-white">BEECHRAFT</span>
        </div>
        <span className="eyebrow-pill px-3.5 py-1 rounded-full text-[10px]">
          2MMSHIFT OS
        </span>
      </header>

      {/* Main Centered Login Card */}
      <main className="w-full max-w-sm mx-auto my-auto py-8 z-10 space-y-6">
        {/* 2mmShift Hero Eyebrow & Two-Tone Condensed Headline */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-6 h-[1.5px] bg-[#09ADEF]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
              2MMSHIFT ARCHITECT
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            <span className="block text-white">MARKET CONCUSSION.</span>
            <span className="block text-[#09ADEF]">BUILD THE MACHINE.</span>
          </h1>
        </div>

        {/* Clean Role Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#07090D] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setLoginTab('STUDENT');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginTab === 'STUDENT'
                ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginTab('ADMIN');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginTab === 'ADMIN'
                ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Clean Obsidian Login Panel */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/25 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {loginTab === 'STUDENT' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] mb-2">
                  Student Email or Access Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={studentIdentifier}
                    onChange={e => setStudentIdentifier(e.target.value)}
                    placeholder="Enter email or access code"
                    autoComplete="username"
                    className="w-full rounded-lg bg-[#040507] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 rounded-lg btn-2mm text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] mb-2">
                  Coach Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="josh@2mmshift.com"
                    autoComplete="username"
                    className="w-full rounded-lg bg-[#040507] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] mb-2">
                  Admin Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={e => setAdminPasscode(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-lg bg-[#040507] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 rounded-lg btn-2mm text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Unlock Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center z-10">
        <span className="text-[11px] text-neutral-600">
          © Josh Beechraft. 2mmShift Architect.
        </span>
      </footer>
    </div>
  );
};
