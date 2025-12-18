
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, User as UserIcon, Loader2, CheckCircle2, ArrowRight, Shield, BadgeCheck, Briefcase, Network } from 'lucide-react';
import { DepartmentType, User, PermissionType } from '../../types';
import { getUsersByDepartment, searchUserByPhone, inviteUserToOrg } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { useNavigate } from 'react-router-dom';

export const StaffManager: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Invite Flow State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [inviteDept, setInviteDept] = useState<string>('');
  const [inviteRoleTitle, setInviteRoleTitle] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<PermissionType[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Available Permissions Config
  const AVAILABLE_PERMISSIONS: { id: PermissionType; label: string; desc: string }[] = [
      { id: 'CAN_CREATE_CONTENT', label: 'İçerik Üreticisi', desc: 'Eğitim ve post paylaşabilir.' },
      { id: 'CAN_MANAGE_TEAM', label: 'Takım Yöneticisi', desc: 'Personel onaylayıp çıkarabilir.' },
      { id: 'CAN_VIEW_ANALYTICS', label: 'Analist', desc: 'Raporları görüntüleyebilir.' },
      { id: 'CAN_EDIT_SETTINGS', label: 'Kurum Yöneticisi', desc: 'Kurum ayarlarını değiştirebilir.' },
  ];

  // Fetch Users
  useEffect(() => {
    const fetchAll = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        const depts = currentOrganization.settings?.customDepartments || ['housekeeping', 'kitchen'];
        
        let allUsers: User[] = [];
        for (const d of depts) {
            const u = await getUsersByDepartment(d, currentOrganization.id);
            allUsers = [...allUsers, ...u];
        }
        
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
        setUsers(uniqueUsers);
        setLoading(false);
    };
    fetchAll();
  }, [currentOrganization, isAdding]);

  const filteredUsers = selectedDeptFilter === 'all' ? users : users.filter(u => u.department === selectedDeptFilter);
  const departmentsList = currentOrganization?.settings?.customDepartments || ['housekeeping', 'kitchen'];

  const handleSearch = async () => {
      if(!searchPhone) return;
      setIsInviting(true);
      let cleanPhone = searchPhone.replace(/\s/g, '');
      if (!cleanPhone.startsWith('+')) cleanPhone = '+90' + cleanPhone; 
      
      const user = await searchUserByPhone(cleanPhone);
      setFoundUser(user);
      setIsInviting(false);
  };

  const togglePermission = (perm: PermissionType) => {
      if (invitePermissions.includes(perm)) {
          setInvitePermissions(invitePermissions.filter(p => p !== perm));
      } else {
          setInvitePermissions([...invitePermissions, perm]);
      }
  };

  const handleInvite = async () => {
      if (!foundUser || !currentOrganization || !inviteDept || !inviteRoleTitle) return;
      setIsInviting(true);
      
      const success = await inviteUserToOrg(
          foundUser, 
          currentOrganization.id, 
          inviteDept, 
          inviteRoleTitle,
          invitePermissions
      );

      if (success) {
          setIsAdding(false);
          setFoundUser(null);
          setSearchPhone('');
          setInvitePermissions([]);
          setInviteRoleTitle('');
          alert("Personel başarıyla davet edildi.");
      } else {
          alert("Bir hata oluştu.");
      }
      setIsInviting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Personel Listesi</h1>
            <p className="text-gray-500">Ekip üyelerini görüntüle ve yönet.</p>
        </div>
        <div className="flex gap-3">
            {/* NEW: Link to Org Chart */}
            <button 
                onClick={() => navigate('/admin/org-chart')}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <Network className="w-5 h-5 text-accent" />
                Org. Şeması
            </button>
            
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary-light transition-all active:scale-95"
            >
                <Plus className="w-5 h-5" />
                Personel Davet Et
            </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button onClick={() => setSelectedDeptFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedDeptFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Tümü</button>
         {departmentsList.map((d) => (
             <button
                key={d}
                onClick={() => setSelectedDeptFilter(d)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedDeptFilter === d 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
             >
                 {d}
             </button>
         ))}
      </div>

      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                    {user.roleTitle && (
                        <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-1 rounded-bl-lg">
                            POZİSYON ATANDI
                        </div>
                    )}
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                        {user.avatar && user.avatar.length > 5 ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-gray-400">{user.avatar || '?'}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 leading-tight truncate">{user.name}</h3>
                        
                        {/* Display Role Title from Position if available, else generic role */}
                        <div className="text-sm text-primary font-bold mb-0.5 truncate">
                            {user.roleTitle || (user.role === 'manager' ? 'Yönetici' : 'Personel')}
                        </div>
                        
                        <div className="text-xs text-gray-500 uppercase">{user.department}</div>
                    </div>
                </div>
            ))}
            {filteredUsers.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-400">Bu departmanda personel bulunamadı.</div>
            )}
        </div>
      )}

      {/* INVITE USER MODAL */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-xl font-bold text-gray-800">Personel Davet Et</h2>
                      <button onClick={() => { setIsAdding(false); setFoundUser(null); }} className="text-gray-400 hover:text-gray-600 font-medium">İptal</button>
                  </div>

                  <div className="p-8 overflow-y-auto">
                      {!foundUser ? (
                          <div className="space-y-4">
                              <p className="text-gray-500 text-sm">Personelin telefon numarasını girerek sistemde arayın.</p>
                              <div className="flex gap-2">
                                  <input 
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    placeholder="+90 5XX XXX XX XX"
                                    className="flex-1 bg-white border-2 border-gray-200 rounded-xl py-4 px-6 font-bold text-gray-800 focus:border-primary focus:outline-none text-lg"
                                  />
                                  <button 
                                    onClick={handleSearch}
                                    disabled={isInviting || !searchPhone}
                                    className="bg-primary text-white px-8 rounded-xl font-bold hover:bg-primary-light transition-colors"
                                  >
                                      {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                  </button>
                              </div>
                              {searchPhone && !isInviting && !foundUser && <p className="text-red-500 text-sm">Kullanıcı bulunamadı.</p>}
                          </div>
                      ) : (
                          <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4">
                              {/* 1. User Card */}
                              <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-blue-200 overflow-hidden">
                                      {foundUser.avatar.length > 4 ? <img src={foundUser.avatar} className="w-full h-full object-cover" /> : foundUser.avatar}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-blue-900 text-lg">{foundUser.name}</h3>
                                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                                          <CheckCircle2 className="w-4 h-4" /> Sistemde Kayıtlı
                                      </div>
                                  </div>
                              </div>

                              {/* 2. Role & Department */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Departman Seç</label>
                                      <select 
                                          value={inviteDept}
                                          onChange={(e) => setInviteDept(e.target.value)}
                                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-primary"
                                      >
                                          <option value="">Seçiniz...</option>
                                          {departmentsList.map(d => (
                                              <option key={d} value={d}>{d}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Geçici Ünvan (Opsiyonel)</label>
                                      <div className="relative">
                                          <Briefcase className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                          <input 
                                              value={inviteRoleTitle}
                                              onChange={(e) => setInviteRoleTitle(e.target.value)}
                                              placeholder="Org Şemasından sonra atanabilir"
                                              className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:border-primary"
                                          />
                                      </div>
                                  </div>
                              </div>

                              <button 
                                onClick={handleInvite}
                                disabled={isInviting || !inviteDept}
                                className="w-full bg-primary hover:bg-primary-light text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Onayla ve Davet Et <ArrowRight className="w-5 h-5" /></>}
                              </button>
                          </div>
                      )}
                  </div>
              </motion.div>
          </div>
      )}
    </div>
  );
};
