
import React, { useEffect, useState } from 'react';
import { User, CareerPath, DepartmentType } from '../../types';
import { getUsersByDepartment, getCareerPaths } from '../../services/db';
import { Loader2, TrendingUp, AlertCircle, Award, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export const TalentRadar: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        // Fetch all data
        const depts: DepartmentType[] = ['housekeeping', 'kitchen', 'front_office', 'management'];
        let allUsers: User[] = [];
        for (const d of depts) {
            const u = await getUsersByDepartment(d);
            allUsers = [...allUsers, ...u];
        }
        const p = await getCareerPaths();
        setUsers(allUsers);
        setPaths(p);
        setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  // Analysis Logic
  const readyForPromotion: any[] = [];
  const needsAttention: any[] = [];
  const deptScores: Record<string, { total: number, progress: number }> = {};

  users.forEach(user => {
      // Dept Score Calc
      if (!deptScores[user.department]) deptScores[user.department] = { total: 0, progress: 0 };
      deptScores[user.department].total += 1;
      
      if (user.assignedPathId) {
          const path = paths.find(p => p.id === user.assignedPathId);
          if (path) {
              const completedCount = user.completedCourses.filter(cId => path.courseIds.includes(cId)).length;
              const totalCount = path.courseIds.length;
              const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
              
              deptScores[user.department].progress += percent;

              if (percent >= 90) {
                  readyForPromotion.push({ user, path, percent });
              } else if (percent > 0 && percent < 40) {
                  // Mock logic: stuck in early stage
                  needsAttention.push({ user, path, percent });
              }
          }
      }
  });

  return (
    <div className="flex flex-col gap-8">
       {/* Intro */}
       <div>
            <h1 className="text-2xl font-bold text-gray-800">Yetenek Radarı</h1>
            <p className="text-gray-500">Ekip gelişim analitiği ve terfi önerileri.</p>
       </div>

       {/* Top Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Ready Card */}
           <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-3xl border border-green-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="w-24 h-24 text-green-600" /></div>
                <h3 className="font-bold text-green-800 text-lg flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5" /> Terfiye Hazır ({readyForPromotion.length})
                </h3>
                <div className="flex flex-col gap-3 relative z-10">
                    {readyForPromotion.length === 0 && <p className="text-sm text-green-700/60 italic">Henüz %90 üzeri tamamlayan yok.</p>}
                    {readyForPromotion.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                                {item.user.avatar}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-gray-800 text-sm">{item.user.name}</div>
                                <div className="text-xs text-green-600 font-medium">Hedef: {item.path.targetRole}</div>
                            </div>
                            <div className="font-bold text-green-600 text-sm">%{Math.round(item.percent)}</div>
                        </div>
                    ))}
                </div>
           </div>

           {/* Attention Card */}
           <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-24 h-24 text-red-600" /></div>
                <h3 className="font-bold text-red-800 text-lg flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5" /> İlgi Bekleyenler ({needsAttention.length})
                </h3>
                <div className="flex flex-col gap-3 relative z-10">
                    {needsAttention.length === 0 && <p className="text-sm text-red-700/60 italic">Herkes iyi durumda.</p>}
                    {needsAttention.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                                {item.user.avatar}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-gray-800 text-sm">{item.user.name}</div>
                                <div className="text-xs text-red-500">İlerleme durdu</div>
                            </div>
                            <div className="font-bold text-red-500 text-sm">%{Math.round(item.percent)}</div>
                        </div>
                    ))}
                    {needsAttention.length > 3 && <p className="text-xs text-center text-red-500 font-bold">+ {needsAttention.length - 3} kişi daha</p>}
                </div>
           </div>
       </div>

       {/* Dept Scores */}
       <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-500" /> Departman Yetkinlik Skorları
            </h3>
            <div className="space-y-6">
                {Object.keys(deptScores).map(dept => {
                    const data = deptScores[dept];
                    const avg = data.total > 0 ? Math.round(data.progress / data.total) : 0;
                    return (
                        <div key={dept}>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-gray-700 capitalize">{dept.replace('_', ' ')}</span>
                                <span className="font-bold text-primary">{avg}% Eğitimli</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${avg}%` }}
                                    transition={{ duration: 1 }}
                                    className={`h-full rounded-full ${avg > 70 ? 'bg-green-500' : avg > 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
       </div>
    </div>
  );
};
