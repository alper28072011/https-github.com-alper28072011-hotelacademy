import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Crown, GitMerge, Plus, Search, Loader2 } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { getUsersByDepartment } from '../../services/db';
import { getOrgPositions } from '../../services/organizationService';
import { Position, User } from '../../types';

export const StaffManager: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
        if (!currentOrganization) return;
        setLoading(true);
        
        // Load positions for context
        const posData = await getOrgPositions(currentOrganization.id);
        setPositions(posData);

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

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Ekip Üyeleri</h1>
            <p className="text-gray-500">İşletmenizde kayıtlı aktif personel listesi.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => navigate('/admin/org-chart')}
                className="bg-white border-2 border-primary text-primary px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/5 transition-all"
            >
                <GitMerge className="w-5 h-5" />
                Şemaya Git
            </button>
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary-light transition-all"
            >
                <Plus className="w-5 h-5" />
                Direkt Davet
            </button>
        </div>
      </div>

      <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="İsim ile ara..."
              className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-gray-800 focus:border-primary focus:outline-none"
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => {
                const userPos = positions.find(p => p.id === user.positionId);
                return (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                        {user.role === 'manager' && <div className="absolute top-0 right-0 p-1 bg-accent rounded-bl-xl"><Crown className="w-3 h-3 text-primary" /></div>}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                                {user.avatar && user.avatar.length > 5 ? (
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold text-gray-400">{user.avatar || '?'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-800 leading-tight truncate">{user.name}</h3>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">{user.department}</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl flex items-center gap-2 border border-gray-100">
                             <Briefcase className="w-4 h-4 text-primary opacity-40" />
                             <span className="text-xs font-black text-primary truncate">
                                {userPos?.title || "Pozisyon Atanmamış"}
                             </span>
                        </div>
                    </div>
                );
            })}
      </div>
    </div>
  );
};