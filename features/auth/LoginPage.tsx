import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, ShieldCheck, User as UserIcon, Building2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth, RecaptchaVerifier } from '../../services/firebase';
import { checkUserExists, registerUser, initiatePhoneAuth } from '../../services/authService';
import { DepartmentType } from '../../types';
import { PhoneInput } from './components/PhoneInput';

// Admin "Backdoor" Number
const ADMIN_PHONE = '+905417726743';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    step, setStep, 
    phoneNumber, setPhoneNumber, 
    verificationId, setVerificationId,
    isLoading, setLoading,
    error, setError,
    loginSuccess,
    authMode, setAuthMode,
    recordSmsAttempt, cooldownUntil
  } = useAuthStore();

  // Profile Setup State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<DepartmentType | null>(null);
  const [otpCode, setOtpCode] = useState('');

  // Local cooldown check
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
      // Check block status periodically
      const checkBlock = () => {
          setIsBlocked(Date.now() < cooldownUntil);
      };
      checkBlock();
      const interval = setInterval(checkBlock, 1000);
      return () => clearInterval(interval);
  }, [cooldownUntil]);

  useEffect(() => {
    // Initialize invisible recaptcha only on PHONE step
    if (step === 'PHONE') {
        const initRecaptcha = async () => {
            try {
                // Check if element exists
                const container = document.getElementById('recaptcha-container');
                if (!container) return;

                // Clear existing instance to prevent "auth/internal-error" or detached DOM issues
                if ((window as any).recaptchaVerifier) {
                    try {
                        (window as any).recaptchaVerifier.clear();
                    } catch(e) { /* ignore */ }
                    (window as any).recaptchaVerifier = null;
                }

                // Create new instance
                (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {
                        // reCAPTCHA solved
                    }
                });
            } catch (e) {
                console.error("Recaptcha Init Error:", e);
            }
        };
        
        initRecaptcha();
    }

    // Cleanup
    return () => {
        if ((window as any).recaptchaVerifier) {
            try {
                (window as any).recaptchaVerifier.clear();
            } catch(e) { /* ignore */ }
            (window as any).recaptchaVerifier = null;
        }
    };
  }, [step]);

  // --- HANDLERS ---

  const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isBlocked) {
          setError("Çok fazla deneme yaptınız. Lütfen bekleyin.");
          return;
      }

      // Basic validation
      if (phoneNumber.length < 10) {
          setError("Lütfen geçerli bir numara girin.");
          return;
      }

      // Rate Limiting Check
      const allowed = recordSmsAttempt();
      if (!allowed) {
          setError("Güvenlik nedeniyle işleminiz 5 dakika durduruldu.");
          setIsBlocked(true);
          return;
      }

      setLoading(true);
      setError(null);

      // Clean number (whitespace removal is handled in PhoneInput visually, but safeguard here)
      let cleanNumber = phoneNumber.replace(/\s/g, '');

      try {
          const appVerifier = (window as any).recaptchaVerifier;
          if (!appVerifier) throw new Error("ReCAPTCHA not initialized");

          // SMART AUTH LOGIC: Check DB before SMS
          const confirmationResult = await initiatePhoneAuth(cleanNumber, authMode, appVerifier);
          
          // Store ID and Number
          setVerificationId(confirmationResult.verificationId);
          setPhoneNumber(cleanNumber);
          
          // Move to next step
          setLoading(false);
          setStep('OTP');
          
          // Attach confirmation result to window
          (window as any).confirmationResult = confirmationResult;

      } catch (err: any) {
          console.error("Auth Error:", err);
          setLoading(false);
          
          if (err.message === 'ACCOUNT_NOT_FOUND') {
              setError("Bu numara kayıtlı değil. Lütfen 'Kayıt Ol' sekmesini kullanın.");
          } else if (err.message === 'ACCOUNT_EXISTS') {
              setError("Bu numara zaten kayıtlı. Lütfen giriş yapın.");
          } else if (err.code === 'auth/too-many-requests') {
              setError("Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.");
          } else {
              setError("İşlem başarısız. Lütfen bilgilerinizi kontrol edin.");
          }

          // Reset recaptcha on error to allow retry
          if((window as any).recaptchaVerifier) {
              try {
                  (window as any).recaptchaVerifier.clear();
                  (window as any).recaptchaVerifier = null;
                  // Re-init happens via useEffect dependency if needed, or simple reload logic
              } catch (e) {}
          }
      }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (otpCode.length !== 6) return;

      setLoading(true);
      setError(null);

      try {
          const confirmationResult = (window as any).confirmationResult;
          if (!confirmationResult) throw new Error("Session expired");

          await confirmationResult.confirm(otpCode);
          
          // Auth Successful - Check if User Exists in DB (Double Check)
          const existingUser = await checkUserExists(phoneNumber);

          if (existingUser) {
              loginSuccess(existingUser);
          } else {
              // Only if in Register mode should we reach here ideally
              setStep('PROFILE_SETUP');
              setLoading(false);
          }

      } catch (err: any) {
          console.error("OTP Error:", err);
          setLoading(false);
          setError("Hatalı kod. Tekrar deneyin.");
      }
  };

  const handleRegister = async () => {
      if (!name || !department) {
          setError("Lütfen tüm alanları doldurun.");
          return;
      }
      setLoading(true);

      try {
          const role = phoneNumber === ADMIN_PHONE ? 'admin' : 'staff';
          const avatarInitials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

          const newUser = await registerUser({
              phoneNumber,
              name,
              department,
              role,
              avatar: avatarInitials,
              xp: 0,
              completedCourses: [],
              badges: [],
              pin: '1234', // Default pin
              currentOrganizationId: null,
              organizationHistory: []
          });

          loginSuccess(newUser);

      } catch (err) {
          console.error("Registration Error:", err);
          setLoading(false);
          setError("Kayıt oluşturulamadı.");
      }
  };

  const switchMode = (mode: 'LOGIN' | 'REGISTER') => {
      setAuthMode(mode);
      setError(null);
  };

  // --- RENDER HELPERS ---

  return (
    <div className="w-full min-h-[85vh] flex flex-col items-center justify-center p-6 relative">
        <div id="recaptcha-container"></div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-primary text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-primary/20 mb-4">
                    <span className="text-4xl font-bold">H</span>
                </div>
                <h1 className="text-2xl font-bold text-primary tracking-tight">Hotel Academy</h1>
                <p className="text-gray-400 text-sm mt-1">Enterprise Staff Access</p>
            </div>

            {/* Blocked State */}
            {isBlocked && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 mb-6 animate-pulse">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <div className="text-xs font-bold">
                        Güvenlik kilitlenmesi. Lütfen {Math.ceil((cooldownUntil - Date.now()) / 1000 / 60)} dakika bekleyin.
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {/* STEP 1: PHONE INPUT & MODE SELECTION */}
                {step === 'PHONE' && !isBlocked && (
                    <motion.div
                        key="phone-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl mb-6 relative">
                            <motion.div 
                                layoutId="activeTab"
                                className={`absolute inset-y-1 w-1/2 bg-white rounded-lg shadow-sm`}
                                animate={{ x: authMode === 'LOGIN' ? 0 : '100%' }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                            <button 
                                onClick={() => switchMode('LOGIN')}
                                className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${authMode === 'LOGIN' ? 'text-primary' : 'text-gray-500'}`}
                            >
                                Giriş Yap
                            </button>
                            <button 
                                onClick={() => switchMode('REGISTER')}
                                className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${authMode === 'REGISTER' ? 'text-primary' : 'text-gray-500'}`}
                            >
                                Kayıt Ol
                            </button>
                        </div>

                        <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
                            <PhoneInput 
                                value={phoneNumber}
                                onChange={setPhoneNumber}
                                disabled={isLoading}
                            />

                            <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
                                <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                                <p>Numaranız yalnızca doğrulama ve güvenli erişim için kullanılacaktır.</p>
                            </div>

                            {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                            <button 
                                type="submit" 
                                disabled={isLoading || phoneNumber.length < 10}
                                className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>SMS Gönder <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>
                    </motion.div>
                )}

                {/* STEP 2: OTP INPUT */}
                {step === 'OTP' && (
                    <motion.form 
                        key="otp"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleVerifyOtp}
                        className="flex flex-col gap-6"
                    >
                        <div className="text-center mb-2">
                            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-80" />
                            <h2 className="text-xl font-bold text-gray-800">Kodu Doğrula</h2>
                            <p className="text-gray-500 text-sm">{phoneNumber} numarasına gönderilen kodu girin.</p>
                        </div>

                        <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000000"
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 text-center text-3xl tracking-[0.5em] font-bold text-gray-800 placeholder-gray-200 focus:outline-none focus:border-primary transition-all shadow-sm"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                            autoFocus
                        />

                        {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</div>}

                        <button 
                            type="submit" 
                            disabled={isLoading || otpCode.length !== 6}
                            className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Doğrula & Giriş Yap"}
                        </button>
                        
                        <button type="button" onClick={() => setStep('PHONE')} className="text-gray-400 text-sm font-medium hover:text-gray-600 underline">
                            Numarayı Değiştir
                        </button>
                    </motion.form>
                )}

                {/* STEP 3: PROFILE SETUP */}
                {step === 'PROFILE_SETUP' && (
                    <motion.div 
                        key="profile"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="text-center mb-2">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Hoş Geldin!</h2>
                            <p className="text-gray-500 text-sm">Hesabını tamamlayalım.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Adın Soyadın</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Örn: Ayşe Yılmaz"
                                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary transition-all"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Departman</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['housekeeping', 'kitchen', 'front_office', 'management'].map(dept => (
                                        <button
                                            key={dept}
                                            onClick={() => setDepartment(dept as any)}
                                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${department === dept ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                                        >
                                            {dept.toUpperCase().replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</div>}

                        <button 
                            onClick={handleRegister}
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary-light text-white text-lg font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Kaydı Tamamla"}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    </div>
  );
};