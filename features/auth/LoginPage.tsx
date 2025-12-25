
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
      
      {/* 1. CORBIT HEADER */}
      <div className="bg-[#3b5998] h-[82px] w-full border-b border-[#29487d] flex items-center justify-center shadow-md z-10">
          <div className="w-full max-w-[980px] px-4 flex justify-between items-center">
              <h1 className="text-white text-[34px] font-bold tracking-tighter flex items-center gap-2">
                  Corbit<span className="opacity-70 text-[10px] font-normal tracking-wide bg-white/20 px-2 py-0.5 rounded-full">EARLY ACCESS</span>
              </h1>
              
              {/* Login Form in Header (Desktop) */}
              <div className="hidden md:flex items-center gap-2">
                  {authMode === 'LOGIN' && (
                      <form onSubmit={handleLogin} className="flex gap-2 items-start">
                          <div>
                              <label className="text-white/80 text-[11px] block mb-1">E-posta veya Kullanıcı Adı</label>
                              <input 
                                  value={identifier} 
                                  onChange={e => setIdentifier(e.target.value)}
                                  className="border border-[#29487d] bg-white text-[#1c1e21] px-2 py-1 text-xs w-40 rounded-sm focus:ring-1 focus:ring-white/50"
                              />
                          </div>
                          <div>
                              <label className="text-white/80 text-[11px] block mb-1">Şifre</label>
                              <input 
                                  type="password"
                                  value={password} 
                                  onChange={e => setPassword(e.target.value)}
                                  className="border border-[#29487d] bg-white text-[#1c1e21] px-2 py-1 text-xs w-40 rounded-sm focus:ring-1 focus:ring-white/50"
                              />
                              <div className="text-[#98a9ca] text-[9px] mt-1 cursor-pointer hover:underline hover:text-white">Şifreni mi unuttun?</div>
                          </div>
                          <button type="submit" className="mt-5 bg-[#4267b2] border border-[#29487d] text-white font-bold text-[11px] px-4 py-1 hover:bg-[#365899] transition-colors rounded-sm shadow-sm">
                              Giriş Yap
                          </button>
                      </form>
                  )}
              </div>
          </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 w-full max-w-[980px] mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
          
          {/* LEFT: PITCH */}
          <div className="flex-1 md:pr-10 pt-4">
              <h2 className="text-[#333] text-[24px] font-bold leading-tight mb-4 w-4/5">
                  Corbit, kendinizi geliştirmeniz ve yeni yetenekler keşfetmeniz için tasarlandı.
              </h2>
              <p className="text-[#666] text-[15px] leading-relaxed mb-8">
                  Milyonlarca kullanıcı gibi siz de Corbit ekosistemine katılarak potansiyelinizi açığa çıkarın.
              </p>
              
              <div className="space-y-8 mt-12">
                  <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yB/r/lDrM2S2vY8C.png" className="w-8 h-8 opacity-90" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#1c1e21] text-[16px]">Kişiselleştirilmiş Eğitim</h3>
                          <p className="text-[#65676b] text-[14px]">Size özel hazırlanan müfredat ile hızla ilerleyin.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yQ/r/333k9e7_8b5.png" className="w-8 h-8 opacity-90" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#1c1e21] text-[16px]">Sosyal Öğrenme Ağı</h3>
                          <p className="text-[#65676b] text-[14px]">Eğitmenler ve diğer öğrencilerle bağlantı kurun.</p>
                      </div>
                  </div>
                  <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                          <img src="https://static.xx.fbcdn.net/rsrc.php/v3/yZ/r/i7ewqYh0S6w.png" className="w-8 h-8 opacity-90" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#1c1e21] text-[16px]">Sertifikalı Gelişim</h3>
                          <p className="text-[#65676b] text-[14px]">Başarılarınızı rozetler ve sertifikalarla taçlandırın.</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT: REGISTER / MOBILE LOGIN */}
          <div className="w-full md:w-[380px]">
              <div className="bg-white border border-[#dfe3ee] rounded-lg p-6 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3b5998] to-[#8b9dc3]"></div>
                  
                  <h2 className="text-[20px] font-bold text-[#1c1e21] mb-2">
                      {authMode === 'LOGIN' ? 'Giriş Yap' : 'Hesap Oluştur'}
                  </h2>
                  <p className="text-[#606770] mb-6 text-[14px]">
                      {authMode === 'LOGIN' ? 'Kaldığınız yerden devam edin.' : 'Hızlı, kolay ve ücretsiz.'}
                  </p>

                  <div className="space-y-4">
                      {authMode === 'REGISTER' && (
                          <>
                              <div className="flex gap-3">
                                  <Input placeholder="Ad Soyad" value={name} onChange={e => setName(e.target.value)} className="bg-[#f5f6f7] border-[#ccd0d5] text-[14px] py-2" />
                                  <Input placeholder="Kullanıcı Adı" value={username} onChange={e => setUsername(e.target.value)} className="bg-[#f5f6f7] border-[#ccd0d5] text-[14px] py-2" />
                              </div>
                              <Input placeholder="E-posta Adresi" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#f5f6f7] border-[#ccd0d5] text-[14px] py-2" />
                              <Input type="password" placeholder="Yeni Şifre" value={password} onChange={e => setPassword(e.target.value)} className="bg-[#f5f6f7] border-[#ccd0d5] text-[14px] py-2" />
                          </>
                      )}

                      {/* Mobile Login Inputs */}
                      {authMode === 'LOGIN' && (
                          <div className="md:hidden space-y-4">
                              <Input placeholder="E-posta veya Kullanıcı Adı" value={identifier} onChange={e => setIdentifier(e.target.value)} className="p-3 text-[16px] bg-[#f5f6f7]" />
                              <Input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className="p-3 text-[16px] bg-[#f5f6f7]" />
                          </div>
                      )}

                      {error && (
                          <div className="text-red-600 text-[13px] font-bold border border-red-200 bg-red-50 p-3 rounded flex items-center gap-2">
                              <div className="w-1 h-4 bg-red-600 rounded-full"></div>
                              {error}
                          </div>
                      )}

                      {authMode === 'REGISTER' ? (
                          <button onClick={handleRegister} className="w-full bg-[#42b72a] hover:bg-[#36a420] text-white font-bold text-[18px] py-2.5 rounded-md shadow-md transition-all active:scale-[0.98]">
                              Kaydol
                          </button>
                      ) : (
                          <button onClick={handleLogin} className="w-full bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold text-[18px] py-2.5 rounded-md shadow-md md:hidden transition-all active:scale-[0.98]">
                              Giriş Yap
                          </button>
                      )}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-[#e5e5e5] text-center">
                        <span 
                            onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                            className="text-[#3b5998] text-[14px] cursor-pointer hover:underline font-bold"
                        >
                            {authMode === 'LOGIN' ? "Corbit'te yeni misin? Hesap Oluştur" : "Zaten hesabın var mı? Giriş Yap"}
                        </span>
                  </div>
              </div>
              <div className="mt-4 text-center text-[12px] text-[#777]">
                  <span className="font-bold hover:underline cursor-pointer">Corbit © 2025</span> · <span className="hover:underline cursor-pointer">Gizlilik</span> · <span className="hover:underline cursor-pointer">Şartlar</span>
              </div>
          </div>
      </div>
    </div>
  );
};
