
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { loginUser, registerUser } from '../../services/authService';
import { getMyMemberships } from '../../services/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
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

  // Clear errors on mode switch
  useEffect(() => {
      setError(null);
  }, [authMode]);

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

  return (
    <div className="min-h-screen w-full flex bg-surface">
      
      {/* LEFT SIDE: FORM (Scrollable on mobile, Fixed on Desktop) */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 lg:p-20 bg-white relative z-10">
        
        <div className="w-full max-w-sm space-y-8">
            
            {/* BRAND HEADER */}
            <div className="text-center md:text-left space-y-2">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-block"
                >
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl flex items-center justify-center shadow-soft mb-4 mx-auto md:mx-0">
                        <span className="text-2xl font-extrabold tracking-tighter">H</span>
                    </div>
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                    {authMode === 'LOGIN' ? 'Tekrar Hoş Geldiniz' : 'Aramıza Katılın'}
                </h1>
                <p className="text-gray-500 font-medium">
                    {authMode === 'LOGIN' 
                        ? 'Kariyer yolculuğunuza kaldığınız yerden devam edin.' 
                        : 'Profesyonel gelişim platformuna adım atın.'}
                </p>
            </div>

            {/* FORM AREA */}
            <AnimatePresence mode="wait">
                {authMode === 'LOGIN' ? (
                    <motion.form 
                        key="login"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onSubmit={handleLogin}
                        className="space-y-5"
                    >
                        <Input 
                            label="Kullanıcı Adı veya E-posta"
                            icon={UserIcon}
                            placeholder="kullaniciadi"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />

                        <div className="relative">
                            <Input 
                                label="Şifre"
                                icon={Lock}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-gray-400 hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="flex justify-end">
                            <button type="button" className="text-xs font-bold text-primary hover:text-primary-hover transition-colors">
                                Şifreni mi unuttun?
                            </button>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error}
                            </motion.div>
                        )}

                        <Button 
                            type="submit" 
                            fullWidth 
                            size="lg" 
                            isLoading={isLoading}
                            icon={<ArrowRight className="w-5 h-5" />}
                        >
                            Giriş Yap
                        </Button>
                    </motion.form>
                ) : (
                    <motion.form 
                        key="register"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onSubmit={handleRegister}
                        className="space-y-4"
                    >
                        <Input 
                            label="Ad Soyad"
                            icon={CheckCircle2}
                            placeholder="Ad Soyad"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Input 
                            label="Kullanıcı Adı"
                            icon={UserIcon}
                            placeholder="kullaniciadi"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                            required
                        />
                        <Input 
                            label="E-posta"
                            icon={Mail}
                            type="email"
                            placeholder="ad@sirket.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="relative">
                            <Input 
                                label="Şifre"
                                icon={Lock}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-gray-400 hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
                                {error}
                            </motion.div>
                        )}

                        <Button 
                            type="submit" 
                            fullWidth 
                            size="lg" 
                            variant="secondary"
                            isLoading={isLoading}
                            icon={<ShieldCheck className="w-5 h-5" />}
                        >
                            Hesap Oluştur
                        </Button>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* SWITCH MODE */}
            <div className="text-center pt-4">
                <p className="text-sm text-gray-500 font-medium">
                    {authMode === 'LOGIN' ? "Hesabın yok mu?" : "Zaten üye misin?"}{' '}
                    <button 
                        onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                        className="text-primary font-bold hover:underline"
                    >
                        {authMode === 'LOGIN' ? "Şimdi Kayıt Ol" : "Giriş Yap"}
                    </button>
                </p>
            </div>

            {/* Footer Info */}
            <div className="pt-8 text-center md:text-left">
                <p className="text-[10px] text-gray-400">
                    Otomatik dil algılama aktiftir: <span className="font-bold uppercase text-gray-500">{i18n.language}</span>
                </p>
            </div>
        </div>
      </div>

      {/* RIGHT SIDE: IMAGE (Hidden on Mobile) */}
      <div className="hidden md:block w-1/2 relative overflow-hidden bg-primary">
          <img 
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000" 
            alt="Hotel Luxury" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-20 text-white">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                  <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">
                      Mükemmellik <br/> detaylarda gizlidir.
                  </h2>
                  <p className="text-lg text-white/80 max-w-md font-medium leading-relaxed">
                      Hotel Academy ile ekibinizin potansiyelini ortaya çıkarın ve misafir deneyimini sanata dönüştürün.
                  </p>
                  
                  <div className="flex gap-2 mt-8">
                      <div className="w-12 h-1 bg-accent rounded-full" />
                      <div className="w-3 h-1 bg-white/30 rounded-full" />
                      <div className="w-3 h-1 bg-white/30 rounded-full" />
                  </div>
              </motion.div>
          </div>
      </div>

    </div>
  );
};
