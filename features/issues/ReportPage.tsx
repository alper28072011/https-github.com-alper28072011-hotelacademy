import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Wrench, 
  SprayCan, 
  ShieldAlert, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Send,
  Trash2,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useIssueStore } from '../../stores/useIssueStore';
import confetti from 'canvas-confetti';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { 
    step, 
    setStep, 
    setType, 
    setLocation, 
    setPhoto, 
    photoPreview, 
    submitIssue, 
    isSubmitting,
    selectedType,
    selectedLocation,
    reset
  } = useIssueStore();

  // Reset on mount
  React.useEffect(() => {
    reset();
  }, []);

  const handleBack = () => {
    if (step === 1) navigate('/');
    else setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    const success = await submitIssue(currentUser);
    if (success) {
       confetti({
           particleCount: 100,
           spread: 70,
           origin: { y: 0.6 }
       });
       setTimeout(() => {
           navigate('/');
       }, 2000);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CONFIGURATION ---
  const issueTypes = [
    { id: 'maintenance', icon: Wrench, label: 'Teknik / Arıza', color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'housekeeping', icon: SprayCan, label: 'Temizlik / Kirlilik', color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'security', icon: ShieldAlert, label: 'Güvenlik / Kayıp', color: 'bg-red-100 text-red-600 border-red-200' },
  ];

  const locations = [
    "Lobi / Giriş", "Restoran", "Koridor 1. Kat", "Koridor 2. Kat", 
    "Havuz Alanı", "Otopark", "Personel Odası", "Mutfak"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] px-4 pt-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={handleBack}
          className="p-3 rounded-full bg-white shadow-sm text-gray-600 active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
            {[1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-gray-200'}`} />
            ))}
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-center"
        >
            <h1 className="text-3xl font-bold text-primary mb-8 text-center leading-tight">
                Ne sorun var?
            </h1>
            <div className="grid grid-cols-1 gap-4">
                {issueTypes.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setType(type.id as any)}
                        className={`flex items-center p-6 rounded-3xl border-2 transition-all active:scale-[0.98] shadow-sm ${type.color} hover:brightness-95`}
                    >
                        <div className="p-4 bg-white/50 rounded-full mr-6">
                            <type.icon className="w-10 h-10" />
                        </div>
                        <span className="text-xl font-bold">{type.label}</span>
                    </button>
                ))}
            </div>
        </motion.div>
      )}

      {/* STEP 2: LOCATION SELECTION */}
      {step === 2 && (
         <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col"
        >
            <h1 className="text-3xl font-bold text-primary mb-2 text-center">
                Nerede?
            </h1>
            <p className="text-gray-500 text-center mb-8">Sorunun olduğu yeri seç</p>
            
            <div className="grid grid-cols-2 gap-4">
                {locations.map((loc) => (
                    <button
                        key={loc}
                        onClick={() => setLocation(loc)}
                        className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-lg font-medium text-gray-700 hover:border-accent hover:bg-accent/5 active:scale-95 transition-all"
                    >
                        {loc}
                    </button>
                ))}
            </div>
        </motion.div>
      )}

      {/* STEP 3: PHOTO & SUBMIT */}
      {step === 3 && (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col items-center"
        >
             {isSubmitting ? (
                 <div className="flex-1 flex flex-col items-center justify-center">
                     <Loader2 className="w-16 h-16 text-accent animate-spin mb-4" />
                     <h2 className="text-xl font-bold text-primary">Gönderiliyor...</h2>
                 </div>
             ) : (
                <>
                    <h1 className="text-2xl font-bold text-primary mb-6 text-center">
                        Fotoğraf Ekle (Opsiyonel)
                    </h1>

                    <div className="w-full aspect-[4/3] bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative mb-8">
                        {photoPreview ? (
                            <>
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setPhoto(null)}
                                    className="absolute bottom-4 right-4 p-3 bg-red-500 rounded-full text-white shadow-lg"
                                >
                                    <Trash2 className="w-6 h-6" />
                                </button>
                            </>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                <Camera className="w-16 h-16 text-gray-300 mb-2" />
                                <span className="text-gray-400 font-bold">Kamerayı Aç</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    className="hidden" 
                                    onChange={handlePhotoCapture}
                                />
                            </label>
                        )}
                    </div>

                    <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
                        <div className="flex items-center gap-3 mb-2">
                             <div className={`w-3 h-3 rounded-full ${selectedType === 'security' ? 'bg-red-500' : selectedType === 'maintenance' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                             <span className="font-bold text-gray-800 uppercase text-sm tracking-wide">
                                {issueTypes.find(t => t.id === selectedType)?.label}
                             </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                             <MapPin className="w-5 h-5" />
                             <span className="text-lg">{selectedLocation}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full bg-primary text-white text-xl font-bold py-5 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-3 mt-auto mb-4"
                    >
                        Gönder <Send className="w-6 h-6" />
                    </button>
                </>
             )}
        </motion.div>
      )}

    </div>
  );
};
