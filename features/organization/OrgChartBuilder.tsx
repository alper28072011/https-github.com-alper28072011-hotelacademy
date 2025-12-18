
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, User as UserIcon, MoreVertical, Trash2, X, Crown, Building2 } from 'lucide-react';
import { Position, User, OrgDepartmentDefinition } from '../../types';

interface OrgChartBuilderProps {
    positions: Position[];
    users: User[]; 
    definitions?: { departments: OrgDepartmentDefinition[] };
    owner?: User;
    onAddChild: (parentId: string | null, deptId?: string) => void;
    onAssign: (positionId: string) => void;
    onRemoveUser: (positionId: string) => void;
    onDeletePosition: (positionId: string) => void;
    onEditPosition?: (position: Position) => void;
}

// --- RECURSIVE NODE ---
const OrgNode: React.FC<{
    position: Position;
    allPositions: Position[];
    users: User[];
    actions: {
        onAddChild: (id: string, deptId: string) => void;
        onAssign: (id: string) => void;
        onRemoveUser: (id: string) => void;
        onDelete: (id: string) => void;
    };
    deptColor: string;
}> = ({ position, allPositions, users, actions, deptColor }) => {
    const children = allPositions.filter(p => p.parentId === position.id);
    const occupant = users.find(u => u.id === position.occupantId);

    return (
        <div className="flex flex-col items-center">
            
            {/* NODE CARD */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative w-64 p-3 rounded-2xl border-2 transition-all group hover:shadow-lg z-10 bg-white mb-8 ${occupant ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50/50'}`}
                style={{ borderColor: occupant ? undefined : deptColor + '40' }} // Light colored border if empty
            >
                {/* Vertical Line from Top */}
                <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 -ml-px" />

                {/* Actions Menu */}
                <div className="absolute top-2 right-2 z-20">
                    <div className="relative group/menu">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-400"><MoreVertical className="w-4 h-4" /></button>
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover/menu:block overflow-hidden">
                            <button onClick={() => actions.onDelete(position.id)} className="w-full text-left px-4 py-3 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"><Trash2 className="w-3 h-3" /> Sil</button>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-3 mt-1 px-4">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight" style={{ color: deptColor }}>{position.title}</h3>
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
                        className="w-full py-3 border-2 border-dashed border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <UserIcon className="w-3 h-3" /> Boş Koltuk
                    </button>
                )}

                {/* Add Child Trigger */}
                <button 
                    onClick={() => actions.onAddChild(position.id, position.departmentId)}
                    className="absolute -bottom-3 left-1/2 -ml-3 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-colors z-20"
                    title="Alt Pozisyon Ekle"
                >
                    <Plus className="w-3 h-3" />
                </button>

                {/* Line to Children */}
                {children.length > 0 && (
                    <div className="absolute -bottom-8 left-1/2 w-0.5 h-8 bg-gray-300 -ml-px" />
                )}
            </motion.div>

            {/* CHILDREN RENDERER */}
            {children.length > 0 && (
                <div className="flex gap-4 relative">
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
                            deptColor={deptColor}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OrgChartBuilder: React.FC<OrgChartBuilderProps> = ({ 
    positions, users, definitions, owner, onAddChild, onAssign, onDeletePosition, onRemoveUser 
}) => {
    const departments = definitions?.departments || [];

    return (
        <div className="flex-1 overflow-auto p-10 custom-scrollbar relative min-h-[600px] bg-gray-50 rounded-b-3xl">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0B1E3B 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative z-10 flex flex-col items-center">
                
                {/* 1. ROOT OWNER NODE */}
                <div className="mb-16 relative flex flex-col items-center">
                    <div className="w-80 bg-gradient-to-r from-primary to-primary-light p-1 rounded-2xl shadow-xl">
                        <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full border-2 border-yellow-400 p-0.5 relative">
                                {owner?.avatar.length > 4 ? <img src={owner.avatar} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center font-bold">{owner?.avatar}</div>}
                                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-sm"><Crown className="w-3 h-3 fill-white" /></div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Kurucu & Sahip</div>
                                <h3 className="font-bold text-gray-900 text-lg">{owner?.name || 'Yükleniyor...'}</h3>
                            </div>
                        </div>
                    </div>
                    {/* Line to Departments */}
                    {departments.length > 0 && <div className="h-12 w-0.5 bg-gray-300"></div>}
                </div>

                {/* 2. DEPARTMENTS ROW */}
                {departments.length > 0 ? (
                    <div className="flex gap-12 items-start relative">
                        {/* Horizontal Line connecting departments */}
                        <div className="absolute -top-0 left-10 right-10 h-0.5 bg-gray-300" />
                        
                        {departments.map(dept => {
                            // Filter positions for this dept that are "Roots" within the dept (no parent in same dept)
                            // A clearer approach for this visual: Any position with no parent OR parent is not in this dept (rare)
                            // Ideally, top positions in a dept should be parentId = null (meaning connected to Owner conceptually)
                            const deptPositions = positions.filter(p => p.departmentId === dept.id);
                            const deptRoots = deptPositions.filter(p => !p.parentId);

                            return (
                                <div key={dept.id} className="flex flex-col items-center">
                                    {/* Dept Header Node */}
                                    <div className="relative mb-8">
                                        <div className="h-8 w-0.5 bg-gray-300 absolute -top-8 left-1/2 -ml-px" />
                                        <div 
                                            className="px-6 py-2 rounded-xl text-sm font-bold text-white shadow-md flex items-center gap-2"
                                            style={{ backgroundColor: dept.color }}
                                        >
                                            <Building2 className="w-4 h-4" />
                                            {dept.name}
                                        </div>
                                        {/* Line to first position */}
                                        <div className="h-8 w-0.5 bg-gray-300 absolute -bottom-8 left-1/2 -ml-px" />
                                    </div>

                                    {/* Positions Tree */}
                                    {deptRoots.length > 0 ? (
                                        <div className="flex gap-4">
                                            {deptRoots.map(root => (
                                                <OrgNode 
                                                    key={root.id}
                                                    position={root}
                                                    allPositions={deptPositions}
                                                    users={users}
                                                    actions={{
                                                        onAddChild: (pid) => onAddChild(pid, dept.id),
                                                        onAssign,
                                                        onDelete: onDeletePosition,
                                                        onRemoveUser
                                                    }}
                                                    deptColor={dept.color}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => onAddChild(null, dept.id)}
                                            className="w-48 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-primary hover:text-primary hover:bg-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <Plus className="w-6 h-6" />
                                            <span className="text-xs font-bold">İlk Pozisyonu Ekle</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                        <p className="mb-4">Henüz departman tanımlanmamış.</p>
                        <p className="text-sm">Lütfen "Tanımlamalar" sekmesinden departman ekleyin.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
