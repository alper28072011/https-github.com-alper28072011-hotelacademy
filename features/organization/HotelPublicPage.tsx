
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Globe, Loader2, CheckCircle2, UserPlus, Users, Utensils, BedDouble, ConciergeBell, Settings } from 'lucide-react';
import { getOrganizationDetails, sendJoinRequest, getMyMemberships } from '../../services/db';
import { Organization, DepartmentType } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import confetti from 'canvas-confetti';

export const HotelPublicPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  
  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDept, setSelectedDept] = useState<DepartmentType | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
        if (!orgId) return;
        setLoading(true);
        const data = await getOrganizationDetails(orgId);
        if (data) setOrg(data);
        
        if (currentUser) {
            const memberships = await getMyMemberships(currentUser.id);
            if (memberships.some(m => m.organizationId === orgId)) setIsMember(true);
        }
        setLoading(false);
    };
    init();
  }, [orgId, currentUser]);

  const handleJoin = async () => {
      if (!currentUser || !org || !selectedDept) return;
      setIsSubmitting(true);
      const result = await sendJoinRequest(currentUser.id, org.id, selectedDept, roleTitle);
      setIsSubmitting(false);
      
      if (result.success) {
          setShowWizard(false);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          alert("Başvuru gönderildi! Yönetici onayı bekleniyor.");
          navigate('/lobby');
      } else {
          alert(result.message || "Başvuru yapılamadı.");
          setShowWizard(false);
      }
  };

  const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager') && currentUser.currentOrganizationId === orgId;

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!org) return <div>Hotel not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24 relative">
        {/* HERO SECTION */}
        <div className="relative h-80 w-full">
            <img 
                src={org.coverUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200'} 
                className="w-full h-full object-cover"
                alt="Cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <button 
                onClick={() => navigate('/lobby')}
                className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>

            {canManage && (
                <button 
                    onClick={() => navigate('/admin')}
                    className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-primary font-bold shadow-lg hover:bg-white transition-all flex items-center gap-2"
                >
                    <Settings className="w-4 h-4" /> Sayfayı Yönet
                </button>
            )}
        </div>

        {/* PROFILE INFO */}
        <div className="px-6 -mt-16 relative z-10">
            <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl mb-4">
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                    {org.logoUrl ? <img src={org.logoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-400">{org.name[0]}</span>}
                </div>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">{org.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
                    {org.location && <div className="flex items-center gap-1"><MapPin className="w-4 h-4 text-accent" /> {org.location}</div>}
                    {org.website && <div className="flex items-center gap-1"><Globe className="w-4 h-4 text-blue-500" /> {org.website}</div>}
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                <h3 className="font-bold text-gray-900 mb-2">Hakkımızda</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                    {org.description || "Dünyanın en iyi misafir deneyimini sunmak için çalışan tutkulu bir ekibiz. Kariyerinizi bizimle zirveye taşıyın."}
                </p>
            </div>
        </div>

        {/* STICKY CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 z-20">
            {isMember ? (
                <button 
                    onClick={() => navigate('/')}
                    className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
                >
                    <CheckCircle2 className="w-6 h-6" />
                    Panele Git
                </button>
            ) : (
                <button 
                    onClick={() => setShowWizard(true)}
                    className="w-full bg-primary text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 animate-pulse-slow"
                >
                    <UserPlus className="w-6 h-6" />
                    Takıma Katıl
                </button>
            )}
        </div>

        {/* WIZARD MODAL */}
        <AnimatePresence>
            {showWizard && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowWizard(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Başvuru Sihirbazı</h2>
                            <p className="text-gray-500 mb-8 text-sm">Hangi pozisyonda aramıza katılmak istersin?</p>

                            {step === 1 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'housekeeping', icon: BedDouble, label: 'Kat Hizmetleri' },
                                        { id: 'kitchen', icon: Utensils, label: 'Mutfak' },
                                        { id: 'front_office', icon: ConciergeBell, label: 'Ön Büro' },
                                        { id: 'management', icon: Users, label: 'Yönetim' },
                                    ].map((item) => (
                                        <button 
                                            key={item.id}
                                            onClick={() => { setSelectedDept(item.id as any); setStep(2); }}
                                            className="p-4 rounded-2xl border-2 border-gray-100 hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-3 transition-all group"
                                        >
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-white transition-colors">
                                                <item.icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Pozisyon / Unvan (Opsiyonel)</label>
                                        <input 
                                            value={roleTitle}
                                            onChange={e => setRoleTitle(e.target.value)}
                                            placeholder="Örn: Garson, Şef, Resepsiyonist"
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 font-bold text-gray-900 focus:border-accent focus:outline-none mt-1"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleJoin}
                                        disabled={isSubmitting}
                                        className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg mt-4 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Başvuruyu Tamamla'}
                                    </button>
                                    <button onClick={() => setStep(1)} className="text-gray-400 font-medium text-sm">Geri Dön</button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
