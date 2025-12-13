import React, { useState } from 'react';
import { Lock, Mail, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export const AdminLoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginAsAdmin, isLoading, error } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await loginAsAdmin(email, password);
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-inner">
             <Lock className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-widest uppercase">Vault Access</h3>
          <p className="text-gray-400 text-xs mt-1">Authorized Management Only</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative group">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
            <input 
                type="email" 
                placeholder="admin@hotelacademy.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 focus:bg-black/60 transition-all font-mono text-sm"
            />
        </div>

        <div className="relative group">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
            <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 focus:bg-black/60 transition-all font-mono text-sm"
            />
        </div>

        {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-lg flex items-center gap-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Invalid credentials. Access denied.
            </div>
        )}

        <button 
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    Secure Login <ChevronRight className="w-4 h-4" />
                </>
            )}
        </button>
      </form>
    </div>
  );
};