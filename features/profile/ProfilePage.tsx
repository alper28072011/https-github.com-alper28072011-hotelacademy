
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    Settings, Grid, FileText, Bookmark, Download, ExternalLink, 
    Star, Users, Heart, Zap, Award, Building2, ShieldCheck, ChevronRight,
    Youtube
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useContentStore } from '../../stores/useContentStore';
import { EditProfileModal } from './components/EditProfileModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Course, KudosType } from '../../types';
import { getInstructorCourses } from '../../services/db';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { userProfile, initializeListeners } = useProfileStore();
  const { courses } = useContentStore(); // To resolve IDs

  // UI State
  const [activeTab, setActiveTab] = useState<'collection' | 'certificates' | 'saved' | 'channel'>('collection');
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myCreatedCourses, setMyCreatedCourses] = useState<Course[]>([]);

  // Active User Data
  const activeUser = userProfile || currentUser;

  // Listen for real-time updates (Only if Org Exists)
  useEffect(() => {
    if (currentUser && currentUser.currentOrganizationId && currentUser.department) {
      const cleanup = initializeListeners(currentUser.id, currentUser.department, currentUser.currentOrganizationId);
      return cleanup;
    }
  }, [currentUser, initializeListeners]);

  useEffect(() => {
      if (currentUser) {
          getInstructorCourses(currentUser.id).then(setMyCreatedCourses);
      }
  }, [currentUser]);

  if (!activeUser) return null;

  // --- DATA PREPARATION ---

  // 1. Resolve Certificates (Completed Courses)
  const myCertificates = activeUser.completedCourses
      .map(id => courses.find(c => c.id === id))
      .filter((c): c is Course => !!c); // Type guard

  // 2. Resolve Saved
  const mySaved = (activeUser.savedCourses || [])
      .map(id => courses.find(c => c.id === id))
      .filter((c): c is Course => !!c);

  // 3. Badges Config
  const badgeConfig: Record<KudosType, { icon: any, color: string, bg: string, label: string }> = {
      'STAR_PERFORMER': { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Yıldız Performans' },
      'TEAM_PLAYER': { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Takım Oyuncusu' },
      'GUEST_HERO': { icon: Heart, color: 'text-red-500', bg: 'bg-red-50', label: 'Misafir Kahramanı' },
      'FAST_LEARNER': { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Hızlı Öğrenen' },
  };

  // Role Checks & Context
  const isSuperAdmin = activeUser.role === 'super_admin';
  const isHotelManager = ['manager', 'admin'].includes(activeUser.role);
  const isFreelancer = !activeUser.currentOrganizationId;

  // --- DYNAMIC ACTION BUTTON LOGIC ---
  const renderPrimaryAction = () => {
      if (isSuperAdmin) {
          return (
            <div 
                onClick={() => navigate('/super-admin')}
                className="bg-gray-900 text-yellow-400 py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-black/10 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-1.5 bg-yellow-400/20 rounded-full">
                        <ShieldCheck className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Platform Yönetimi</span>
                        <span className="text-[10px] opacity-70">Super Admin Yetkisi</span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50 relative z-10" />
            </div>
          );
      }

      if (isFreelancer) {
          return (
            <div 
                onClick={() => navigate('/lobby')}
                className="bg-gray-50 border-2 border-dashed border-gray-200 py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all group hover:border-accent"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-200 rounded-full group-hover:bg-accent group-hover:text-primary transition-colors">
                        <Building2 className="w-5 h-5 text-gray-500 group-hover:text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">Bir İşletmeye Katıl</span>
                        <span className="text-[10px] text-gray-500">Kariyerini bir üst seviyeye taşı</span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );
      }

      if (isHotelManager) {
          return (
            <div 
                onClick={() => navigate('/admin')}
                className="bg-blue-50 border border-blue-100 py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:bg-blue-100"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-full text-blue-600">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">İşletme Yönetimi</span>
                        <span className="text-[10px] text-gray-500">Personel ve İçerik Paneli</span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );
      }

      // Default: Staff Member
      return (
        <div 
            onClick={() => activeUser.currentOrganizationId && navigate(`/hotel/${activeUser.currentOrganizationId}`)}
            className="bg-white border border-gray-100 shadow-sm py-3 px-4 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gray-100 rounded-full text-gray-600">
                    <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">Bağlı İşletme</span>
                    <span className="text-[10px] text-gray-500">Genel sayfayı görüntüle</span>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-white pb-24">
        
        {/* HEADER SECTION */}
        <div className="px-4 pt-6 pb-2">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold flex items-center gap-1">
                    {activeUser.phoneNumber} 
                    {/* Optional: Verified Tick */}
                    <span className="text-blue-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.965 8.521C19.988 8.347 20 8.173 20 8c0-2.379-2.143-4.288-4.521-3.965C14.786 2.802 13.466 2 12 2s-2.786.802-3.479 2.035C6.138 3.712 4 5.621 4 8c0 .173.012.347.035.521C2.802 9.215 2 10.535 2 12s.802 2.785 2.035 3.479A8.318 8.318 0 0 0 4 16c0 2.379 2.143 4.288 4.521 3.965C9.214 21.198 10.534 22 12 22s2.786-.802 3.479-2.035C17.857 20.288 20 18.379 20 16c0-.173-.012-.347-.035-.521C21.198 14.785 22 13.465 22 12s-.802-2.785-2.035-3.479zm-9.015 8.961-4.036-4.036 1.414-1.414 2.622 2.622 5.45-5.45 1.414 1.414-6.864 6.864z"></path></svg>
                    </span>
                </h1>
                <div className="flex gap-4">
                    <button onClick={() => setIsSettingsOpen(true)} className="text-gray-800 hover:bg-gray-100 p-1 rounded-full transition-colors">
                        <Settings className="w-7 h-7" />
                    </button>
                </div>
            </div>

            {/* Profile Info Row */}
            <div className="flex items-center gap-6 mb-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-pink-600">
                        <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-gray-100">
                            {activeUser.avatar.length > 5 ? (
                                <img src={activeUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-2xl">{activeUser.avatar}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex-1 flex justify-around text-center">
                    <div>
                        <div className="font-bold text-lg text-gray-900">{Math.floor(activeUser.xp / 1000)}</div>
                        <div className="text-xs text-gray-500">Seviye</div>
                    </div>
                    <div>
                        <div className="font-bold text-lg text-gray-900">{activeUser.completedCourses.length}</div>
                        <div className="text-xs text-gray-500">Sertifika</div>
                    </div>
                    <div>
                        <div className="font-bold text-lg text-gray-900">{activeUser.badges?.reduce((acc, b) => acc + b.count, 0) || 0}</div>
                        <div className="text-xs text-gray-500">Rozet</div>
                    </div>
                </div>
            </div>

            {/* Bio & Details */}
            <div className="mb-6">
                <h2 className="font-bold text-gray-900">{activeUser.name}</h2>
                <div className="text-sm text-gray-500 mb-1 capitalize">
                    {isFreelancer ? "Freelancer" : activeUser.department?.replace('_', ' ') + " Specialist"}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-tight">
                    {activeUser.bio || "Henüz bir biyografi eklenmedi."}
                </p>
                {activeUser.instagramHandle && (
                    <a href={`https://instagram.com/${activeUser.instagramHandle.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-blue-900 mt-1">
                        <ExternalLink className="w-3 h-3" /> {activeUser.instagramHandle}
                    </a>
                )}
            </div>

            {/* DYNAMIC DASHBOARD SWITCHER */}
            <div className="mb-6">
                {renderPrimaryAction()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-2">
                <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg text-sm transition-colors"
                >
                    Profili Düzenle
                </button>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg text-sm transition-colors">
                    Kariyer Yolu
                </button>
            </div>
        </div>

        {/* TABS (STICKY) */}
        <div className="sticky top-0 bg-white z-30 border-b border-gray-200 flex overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setActiveTab('collection')}
                className={`flex-1 flex justify-center py-3 border-b-2 min-w-[80px] transition-all ${activeTab === 'collection' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
            >
                <Grid className="w-6 h-6" />
            </button>
            <button 
                onClick={() => setActiveTab('certificates')}
                className={`flex-1 flex justify-center py-3 border-b-2 min-w-[80px] transition-all ${activeTab === 'certificates' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
            >
                <FileText className="w-6 h-6" />
            </button>
            <button 
                onClick={() => setActiveTab('channel')}
                className={`flex-1 flex justify-center py-3 border-b-2 min-w-[80px] transition-all ${activeTab === 'channel' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
            >
                <Youtube className="w-6 h-6" />
            </button>
            <button 
                onClick={() => setActiveTab('saved')}
                className={`flex-1 flex justify-center py-3 border-b-2 min-w-[80px] transition-all ${activeTab === 'saved' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
            >
                <Bookmark className="w-6 h-6" />
            </button>
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[300px]">
            {/* ... Content Tabs ... */}
            {activeTab === 'collection' && (
                <div className="grid grid-cols-3 gap-1 p-1">
                    <div className="aspect-square bg-gray-50 flex flex-col items-center justify-center p-2 border border-gray-100">
                        <Award className="w-8 h-8 text-blue-400 mb-2" />
                        <span className="text-[10px] font-bold text-center text-gray-600">İlk Adım</span>
                    </div>
                    {activeUser.badges?.map((badge, idx) => {
                        const config = badgeConfig[badge.type];
                        if (!config) return null;
                        const BIcon = config.icon;
                        return (
                            <div key={idx} className={`aspect-square ${config.bg} flex flex-col items-center justify-center p-2 relative group cursor-pointer`}>
                                <BIcon className={`w-8 h-8 ${config.color} mb-2`} />
                                <span className="text-[10px] font-bold text-center text-gray-700 leading-none">{config.label}</span>
                                {badge.count > 1 && (
                                    <div className="absolute top-1 right-1 bg-white text-gray-900 text-[9px] font-bold px-1.5 rounded-full shadow-sm border border-gray-100">x{badge.count}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            
            {activeTab === 'certificates' && (
                <div className="flex flex-col">
                    {myCertificates.map(course => (
                        <div key={course.id} className="flex items-center gap-4 p-4 border-b border-gray-50 hover:bg-gray-50">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{course.title}</h4>
                                <p className="text-xs text-gray-500">Tamamlandı</p>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-primary"><Download className="w-5 h-5" /></button>
                        </div>
                    ))}
                    {myCertificates.length === 0 && <div className="text-center py-10 text-gray-400">Henüz tamamlanan kurs yok.</div>}
                </div>
            )}

            {activeTab === 'channel' && (
                <div className="grid grid-cols-2 gap-2 p-2">
                    {myCreatedCourses.map(course => (
                        <div key={course.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-100" onClick={() => navigate(`/course/${course.id}`)}>
                            <div className="aspect-video bg-gray-200">
                                <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3">
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{course.title}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-gray-500">{course.studentCount || 0} Öğrenci</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${course.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {course.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {myCreatedCourses.length === 0 && (
                        <div className="col-span-2 py-10 text-center text-gray-400 flex flex-col items-center">
                            <Youtube className="w-10 h-10 mb-2 opacity-50" />
                            <p>Henüz kendi kanalında içerik üretmedin.</p>
                            <button 
                                onClick={() => navigate('/admin/content')}
                                className="mt-4 bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg"
                            >
                                İlk Kursunu Oluştur
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'saved' && (
                <div className="grid grid-cols-3 gap-1 p-1">
                    {mySaved.map(course => (
                        <div key={course.id} className="aspect-[3/4] bg-gray-100 relative group cursor-pointer overflow-hidden">
                            <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* MODALS */}
        <AnimatePresence>
            {isEditing && (
                <EditProfileModal 
                    user={activeUser} 
                    onClose={() => setIsEditing(false)} 
                />
            )}
            {isSettingsOpen && (
                <SettingsDrawer 
                    onClose={() => setIsSettingsOpen(false)} 
                />
            )}
        </AnimatePresence>

    </div>
  );
};
