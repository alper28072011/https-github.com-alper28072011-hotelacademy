
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, User as UserIcon, MoreVertical, Trash2, Edit2, AlertCircle, X, CornerDownRight } from 'lucide-react';
import { Position, User } from '../../types';

interface OrgChartBuilderProps {
    positions: Position[];
    users: User[]; // All org users for lookup
    onAddChild: (parentId: string) => void;
    onAssign: (positionId: string) => void;
    onRemoveUser: (positionId: string) => void;
    onDeletePosition: (positionId: string) => void;
    onEditPosition?: (position: Position) => void;
    rootId?: string | null;
}

// --- RECURSIVE NODE ---
const OrgNode: React.FC<{
    position: Position;
    allPositions: Position[];
    users: User[];
    actions: {
        onAddChild: (id: string) => void;
        onAssign: (id: string) => void;
        onRemoveUser: (id: string) => void;
        onDelete: (id: string) => void;
    }
}> = ({ position, allPositions, users, actions }) => {
    // Find children
    const children = allPositions.filter(p => p.parentId === position.id);
    // Find occupant
    const occupant = users.find(u => u.id === position.occupantId);

    // Dynamic styles based on department (optional)
    const deptColors: Record<string, string> = {
        'management': 'bg-purple-100 text-purple-700',
        'front_office': 'bg-blue-100 text-blue-700',
        'kitchen': 'bg-orange-100 text-orange-700',
        'housekeeping': 'bg-emerald-100 text-emerald-700',
    };
    const badgeClass = deptColors[position.departmentId] || 'bg-gray-100 text-gray-600';

    return (
        <div className="flex flex-col items-center">
            
            {/* NODE CARD */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative w-72 p-3 rounded-2xl border-2 transition-all group hover:shadow-lg hover:border-blue-300 z-10 bg-white ${occupant ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50/50'}`}
            >
                {/* Connection Line Top */}
                {position.parentId && (
                    <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 -ml-px" />
                )}

                {/* Header: Dept & Actions */}
                <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeClass}`}>
                        {position.departmentId}
                    </span>
                    <div className="relative group/menu">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400"><MoreVertical className="w-4 h-4" /></button>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover/menu:block z-20 overflow-hidden">
                            <button onClick={() => actions.onDelete(position.id)} className="w-full text-left px-4 py-3 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"><Trash2 className="w-3 h-3" /> Sil</button>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-3">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{position.title}</h3>
                </div>

                {/* Occupant Slot */}
                {occupant ? (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 relative group/user">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200 overflow-hidden shadow-sm">
                            {occupant.avatar?.length > 4 ? <img src={occupant.avatar} className="w-full h-full object-cover" /> : occupant.avatar}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{occupant.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{occupant.phoneNumber}</div>
                        </div>
                        <button 
                            onClick={() => actions.onRemoveUser(position.id)} 
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-red-100 text-red-500 opacity-0 group-hover/user:opacity-100 transition-opacity hover:bg-red-50"
                            title="Koltuktan Kaldır"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => actions.onAssign(position.id)}
                        className="w-full py-3 border-2 border-dashed border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                    >
                        <UserIcon className="w-3 h-3" /> Personel Ata
                    </button>
                )}

                {/* Add Child Trigger */}
                <button 
                    onClick={() => actions.onAddChild(position.id)}
                    className="absolute -bottom-3 left-1/2 -ml-3 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-colors z-20"
                    title="Alt Pozisyon Ekle"
                >
                    <Plus className="w-3 h-3" />
                </button>

                {/* Connection Line Bottom */}
                {children.length > 0 && (
                    <div className="absolute -bottom-8 left-1/2 w-0.5 h-8 bg-gray-300 -ml-px" />
                )}
            </motion.div>

            {/* CHILDREN RENDERER */}
            {children.length > 0 && (
                <div className="flex gap-8 mt-16 relative">
                    {/* Horizontal Connector Line */}
                    {children.length > 1 && (
                        <div className="absolute -top-8 left-0 right-0 h-px bg-gray-300 mx-[calc(50%/var(--child-count))]"></div>
                    )}
                    {children.map(child => (
                        <OrgNode 
                            key={child.id} 
                            position={child} 
                            allPositions={allPositions} 
                            users={users}
                            actions={actions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OrgChartBuilder: React.FC<OrgChartBuilderProps> = ({ 
    positions, users, onAddChild, onAssign, onDeletePosition, onRemoveUser 
}) => {
    // Determine Roots (positions with no parents)
    const roots = positions.filter(p => !p.parentId);

    if (positions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">Henüz bir organizasyon şeması yok.</p>
                <button 
                    onClick={() => onAddChild('')} 
                    className="mt-4 bg-primary text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-primary-light transition-transform active:scale-95"
                >
                    İlk Yöneticiyi Ekle
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-10 custom-scrollbar relative min-h-[600px] flex justify-center bg-gray-50 rounded-b-3xl">
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0B1E3B 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="flex gap-16 min-w-max z-10">
                {roots.map(root => (
                    <OrgNode 
                        key={root.id}
                        position={root}
                        allPositions={positions}
                        users={users}
                        actions={{
                            onAddChild,
                            onAssign,
                            onDelete: onDeletePosition,
                            onRemoveUser
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
