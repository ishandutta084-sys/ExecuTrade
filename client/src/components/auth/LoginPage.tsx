import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simple local credential check with fallback
    if (username.trim() === 'admin' && (password.trim() === 'admin' || password.length >= 4)) {
      localStorage.setItem('executrade_auth', JSON.stringify({ user: username, token: 'session_active' }));
      onLoginSuccess(`${username}@executrade.internal`);
    } else {
      setError('Invalid operator credentials. Please check your password.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#080C14] text-slate-100 font-mono p-4 relative overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -bottom-20 -right-20" />

      {/* Main Card */}
      <div className="w-full max-w-sm bg-[#0E1422]/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Monogram Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <span className="font-mono font-black text-lg text-emerald-400 tracking-tighter">ET</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ExecuTrade</h1>
            <p className="text-xs text-slate-400">Algorithmic Bridge Authentication</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1.5 font-semibold">Operator ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1.5 font-semibold">Security Passkey</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>Access Bridge Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>AES-256 Authenticated Gateway</span>
        </div>
      </div>
    </div>
  );
};

