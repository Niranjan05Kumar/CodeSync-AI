import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, LogIn, UserPlus } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen } = useUIStore();
  const { login, register, isAuthenticated, user, logout } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!username.trim()) {
          setError('Username is required');
          setIsLoading(false);
          return;
        }
        await register(username.trim(), email.trim(), password);
      }
      setAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div 
        className="fixed inset-0" 
        onClick={() => !isLoading && setAuthModalOpen(false)} 
      />

      <div className="relative w-full max-w-md bg-ide-elevated border border-ide-border rounded-lg shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-ide-border flex items-center justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-ide-blue flex items-center justify-center text-white font-bold text-xs">
              CS
            </div>
            <h2 className="text-ide-md font-semibold text-white">
              {isAuthenticated ? 'User Profile' : mode === 'login' ? 'Sign In to CodeSync' : 'Create an Account'}
            </h2>
          </div>
          <button
            onClick={() => !isLoading && setAuthModalOpen(false)}
            className="text-ide-muted hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If user is already logged in, show profile card with Logout option */}
        {isAuthenticated && user ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-ide-blue flex items-center justify-center text-white font-bold text-lg uppercase">
                {user.username.substring(0, 2)}
              </div>
              <div>
                <h3 className="text-ide-md font-semibold text-white">{user.username}</h3>
                <p className="text-ide-xs text-ide-dim">{user.email}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-ide-border flex justify-end gap-3">
              <button
                onClick={() => setAuthModalOpen(false)}
                className="px-4 py-2 rounded text-ide-sm text-ide-text hover:bg-[#2a2d2e] hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  logout();
                  setAuthModalOpen(false);
                }}
                className="px-4 py-2 rounded bg-red-800 hover:bg-red-700 text-white text-ide-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-red-300 text-ide-xs">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-ide-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="dev_user"
                    className="w-full pl-9 pr-3 py-2 bg-[#1e1e1e] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ide-muted absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#1e1e1e] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-ide-xs font-medium text-ide-text uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ide-muted absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#1e1e1e] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-ide-blue hover:bg-ide-blueHover text-white text-ide-sm font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-ide-xs text-ide-dim">
              {mode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('register');
                    }}
                    className="text-ide-blue hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('login');
                    }}
                    className="text-ide-blue hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
