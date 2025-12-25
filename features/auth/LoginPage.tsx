
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, Lock, Mail, Eye, EyeOff, 
  ArrowRight, ShieldCheck, CheckCircle2, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAppStore } from '../../stores/useAppStore';
import { loginUser, registerUser } from '../../services/authService';
import { getMyMemberships } from '../../services/db';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SUPPORTED_LANGUAGES } from '../../i18n/config';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setLanguage } = useAppStore();
  const { 
    authMode, setAuthMode, 
    isLoading, setLoading, 
    error, setError, 
    loginSuccess 
  } = useAuthStore();

  const [identifier, setIdentifier] = useState(''); 
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { setError(null); }, [authMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await loginUser(identifier, password);
      await getMyMemberships(user.id);
      loginSuccess(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Giriş başarısız.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await registerUser({ email, password, username, name });
      loginSuccess(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eff0f2] font-sans flex flex-col">
      
      {/* 1. THE BLUE BAR HEADER */}
      <div className="bg-[#3b5998] h-[82px] w-full border-b border-[#29487d] flex items-center justify-center">
          <div className="w-full max-w-[980px] px-4 flex justify-between items-center">
              <h1 className="text-white text-[34px] font-bold tracking-tighter">
                  facebook<span className="opacity-50 text-[10px] font-normal tracking-normal ml-1">pro</span>
              </h1>
              
              {/* Login Form in Header (Desktop) */}
              <div className="hidden md:flex items-center gap-2">
                  {authMode === 'LOGIN' && (
                      <form onSubmit={handleLogin} className="flex gap-2 items-start">
                          <div>
                              <label className="text-white text-[11px] block mb-1">E-posta veya Kullanıcı Adı</label>
                              <input 
                                  value={identifier} 
                                  onChange={e => setIdentifier(e.target.value)}
                                  className="border border-black/30 px-1 py-0.5 text-xs w-40"
                              />
                          </div>
                          <div>
                              <label className="text-white text-[11px] block mb-1">Şifre</label>
                              <input 
                                  type="password"
                                  value={password} 
                                  onChange={e => setPassword(e.target.value)}
                                  className="border border-black/30 px-1 py-0.5 text-xs w-40"
                              />
                              <div className="text-[#98a9ca] text-[9px] mt-1 cursor-pointer hover:underline">Şifreni mi unuttun?</div>
                          </div>
                          <button type="submit" className="mt-5 bg-[#4267b2] border border-[#29487d] text-white font-bold text-[11px] px-2 py-0.5 hover:bg-[#365899]">
                              Giriş Yap
                          </button>
                      </form>
                  )}
              </div>
          </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 w-full max-w-[980px] mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          
          {/* LEFT: PITCH */}
          <div className="flex-1 md:pr-10 pt-4">
              <h2 className="text-[#333] text-[20px] font-bold leading-tight mb-4 w-3/4">
                  Hotel Academy, otel çalışanları ile bağlantı kurmanı ve eğitim almanı sağlar.
              </h2>
              
              <div className="space-y-6 mt-8">
                  <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 shrink-0">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yB/r/lDrM2S2vY8C.png" className="opacity-80" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#333] text-[14px]">Eğitimleri İzle</h3>
                          <p className="text-[#666] text-[13px]">Kariyerinde yükselmek için gerekli dersleri tamamla.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 shrink-0">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yQ/r/333k9e7_8b5.png" className="opacity-80" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#333] text-[14px]">Ekip ile Bağlan</h3>
                          <p className="text-[#666] text-[13px]">Departmanındaki diğer arkadaşlarla iletişimde kal.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 shrink-0">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yZ/r/i7ewqYh0S6w.png" className="opacity-80" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#333] text-[14px]">Anlık Bildirimler</h3>
                          <p className="text-[#666] text-[13px]">Operasyonel görevlerden ve duyurulardan haberdar ol.</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT: REGISTER / MOBILE LOGIN */}
          <div className="w-full md:w-[350px]">
              <div className="bg-white border border-[#ccc] p-4">
                  <h2 className="text-[18px] font-bold text-[#333] mb-2">
                      {authMode === 'LOGIN' ? 'Giriş Yap' : 'Kaydol'}
                  </h2>
                  <p className="text-[#666] mb-4 text-[13px]">
                      {authMode === 'LOGIN' ? 'Devam etmek için giriş yapın.' : 'Ücretsizdir ve her zaman öyle kalacaktır.'}
                  </p>

                  <div className="space-y-3">
                      {authMode === 'REGISTER' && (
                          <>
                              <div className="flex gap-2">
                                  <Input placeholder="Ad Soyad" value={name} onChange={e => setName(e.target.value)} className="bg-[#f7f7f7]" />
                                  <Input placeholder="Kullanıcı Adı" value={username} onChange={e => setUsername(e.target.value)} className="bg-[#f7f7f7]" />
                              </div>
                              <Input placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#f7f7f7]" />
                              <Input type="password" placeholder="Yeni Şifre" value={password} onChange={e => setPassword(e.target.value)} className="bg-[#f7f7f7]" />
                          </>
                      )}

                      {/* Mobile Login Inputs (Hidden on Desktop Header) */}
                      {authMode === 'LOGIN' && (
                          <div className="md:hidden space-y-3">
                              <Input placeholder="E-posta veya Tel" value={identifier} onChange={e => setIdentifier(e.target.value)} className="p-2 text-lg" />
                              <Input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className="p-2 text-lg" />
                          </div>
                      )}

                      {error && <div className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 p-2">{error}</div>}

                      {authMode === 'REGISTER' ? (
                          <button onClick={handleRegister} className="w-full bg-[#69a74e] hover:bg-[#5b9342] text-white font-bold text-[16px] py-2 border border-[#3b6e22] shadow-sm">
                              Kaydol
                          </button>
                      ) : (
                          <button onClick={handleLogin} className="w-full bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold text-[14px] py-1.5 border border-[#29487d] shadow-sm md:hidden">
                              Giriş Yap
                          </button>
                      )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-[#ddd] text-center">
                        <span 
                            onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                            className="text-[#3b5998] text-[13px] cursor-pointer hover:underline font-bold"
                        >
                            {authMode === 'LOGIN' ? "Hesap Oluştur" : "Zaten hesabın var mı?"}
                        </span>
                  </div>
              </div>
              <div className="mt-4 text-center text-[11px] text-[#666]">
                  <span className="font-bold">Hotel Academy © 2008-2025</span>
              </div>
          </div>
      </div>
    </div>
  );
};
