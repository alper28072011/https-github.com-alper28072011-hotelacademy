
import React from 'react';
import { User, Position } from '../../types';
import { Network, MoreHorizontal, UserPlus, CheckCircle2 } from 'lucide-react';

interface StaffListProps {
    users: User[];
    positions: Position[];
    onAssignClick: (user: User) => void;
}

export const StaffList: React.FC<StaffListProps> = ({ users, positions, onAssignClick }) => {
    
    // Separate users
    const unassigned = users.filter(u => !u.positionId);
    const assigned = users.filter(u => u.positionId);

    const RenderTable = ({ data, isPool }: { data: User[], isPool: boolean }) => (
        <div className={`rounded-2xl border overflow-hidden mb-8 ${isPool ? 'border-orange-200 bg-orange-50/10' : 'border-gray-200 bg-white'}`}>
            <div className={`p-4 border-b flex items-center gap-2 ${isPool ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                {isPool ? <UserPlus className="w-5 h-5 text-orange-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                <h3 className={`font-bold ${isPool ? 'text-orange-700' : 'text-gray-700'}`}>
                    {isPool ? 'Havuz (Atama Bekleyenler)' : 'Yerleşmiş Personel'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${isPool ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-600'}`}>
                    {data.length}
                </span>
            </div>
            
            <table className="w-full text-left">
                <thead className={`${isPool ? 'bg-orange-50/50' : 'bg-gray-50'} border-b border-gray-100`}>
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Personel</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Departman</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Ünvan</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/50 group bg-white">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden border border-gray-200">
                                        {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                                        <div className="text-xs text-gray-400">{user.phoneNumber || user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 uppercase">{user.department || '-'}</span>
                            </td>
                            <td className="px-6 py-4">
                                {user.positionId ? (
                                    <span className="text-sm font-bold text-primary flex items-center gap-1">
                                        <Network className="w-3 h-3" /> {user.roleTitle}
                                    </span>
                                ) : (
                                    <span className="text-xs text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded border border-orange-100">Beklemede</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => onAssignClick(user)} className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">Bu kategoride personel yok.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-2">
            <RenderTable data={unassigned} isPool={true} />
            <RenderTable data={assigned} isPool={false} />
        </div>
    );
};
