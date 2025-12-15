
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Phone, ShieldCheck, User as UserIcon, Building2, Smartphone, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../services/firebase';
import { checkUserExists, registerUser } from '../../services/authService';
import { DepartmentType, User } from '../../types';

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
    loginSuccess
  } = useAuthStore();

  // Profile Setup State
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<DepartmentType | null>(null);
  const [otpCode, setOtpCode] = useState('');

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
                    } catch(e) {
                        // Ignore clear errors
                    }
                    (window as any).recaptchaVerifier = null;
                }

                // Create new instance
                (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    }
                });
            } catch (e) {
                console.error("Recaptcha Init Error:", e);
            }
        };
        
        initRecaptcha();
    }

    // Cleanup on unmount or step change
    return () => {
        if ((window as any).recaptchaVerifier) {
            try {
                (window as any).recaptchaVerifier.clear();
            } catch(e) {
                // ignore
            }
            (window as any).recaptchaVerifier = null;
        }
    };
  }, [step]);

  // --- HANDLERS ---

  const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Basic validation
      if (phoneNumber.length < 10) {
          setError("Lütfen geçerli bir numara girin.");
          return;
      }

      setLoading(true);
      setError(null);

      // Clean number (ensure +90 prefix if missing for TR)
      let cleanNumber = phoneNumber.replace(/\s/g, '');
      if (!cleanNumber.startsWith('+')) {
          cleanNumber = '+90' + cleanNumber; // Default to TR
      }

      try {
          const appVerifier = (window as any).recaptchaVerifier;
          if (!appVerifier) {
              throw new Error("ReCAPTCHA not initialized");
          }

          const confirmationResult = await signInWithPhoneNumber(auth, cleanNumber, appVerifier);
          
          // Store ID and Number
          setVerificationId(confirmationResult.verificationId);
          setPhoneNumber(cleanNumber);
          
          // Move to next step
          setLoading(false);
          setStep('OTP');
          
          // Attach confirmation result to window for access in next step (or use a ref/store)
          (window as any).confirmationResult = confirmationResult;

      } catch (err: any) {
          console.error("SMS Error:", err);
          setLoading(false);
          setError("SMS gönderilemedi. Numaranızı veya internet bağlantınızı kontrol edin.");
          
          // If error is auth/internal-error, it might be domain authorization
          if (err.code === 'auth/internal-error') {
              console.warn("Check Firebase Console > Authentication > Settings > Authorized Domains.");
          }

          // Reset recaptcha if possible to allow retry
          try {
              if ((window as any).recaptchaVerifier) {
                  // We often need to fully re-init on error to be safe
                  (window as any).recaptchaVerifier.clear();
                  (window as any).recaptchaVerifier = null;
                  
                  // Re-init
                  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                      'size': 'invisible',
                      'callback': () => {}
                  });
              }
          } catch (resetErr) {
              console.error("Recaptcha Reset Error", resetErr);
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
          
          // Auth Successful - Check if User Exists in DB
          const existingUser = await checkUserExists(phoneNumber);

          if (existingUser) {
              loginSuccess(existingUser);
          } else {
              // New User -> Profile Setup
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
          // --- ADMIN BACKDOOR CHECK ---
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
              pin: '1234' // Default pin for new users
          });

          loginSuccess(newUser);

      } catch (err) {
          console.error("Registration Error:", err);
          setLoading(false);
          setError("Kayıt oluşturulamadı.");
      }
  };

  // --- RENDER HELPERS ---

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-6 relative">
        <div id="recaptcha-container"></div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
        >
            {/* Logo / Header */}
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-primary text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-primary/20 mb-4">
                    <span className="text-4xl font-bold">H</span>
                </div>
                <h1 className="text-2xl font-bold text-primary tracking-tight">Hotel Academy</h1>
                <p className="text-gray-400 text-sm mt-1">Global Staff Access</p>
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: PHONE INPUT */}
                {step === 'PHONE' && (
                    <motion.form 
                        key="phone"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSubmit={handleSendOtp}
                        className="flex flex-col gap-6"
                    >
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Telefon Numaranız</label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                                <input 
                                    type="tel" 
                                    placeholder="5XX XXX XX XX"
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-accent transition-all"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 ml-1">SMS ile doğrulama kodu gönderilecektir.</p>
                        </div>

                        {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</div>}

                        <button 
                            type="submit" 
                            disabled={isLoading || phoneNumber.length < 10}
                            className="w-full bg-primary hover:bg-primary-light disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Devam Et <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </motion.form>
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
                            <Smartphone className="w-12 h-12 text-accent mx-auto mb-2 opacity-50" />
                            <h2 className="text-xl font-bold text-gray-800">Kodu Doğrula</h2>
                            <p className="text-gray-500 text-sm">{phoneNumber} numarasına gönderilen 6 haneli kodu girin.</p>
                        </div>

                        <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000000"
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 text-center text-3xl tracking-[0.5em] font-bold text-gray-800 placeholder-gray-200 focus:outline-none focus:border-accent transition-all"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                            autoFocus
                        />

                        {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</div>}

                        <button 
                            type="submit" 
                            disabled={isLoading || otpCode.length !== 6}
                            className="w-full bg-accent hover:bg-accent-dark disabled:bg-gray-300 text-primary font-bold py-4 rounded-2xl shadow-xl shadow-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Doğrula <ShieldCheck className="w-5 h-5" /></>}
                        </button>
                        
                        <button type="button" onClick={() => setStep('PHONE')} className="text-gray-400 text-sm font-medium hover:text-gray-600">
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
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Aramıza Hoş Geldin!</h2>
                            <p className="text-gray-500 text-sm">Seni daha yakından tanıyalım.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Adın Soyadın</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Örn: Ayşe Yılmaz"
                                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-accent transition-all"
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
                                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${department === dept ? 'border-primary bg-primary text-white' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
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
