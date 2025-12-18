
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User as UserIcon, MoreVertical, Trash2, X, Crown, Building2, Eye, GitCommit, ChevronDown } from 'lucide-react';
import { Position, User, OrgDepartmentDefinition } from '../../types';
import { getDescendantPositions } from '../../services/organizationService';

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
        onEdit: (pos: Position) => void;
        onHighlight: (id: string | null) => void;
    };
    deptColor: string;
    highlightedIds: string[] | null; // IDs to highlight (scope mode)
}> = ({ position, allPositions, users, actions, deptColor, highlightedIds }) => {
    const children = allPositions.filter(p => p.parentId === position.id);
    const occupant = users.find(u => u.id === position.occupantId);
    
    // Visualization Logic
    const isScopeMode = highlightedIds !== null;
    const isHighlighted = isScopeMode && highlightedIds?.includes(position.id);
    const isDimmed = isScopeMode && !isHighlighted;

    return (
        <div className="flex flex-col items-center">
            
            {/* NODE CARD */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isDimmed ? 0.3 : 1, y: 0, scale: isHighlighted ? 1.05 : 1 }}
                transition={{ duration: 0.3 }}
                className={`relative w-64 p-3 rounded-2xl border-2 transition-all group z-10 mb-8 flex flex-col ${
                    occupant 
                    ? 'bg-white border-gray-200 shadow-sm' 
                    : 'bg-gray-50/50 border-dashed border-gray-300'
                } ${isHighlighted ? 'ring-4 ring-green-400 ring-opacity-50 border-green-500' : ''}`}
                style={{ borderColor: isHighlighted ? undefined : (occupant ? undefined : deptColor + '40') }}
            >
                {/* Vertical Line from Top */}
                <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 -ml-px" />

                {/* Header: Title & Actions */}
                <div className="flex justify-between items-start mb-2 px-1">
                    <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm leading-tight truncate" style={{ color: deptColor }}>{position.title}</h3>
                        {position.level && <span className="text-[9px] text-gray-400 font-mono">Lvl {position.level}</span>}
                    </div>
                    
                    <div className="flex gap-1">
                        {/* Scope Toggle Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); actions.onHighlight(isScopeMode ? null : position.id); }}
                            className={`p-1 rounded transition-colors ${isHighlighted ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                            title="Etki Alanını Göster"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Menu */}
                        <div className="relative group/menu">
                            <button className="p-1 hover:bg-gray-100 rounded text-gray-400"><MoreVertical className="w-3.5 h-3.5" /></button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover/menu:block overflow-hidden z-50">
                                <button onClick={() => actions.onEdit(position)} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 font-bold">Düzenle</button>
                                <button onClick={() => actions.onDelete(position.id)} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"><Trash2 className="w-3 h-3" /> Sil</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Occupant Slot */}
                {occupant ? (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 relative group/user">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200 overflow-hidden shadow-sm shrink-0">
                            {occupant.avatar?.length > 4 ? <img src={occupant.avatar} className="w-full h-full object-cover" /> : occupant.avatar}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{occupant.name}</div>
                            <div className="text-[9px] text-gray-500 truncate">{occupant.roleTitle}</div>
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
                        className="w-full py-2 border-2 border-dashed border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <UserIcon className="w-3 h-3" /> Boş
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
                            highlightedIds={highlightedIds}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OrgChartBuilder: React.FC<OrgChartBuilderProps> = ({ 
    positions, users, definitions, owner, onAddChild, onAssign, onDeletePosition, onRemoveUser, onEditPosition
}) => {
    const departments = definitions?.departments || [];
    const [highlightedScopeIds, setHighlightedScopeIds] = useState<string[] | null>(null);

    const handleHighlight = (rootId: string | null) => {
        if (!rootId) {
            setHighlightedScopeIds(null);
            return;
        }
        // Use the same logic engine as permission service
        const descendants = getDescendantPositions(rootId, positions);
        setHighlightedScopeIds([rootId, ...descendants]);
    };

    return (
        <div className="flex-1 overflow-auto p-10 custom-scrollbar relative min-h-[600px] bg-gray-50 rounded-b-3xl">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0B1E3B 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* Legend / Info */}
            <div className="fixed bottom-8 right-8 z-30 bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-xl shadow-lg text-xs text-gray-500">
                <div className="font-bold mb-2 text-gray-800">İpuçları</div>
                <div className="flex items-center gap-2 mb-1"><Eye className="w-3 h-3" /> Göze tıkla: Etki alanını gör</div>
                <div className="flex items-center gap-2"><Plus className="w-3 h-3" /> Artıya tıkla: Alt birim ekle</div>
            </div>

            <div className="relative z-10 flex flex-col items-center min-w-max pb-20">
                
                {/* 1. ROOT OWNER NODE */}
                <div className={`mb-16 relative flex flex-col items-center transition-opacity duration-300 ${highlightedScopeIds ? 'opacity-30 grayscale' : ''}`}>
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
                    <div className="flex gap-16 items-start relative">
                        {/* Horizontal Line connecting departments */}
                        <div className="absolute -top-0 left-10 right-10 h-0.5 bg-gray-300" />
                        
                        {departments.map(dept => {
                            const deptPositions = positions.filter(p => p.departmentId === dept.id);
                            // Find roots: Positions with no parent OR parent is not in this chart subset (safety)
                            const deptRoots = deptPositions.filter(p => !p.parentId);

                            // Visual state for department column
                            const isDeptDimmed = highlightedScopeIds && !deptRoots.some(r => highlightedScopeIds.includes(r.id)); // Simple check

                            return (
                                <div key={dept.id} className={`flex flex-col items-center transition-opacity duration-300 ${isDeptDimmed ? 'opacity-40' : ''}`}>
                                    {/* Dept Header Node */}
                                    <div className="relative mb-12">
                                        <div className="h-12 w-0.5 bg-gray-300 absolute -top-12 left-1/2 -ml-px" />
                                        <div 
                                            className="px-6 py-2.5 rounded-full text-sm font-bold text-white shadow-lg flex items-center gap-2 relative z-20 ring-4 ring-white"
                                            style={{ backgroundColor: dept.color }}
                                        >
                                            <Building2 className="w-4 h-4" />
                                            {dept.name}
                                        </div>
                                        {/* Line to first position */}
                                        <div className="h-12 w-0.5 bg-gray-300 absolute -bottom-12 left-1/2 -ml-px" />
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
                                                        onRemoveUser,
                                                        onEdit: onEditPosition || (() => {}),
                                                        onHighlight: handleHighlight
                                                    }}
                                                    deptColor={dept.color}
                                                    highlightedIds={highlightedScopeIds}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => onAddChild(null, dept.id)}
                                            className="w-48 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-primary hover:text-primary hover:bg-white transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold">Pozisyon Başlat</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 p-12 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                        <GitCommit className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="mb-2 font-bold text-gray-600">Organizasyon Şeması Boş</p>
                        <p className="text-sm">Lütfen "Tanımlamalar" sekmesinden departman ve rol prototipleri ekleyin.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
