
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, User as UserIcon, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { DepartmentType, User } from '../../types';
import { getUsersByDepartment, searchUserByPhone, inviteUserToOrg } from '../../services/db';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const StaffManager: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentType | 'all'>('all');

  // Invite Flow State
  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [inviteDept, setInviteDept] = useState<DepartmentType>('housekeeping');
  const [isInviting, setIsInviting] = useState(false);

  // Fetch Users for current org
  useEffect(() => {
    const fetchAll = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        const depts: DepartmentType[] = ['housekeeping', 'kitchen', 'front_office', 'management'];
        let allUsers: User[] = [];
        for (const d of depts) {
            const u = await getUsersByDepartment(d, currentOrganization.id);
            allUsers = [...allUsers, ...u];
        }
        setUsers(allUsers);
        setLoading(false);
    };
    fetchAll();
  }, [currentOrganization, isAdding]);

  const filteredUsers = selectedDept === 'all' ? users : users.filter(u => u.department === selectedDept);

  const handleSearch = async () => {
      if(!searchPhone) return;
      setIsInviting(true);
      // Ensure phone format matches DB standard
      let cleanPhone = searchPhone.replace(/\s/g, '');
      if (!cleanPhone.startsWith('+')) cleanPhone = '+90' + cleanPhone; // Default assumption for demo
      
      const user = await searchUserByPhone(cleanPhone);
      setFoundUser(user);
      setIsInviting(false);
  };

  const handleInvite = async () => {
      if (!foundUser || !currentOrganization) return;
      setIsInviting(true);
      const success = await inviteUserToOrg(foundUser, currentOrganization.id, inviteDept);
      if (success) {
          setIsAdding(false);
          setFoundUser(null);
          setSearchPhone('');
          alert("Personel başarıyla eklendi.");
      } else {
          alert("Bir hata oluştu.");
      }
      setIsInviting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Personel Yönetimi</h1>
            <p className="text-gray-500">Ekibe yeni üye davet et.</p>
        </div>
        <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary-light transition-all active:scale-95"
        >
            <Plus className="w-5 h-5" />
            Personel Ekle
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
         {['all', 'housekeeping', 'kitchen', 'front_office', 'management'].map((d) => (
             <button
                key={d}
                onClick={() => setSelectedDept(d as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedDept === d 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
             >
                 {d.charAt(0).toUpperCase() + d.slice(1).replace('_', ' ')}
             </button>
         ))}
      </div>

      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => (
                <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                        {user.avatar.length > 5 ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-gray-400">{user.avatar}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 leading-tight">{user.name}</h3>
                        <div className="text-xs text-gray-500 capitalize">{user.department.replace('_', ' ')}</div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* INVITE USER MODAL */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              >
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-primary">Personel Davet Et</h2>
                      <button onClick={() => { setIsAdding(false); setFoundUser(null); }} className="text-gray-400 hover:text-gray-600 font-medium">İptal</button>
                  </div>

                  <div className="p-8">
                      {!foundUser ? (
                          <div className="space-y-4">
                              <p className="text-gray-500 text-sm">Personelin telefon numarasını girerek sistemde arayın.</p>
                              <div className="flex gap-2">
                                  <input 
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    placeholder="+90 5XX XXX XX XX"
                                    className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl py-3 px-4 font-bold text-gray-800 focus:border-accent focus:outline-none"
                                  />
                                  <button 
                                    onClick={handleSearch}
                                    disabled={isInviting || !searchPhone}
                                    className="bg-primary text-white px-6 rounded-xl font-bold hover:bg-primary-light transition-colors"
                                  >
                                      {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                  </button>
                              </div>
                              {searchPhone && !isInviting && !foundUser && <p className="text-red-500 text-sm">Kullanıcı bulunamadı.</p>}
                          </div>
                      ) : (
                          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2">
                              <div className="flex items-center gap-4 bg-green-50 p-4 rounded-2xl border border-green-100">
                                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-green-200 overflow-hidden">
                                      {foundUser.avatar.length > 4 ? <img src={foundUser.avatar} className="w-full h-full object-cover" /> : foundUser.avatar}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-green-900 text-lg">{foundUser.name}</h3>
                                      <div className="flex items-center gap-1 text-green-600 text-sm">
                                          <CheckCircle2 className="w-4 h-4" /> Sistemde Kayıtlı
                                      </div>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Atanacak Departman</label>
                                  <div className="grid grid-cols-2 gap-2">
                                      {['housekeeping', 'kitchen', 'front_office', 'management'].map(d => (
                                          <button
                                            key={d}
                                            onClick={() => setInviteDept(d as any)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                                inviteDept === d 
                                                ? 'bg-primary text-white border-primary' 
                                                : 'bg-white border-gray-200 text-gray-600'
                                            }`}
                                          >
                                              {d.replace('_', ' ').toUpperCase()}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <button 
                                onClick={handleInvite}
                                disabled={isInviting}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                              >
                                  {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Onayla ve Ekle <ArrowRight className="w-5 h-5" /></>}
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
