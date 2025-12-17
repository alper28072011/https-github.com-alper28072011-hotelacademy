
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { loginUser, registerUser } from '../../services/authService';
import { getMyMemberships } from '../../services/db';

export const LoginPage: React.FC = () => {
  const { 
    authMode, setAuthMode, 
    isLoading, setLoading, 
    error, setError, 
    loginSuccess 
  } = useAuthStore();
  const { switchOrganization } = useOrganizationStore();

  const [identifier, setIdentifier] = useState(''); 
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setLoading(true);
    setError(null);

    try {
      const user = await loginUser(identifier, password);
      await getMyMemberships(user.id);
      if (user.currentOrganizationId) {
        await switchOrganization(user.currentOrganizationId);
      }
      loginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username || !name) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await registerUser({ email, password, username, name });
      loginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Kayıt sırasında bir hata oluştu.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-primary text-white rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-primary/20 mb-6"
        >
          <span className="text-4xl font-bold text-accent">H</span>
        </motion.div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Hotel Academy</h1>
        <p className="text-gray-500 mt-2">Profesyonellerin Buluşma Noktası</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden relative">
        <div className="flex p-2 bg-gray-50 border-b border-gray-100">
          <button 
            onClick={() => setAuthMode('LOGIN')}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${authMode === 'LOGIN' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Giriş Yap
          </button>
          <button 
            onClick={() => setAuthMode('REGISTER')}
            className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${authMode === 'REGISTER' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Kayıt Ol
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {authMode === 'LOGIN' ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Kullanıcı Adı veya E-posta</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="kullaniciadi veya e-posta"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Şifre</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-12 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-light text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <React.Fragment>Giriş Yap <ArrowRight className="w-5 h-5" /></React.Fragment>}
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Ad Soyad</label>
                  <div className="relative group">
                    <CheckCircle2 className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ayşe Yılmaz"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Kullanıcı Adı</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="ayse_hotel"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-posta</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ayse@otel.com"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Şifre</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3 pl-12 pr-12 font-bold text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-accent hover:bg-accent-dark text-primary font-bold py-4 rounded-2xl shadow-xl shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <React.Fragment>Hesap Oluştur <ShieldCheck className="w-5 h-5" /></React.Fragment>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-400 text-xs px-8">
          Devam ederek <span className="text-gray-600 font-bold underline">Kullanım Koşullarını</span> ve <span className="text-gray-600 font-bold underline">Gizlilik Politikamızı</span> kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
};
