import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle, Shield } from 'lucide-react';

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
      setError('Invalid operator credentials. Enter operator ID and passkey.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-canvas text-primary font-sans p-4 select-none">
      {/* Centered Ticket Slip Card */}
      <div className="w-full max-w-sm bg-surface border border-hairline rounded-panel p-6 shadow-none space-y-5">
        {/* Monogram Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-8 h-8 rounded-control border border-hairline flex items-center justify-center bg-raised text-brass font-mono font-semibold text-xs tracking-tighter">
            ET
          </div>
          <div>
            <h1 className="text-base font-semibold text-primary tracking-tight">ExecuTrade</h1>
            <p className="text-xs text-secondary">Operator Authentication</p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-control bg-sell/10 border border-sell/30 text-sell text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] font-medium text-secondary mb-1 block">Operator ID</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full pl-8 pr-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary focus:outline-none focus:border-brass transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-secondary mb-1 block">Security Passkey</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-8 pr-2.5 py-1.5 rounded-control bg-raised border border-hairline font-mono text-xs text-primary focus:outline-none focus:border-brass transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-control bg-brass hover:bg-brassHover text-[#121110] font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
          >
            <span>Access Bridge Console</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </form>

        <div className="pt-3 border-t border-hairline flex items-center justify-center gap-1.5 text-tiny font-mono text-tertiary">
          <Shield className="w-3 h-3" strokeWidth={1.5} />
          <span>Local Gateway • Session Security</span>
        </div>
      </div>
    </div>
  );
};
