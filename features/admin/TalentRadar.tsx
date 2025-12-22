
import React, { useEffect, useState } from 'react';
import { User, CareerPath, DepartmentType, Course } from '../../types';
import { getUsersByDepartment, getCareerPaths, getCourses } from '../../services/db';
import { Loader2 } from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

export const TalentRadar: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useOrganizationStore();

  useEffect(() => {
    const init = async () => {
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
    init();
  }, [currentOrganization]);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>;

  // Simple Mock Scores for Retro UI Demo
  const deptScores: Record<string, number> = {};
  users.forEach(u => {
      if(!deptScores[u.department || 'other']) deptScores[u.department || 'other'] = 0;
      deptScores[u.department || 'other'] += (u.xp || 0);
  });

  return (
    <div className="space-y-4">
       {/* Header */}
       <div className="bg-[#6d84b4] border border-[#3b5998] text-white p-2 font-bold text-sm">
           Departman Performans Raporu
       </div>

       <div className="bg-white border border-[#d8dfea] p-4">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-4">Genel Bakış</h3>
            
            <div className="space-y-4">
                {Object.keys(deptScores).map(dept => {
                    const score = deptScores[dept];
                    const max = Math.max(...Object.values(deptScores)) || 1;
                    const width = (score / max) * 100;

                    return (
                        <div key={dept} className="flex items-center gap-4">
                            <div className="w-32 text-right text-[11px] font-bold text-gray-600 capitalize">{dept.replace('_', ' ')}</div>
                            <div className="flex-1 bg-[#f7f7f7] border border-[#ccc] h-4 relative">
                                <div 
                                    className="h-full bg-[#3b5998]" 
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <div className="w-12 text-[10px] text-gray-500">{score} XP</div>
                        </div>
                    );
                })}
            </div>
       </div>

       <div className="bg-[#fff9d7] border border-[#e2c822] p-3 text-[11px] text-[#333]">
           <span className="font-bold">İpucu:</span> En yüksek performansı gösteren departmanları ödüllendirmeyi unutmayın.
       </div>
    </div>
  );
};
