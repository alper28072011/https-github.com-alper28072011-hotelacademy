
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, Lock, Mail, Eye, EyeOff, 
  ArrowRight, ShieldCheck, CheckCircle2, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useAppStore } from '../../stores/useAppStore';
import { loginUser, registerUser } from '../../services/authService';
import { getMyMemberships } from '../../services/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setLanguage, systemSettings } = useAppStore();
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
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Default Image Fallback
  const bgImage = systemSettings?.loginScreenImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200";

  useEffect(() => { setError(null); }, [authMode]);

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
      setError(err.message || "Giriş başarısız. Bilgilerini kontrol et.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username || !name) {
      setError("Lütfen tüm alanları doldur.");
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

  const changeLanguage = (code: any) => {
      setLanguage(code);
      setLangMenuOpen(false);
  };

  return (
    <div className="w-full max-w-5xl bg-white md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative min-h-[600px]">
      
      {/* MINIMAL LANG SELECTOR (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
          <div className="relative">
              <button 
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-bold text-gray-600 border border-gray-100"
              >
                  <Globe className="w-3.5 h-3.5" />
                  {i18n.language.toUpperCase()}
              </button>
              {langMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[120px] overflow-hidden">
                      {SUPPORTED_LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            onClick={() => changeLanguage(l.code)}
                            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"
                          >
                              <span>{l.flag}</span>
                              <span className={i18n.language === l.code ? 'font-bold text-primary' : 'text-gray-600'}>
                                  {l.nativeName}
                              </span>
                          </button>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* LEFT: FORM AREA - Updated for Vertical Centering */}
      <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center h-full">
        <div className="max-w-sm mx-auto w-full flex flex-col justify-center h-full">
            {/* Brand */}
            <div className="mb-10">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <span className="text-xl font-black tracking-tighter">H</span>
                </div>
                <h1 className="text-3xl font-extrabold text-text-main tracking-tight mb-2">
                    {authMode === 'LOGIN' ? t('login_title') : 'Kariyerini Başlat'}
                </h1>
                <p className="text-text-muted font-medium text-sm">
                    {authMode === 'LOGIN' ? 'Kaldığın yerden devam et.' : 'Profesyonel ağımıza katıl.'}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {authMode === 'LOGIN' ? (
                    <motion.form 
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleLogin}
                        className="space-y-5"
                    >
                        <Input 
                            label="Kullanıcı Adı"
                            icon={UserIcon}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="username"
                            required
                        />
                        <div className="relative">
                            <Input 
                                label="Şifre"
                                icon={Lock}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[38px] text-gray-400 hover:text-primary">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {error && (
                            <div className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" fullWidth size="lg" isLoading={isLoading} icon={<ArrowRight className="w-4 h-4" />}>
                                {t('btn_start') || 'Giriş Yap'}
                            </Button>
                        </div>
                    </motion.form>
                ) : (
                    <motion.form 
                        key="register"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleRegister}
                        className="space-y-4"
                    >
                        <Input label="Ad Soyad" icon={CheckCircle2} value={name} onChange={(e) => setName(e.target.value)} required />
                        <Input label="Kullanıcı Adı" icon={UserIcon} value={username} onChange={(e) => setUsername(e.target.value)} required />
                        <Input label="E-posta" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <Input label="Şifre" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

                        {error && <div className="text-xs text-red-500 font-bold">{error}</div>}

                        <Button type="submit" fullWidth size="lg" variant="secondary" isLoading={isLoading} icon={<ShieldCheck className="w-4 h-4" />}>
                            Kayıt Ol
                        </Button>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="mt-8 text-center">
                <button 
                    onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                    className="text-sm font-bold text-gray-500 hover:text-primary transition-colors"
                >
                    {authMode === 'LOGIN' ? "Hesabın yok mu? Kayıt Ol" : "Zaten üye misin? Giriş Yap"}
                </button>
            </div>
        </div>
      </div>

      {/* RIGHT: IMAGE AREA (Soft Overlay) */}
      <div className="hidden md:block w-1/2 bg-gray-50 relative p-4">
          <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-inner">
              <img 
                src={bgImage} 
                alt="Luxury Hotel" 
                className="w-full h-full object-cover transition-opacity duration-700"
              />
              {/* Soft Blue Overlay */}
              <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              <div className="absolute bottom-10 left-10 right-10 text-white">
                  <h2 className="text-3xl font-bold leading-tight mb-4 drop-shadow-lg">
                      Detaylardaki Mükemmellik.
                  </h2>
                  <p className="text-white/90 font-medium drop-shadow-md">
                      Hotel Academy ile ekibinizi güçlendirin, misafir deneyimini sanata dönüştürün.
                  </p>
              </div>
          </div>
      </div>

    </div>
  );
};
