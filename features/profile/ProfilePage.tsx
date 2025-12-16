
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    Grid, FileText, Bookmark, Download, 
    Star, Users, Heart, Zap, Award, Youtube
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useContentStore } from '../../stores/useContentStore';
import { EditProfileModal } from './components/EditProfileModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ProfileHeader } from './components/ProfileHeader'; // New Component
import { Course, KudosType } from '../../types';
import { getInstructorCourses, getUserPosts } from '../../services/db';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { userProfile, initializeListeners } = useProfileStore();
  const { courses } = useContentStore(); 

  // UI State
  const [activeTab, setActiveTab] = useState<'collection' | 'certificates' | 'saved' | 'channel'>('collection');
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myCreatedCourses, setMyCreatedCourses] = useState<Course[]>([]);
  const [postCount, setPostCount] = useState(0);

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
          getUserPosts(currentUser.id).then(posts => setPostCount(posts.length));
      }
  }, [currentUser]);

  if (!activeUser) return null;

  // --- DATA PREPARATION ---
  const myCertificates = activeUser.completedCourses
      .map(id => courses.find(c => c.id === id))
      .filter((c): c is Course => !!c);

  const mySaved = (activeUser.savedCourses || [])
      .map(id => courses.find(c => c.id === id))
      .filter((c): c is Course => !!c);

  const badgeConfig: Record<KudosType, { icon: any, color: string, bg: string, label: string }> = {
      'STAR_PERFORMER': { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Yıldız Performans' },
      'TEAM_PLAYER': { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Takım Oyuncusu' },
      'GUEST_HERO': { icon: Heart, color: 'text-red-500', bg: 'bg-red-50', label: 'Misafir Kahramanı' },
      'FAST_LEARNER': { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Hızlı Öğrenen' },
  };

  return (
    <div className="min-h-screen bg-white pb-24">
        
        {/* SHARED HEADER COMPONENT */}
        <ProfileHeader 
            user={activeUser}
            isOwnProfile={true}
            onSettingsClick={() => setIsSettingsOpen(true)}
            onEditClick={() => setIsEditing(true)}
            followersCount={activeUser.followersCount}
            followingCount={activeUser.followingCount}
            postCount={postCount}
        />

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
