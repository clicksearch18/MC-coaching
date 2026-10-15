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
    <div className="min-h-dvh bg-[#090A0F] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-[420px] h-[420px] rounded-full bg-sky-500/8 blur-[120px] pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2" />

      <div className="w-full max-w-sm z-10 space-y-6">
        {/* Minimal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-sky-500/20">
            MC
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Market Concussion
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign in to your workspace
            </p>
          </div>
        </div>

        {/* Clean Role Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#11131C] border border-white/8">
          <button
            type="button"
            onClick={() => {
              setLoginTab('STUDENT');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginTab === 'STUDENT'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
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
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loginTab === 'ADMIN'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Clean Login Panel */}
        <div className="glass-panel rounded-2xl p-6 space-y-4 border border-white/10">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-500/25 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {loginTab === 'STUDENT' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email or Access Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={studentIdentifier}
                    onChange={e => setStudentIdentifier(e.target.value)}
                    placeholder="Enter email or access code"
                    autoComplete="username"
                    className="w-full rounded-xl bg-[#0B0D14] border border-white/12 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="coach@marketconcussion.com"
                    autoComplete="username"
                    className="w-full rounded-xl bg-[#0B0D14] border border-white/12 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={e => setAdminPasscode(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-[#0B0D14] border border-white/12 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
