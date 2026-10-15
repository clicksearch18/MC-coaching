import React, { useState } from 'react';
import { ShieldCheck, UserCheck, ArrowRight, KeyRound, Mail, Sparkles } from 'lucide-react';
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
  const [adminEmail, setAdminEmail] = useState('josh@marketconcussion.com');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const query = studentIdentifier.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Please enter your Student Email or Access Code.');
      return;
    }

    const matched = students.find(
      s =>
        s.email?.toLowerCase() === query ||
        s.accessCode?.toLowerCase() === query ||
        s.id.toLowerCase() === query ||
        s.name.toLowerCase().includes(query)
    );

    if (!matched) {
      setErrorMsg('No student found with that email or access code. Try one of the quick-access profiles below.');
      return;
    }

    onLoginStudent(matched.id);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = adminPasscode.trim().toLowerCase();
    if (code && code !== 'concussion' && code !== 'admin' && code !== 'cam005') {
      setErrorMsg('Invalid Coach Passcode. Use "concussion" (or click Quick Admin Sign-In below).');
      return;
    }
    onLoginAdmin();
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="w-[520px] h-[520px] rounded-full bg-sky-500/10 blur-[130px] pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Identity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CAM-005 · Build The Machine OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Market Concussion
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Select your portal to access your 10-minute daily Concussion Content studio or the Coach & Admin Command Center.
          </p>
        </div>

        {/* Portal Role Switcher (`/student` vs `/admin`) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#11131C] border border-white/10">
          <button
            type="button"
            onClick={() => {
              setLoginTab('STUDENT');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginTab === 'STUDENT'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginTab('ADMIN');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginTab === 'ADMIN'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Coach / Admin</span>
          </button>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {loginTab === 'STUDENT' ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Student Dashboard Login</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter the Student Email or Access Code provided by Coach Josh.
                </p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Student Email or Access Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={studentIdentifier}
                      onChange={e => setStudentIdentifier(e.target.value)}
                      placeholder="e.g., ELENA-02 or elena@apexhealth.com"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <span>Enter My Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Demo Student Access Pills */}
              <div className="pt-4 border-t border-white/8 space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Cohort Profiles (1-Click Student Login):
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {students.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onLoginStudent(st.id)}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.02] hover:bg-sky-500/10 border border-white/8 hover:border-sky-500/30 transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {st.avatar}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{st.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {st.company} · Lesson {st.currentWeek}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/8 text-[10px] font-mono text-sky-300 shrink-0">
                        {st.accessCode || 'LOGIN'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Coach & Admin Command Login</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Onboard new students, upload custom <code className="text-sky-300">.xlsx</code> content plans, edit Lessons 1–26, and manage daily accountability.
                </p>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Coach Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin Passcode (Default: <code className="text-sky-400">concussion</code>)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={adminPasscode}
                      onChange={e => setAdminPasscode(e.target.value)}
                      placeholder="Enter admin passcode..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In to Coach & Admin Dashboard</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* Route Path Reference Footer */}
        <div className="text-center text-[11px] text-slate-500 space-x-3">
          <span>Direct Paths:</span>
          <a href="/login" className="text-slate-400 hover:text-sky-400 underline">/login</a>
          <span>·</span>
          <a href="/student" className="text-slate-400 hover:text-sky-400 underline">/student</a>
          <span>·</span>
          <a href="/admin" className="text-slate-400 hover:text-sky-400 underline">/admin</a>
        </div>
      </div>
    </div>
  );
};
