
import React from 'react';
import { User, Position } from '../../types';
import { Network, MoreHorizontal } from 'lucide-react';

interface StaffListProps {
    users: User[];
    positions: Position[];
    onAssignClick: (user: User) => void;
}

export const StaffList: React.FC<StaffListProps> = ({ users, positions, onAssignClick }) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Personel</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Departman</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Ünvan (Pozisyon)</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Durum</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/50 group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden border border-gray-200">
                                        {user.avatar.length > 3 ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                                        <div className="text-xs text-gray-400">{user.phoneNumber}</div>
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
                                    <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">Atanmamış</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
                                <span className="text-sm text-gray-600">Aktif</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => onAssignClick(user)} className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Kayıt bulunamadı.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
