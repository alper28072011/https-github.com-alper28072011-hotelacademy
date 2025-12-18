
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, User as UserIcon, Settings, ChevronDown, 
    Trash2, UserPlus, Shield, Briefcase, Loader2, Check,
    AlertCircle, Search, Mail, Phone, BookOpen, X, GraduationCap
} from 'lucide-react';
import { useOrganizationStore } from '../../stores/useOrganizationStore';
import { Position, User, Course } from '../../types';
import { getOrgPositions, createPosition, occupyPosition, vacatePosition, updatePositionRequirements } from '../../services/organizationService';
import { getUserById, searchUserByPhone, getCourses } from '../../services/db';

export const OrgChartBuilder: React.FC = () => {
    const { currentOrganization } = useOrganizationStore();
    const [positions, setPositions] = useState<Position[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPos, setSelectedPos] = useState<Position | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Position Creation Form
    const [newTitle, setNewTitle] = useState('');
    const [newDept, setNewDept] = useState('');
    
    // Occupancy (Invite) State
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (currentOrganization) {
            loadPositions();
            getCourses(currentOrganization.id).then(setCourses);
        }
    }, [currentOrganization]);

    const loadPositions = async () => {
        setLoading(true);
        const data = await getOrgPositions(currentOrganization!.id);
        setPositions(data);
        setLoading(false);
    };

    const handleAddSubPosition = async (parentId: string | null) => {
        if (!newTitle || !currentOrganization) return;
        const parent = positions.find(p => p.id === parentId);
        
        await createPosition({
            orgId: currentOrganization.id,
            title: newTitle,
            departmentId: newDept || parent?.departmentId || 'General',
            parentId,
            occupantId: null,
            requirements: [],
            level: (parent?.level || 0) + 1
        });
        
        setNewTitle('');
        setIsAdding(false);
        loadPositions();
    };

    const handleSearch = async () => {
        setIsSearching(true);
        const user = await searchUserByPhone(searchQuery);
        setFoundUser(user);
        setIsSearching(false);
    };

    const handleAssign = async () => {
        if (!selectedPos || !foundUser) return;
        setLoading(true);
        const success = await occupyPosition(selectedPos.id, foundUser.id);
        if (success) {
            setSelectedPos(null);
            setFoundUser(null);
            setSearchQuery('');
            loadPositions();
        }
        setLoading(false);
    };

    const toggleRequirement = async (courseId: string) => {
        if (!selectedPos) return;
        const currentReqs = selectedPos.requirements || [];
        const newReqs = currentReqs.includes(courseId) 
            ? currentReqs.filter(id => id !== courseId)
            : [...currentReqs, courseId];
        
        const success = await updatePositionRequirements(selectedPos.id, newReqs);
        if (success) {
            setSelectedPos({ ...selectedPos, requirements: newReqs });
            setPositions(prev => prev.map(p => p.id === selectedPos.id ? { ...p, requirements: newReqs } : p));
        }
    };

    // Recursive component to render tree nodes
    const PositionNode: React.FC<{ node: Position }> = ({ node }) => {
        const children = positions.filter(p => p.parentId === node.id);
        const [occupant, setOccupant] = useState<User | null>(null);

        useEffect(() => {
            if (node.occupantId) {
                getUserById(node.occupantId).then(setOccupant);
            }
        }, [node.occupantId]);

        return (
            <div className="flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedPos(node)}
                    className={`relative w-48 p-4 rounded-2xl border-2 transition-all cursor-pointer group mb-8 ${
                        node.occupantId 
                        ? 'bg-white border-primary shadow-lg' 
                        : 'bg-gray-50 border-dashed border-gray-300 hover:border-accent'
                    }`}
                >
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{node.departmentId}</div>
                    <div className="font-bold text-gray-900 text-sm leading-tight mb-3">{node.title}</div>
                    
                    {node.occupantId ? (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                                {occupant?.avatar && occupant.avatar.length > 3 ? <img src={occupant.avatar} className="w-full h-full object-cover"/> : occupant?.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-gray-800 truncate">{occupant?.name}</div>
                                <div className="text-[8px] text-green-600 font-bold uppercase tracking-tighter">Doluruldu</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-orange-500 font-bold text-[10px]">
                            <AlertCircle className="w-3 h-3" /> BOŞ KOLTUK
                        </div>
                    )}

                    {/* Quick Add Sub Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsAdding(true); setSelectedPos(node); }}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-accent text-primary rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </motion.div>

                {children.length > 0 && (
                    <div className="flex gap-8 relative">
                        {/* Horizontal Connection Line */}
                        <div className="absolute top-0 left-24 right-24 h-px bg-gray-200" />
                        {children.map(child => (
                            <PositionNode key={child.id} node={child} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading && positions.length === 0) return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" /></div>;

    const rootPos = positions.find(p => p.parentId === null);

    return (
        <div className="flex flex-col gap-8 h-full min-h-[800px]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Organizasyon Şeması</h1>
                    <p className="text-gray-500 text-sm">Operasyonel hiyerarşiyi kurgula ve koltukları yönet.</p>
                </div>
                {!rootPos && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"
                    >
                        <Shield className="w-5 h-5 text-accent" /> Kök Pozisyon Oluştur (GM)
                    </button>
                )}
            </div>

            {/* CHART CANVAS */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-inner overflow-auto p-12 custom-scrollbar flex justify-center min-h-[600px] relative">
                {rootPos ? (
                    <PositionNode node={rootPos} />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-4 mt-20">
                        <Briefcase className="w-16 h-16 opacity-10" />
                        <p className="text-sm font-medium">Hiyerarşi henüz tanımlanmamış.</p>
                    </div>
                )}
            </div>

            {/* DRAWER / MODAL */}
            <AnimatePresence>
                {selectedPos && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPos(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-start shrink-0">
                                <div>
                                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">{selectedPos.departmentId}</span>
                                    <h2 className="text-2xl font-bold text-gray-800">{selectedPos.title}</h2>
                                </div>
                                <button onClick={() => setSelectedPos(null)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {isAdding ? (
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Yeni Alt Pozisyon Tanımla</h3>
                                        <div className="space-y-4">
                                            <input 
                                                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                                placeholder="Pozisyon Başlığı (Örn: Kat Şefi)"
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-primary font-bold"
                                            />
                                            <select 
                                                value={newDept} onChange={e => setNewDept(e.target.value)}
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-medium"
                                            >
                                                <option value="">Departman Seç...</option>
                                                {currentOrganization?.settings.customDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => handleAddSubPosition(selectedPos.id)} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl">Pozisyonu Ekle</button>
                                        <button onClick={() => setIsAdding(false)} className="w-full text-gray-400 font-bold text-sm py-2">Vazgeç</button>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {/* OCCUPANT STATUS */}
                                        <section>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Koltuk Durumu</h4>
                                            {selectedPos.occupantId ? (
                                                <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100 text-center">
                                                    <p className="text-green-800 font-bold text-sm mb-4">Bu koltuk bir personel tarafından dolduruldu.</p>
                                                    <button onClick={() => vacatePosition(selectedPos.id).then(loadPositions)} className="w-full py-3 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                                        <Trash2 className="w-4 h-4" /> Personeli Koltuktan Çıkar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3">
                                                        <UserPlus className="w-5 h-5 text-orange-600" />
                                                        <div className="text-xs text-orange-800 font-medium">Bu koltuk şu an boş. Bir personeli davet et.</div>
                                                    </div>
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                                        <input 
                                                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                                            placeholder="Telefon No ile ara..." 
                                                            className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-primary font-bold"
                                                        />
                                                        <button onClick={handleSearch} className="absolute right-2 top-2 bg-primary text-white p-2 rounded-xl"><Check className="w-5 h-5" /></button>
                                                    </div>
                                                    {foundUser && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-white text-xs">{foundUser.avatar}</div>
                                                            <div className="flex-1">
                                                                <div className="font-bold text-gray-900 text-sm">{foundUser.name}</div>
                                                                <div className="text-xs text-gray-500">{foundUser.phoneNumber}</div>
                                                            </div>
                                                            <button onClick={handleAssign} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">Ata</button>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            )}
                                        </section>

                                        {/* REQUIREMENTS */}
                                        <section>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zorunlu Eğitimler</h4>
                                                <span className="bg-accent/20 text-primary text-[9px] font-black px-1.5 py-0.5 rounded">Otomatik Atanır</span>
                                            </div>
                                            <div className="space-y-2">
                                                {courses.map(course => {
                                                    const isRequired = selectedPos.requirements?.includes(course.id);
                                                    return (
                                                        <div 
                                                            key={course.id} 
                                                            onClick={() => toggleRequirement(course.id)}
                                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isRequired ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-200'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isRequired ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                                                                {isRequired && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-gray-800 truncate">{course.title}</div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-black">{course.duration} Dakika</div>
                                                            </div>
                                                            <BookOpen className={`w-4 h-4 ${isRequired ? 'text-primary' : 'text-gray-200'}`} />
                                                        </div>
                                                    );
                                                })}
                                                {courses.length === 0 && <p className="text-xs text-gray-400 italic">Henüz eğitim içeriği yok.</p>}
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
