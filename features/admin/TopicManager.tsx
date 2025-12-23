
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Video, BookOpen, BrainCircuit, Wand2, Edit3, GripVertical, Trash2 } from 'lucide-react';
import { CourseTopic, LearningModule } from '../../types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getModulesByTopic, createModule, reorderModules, deleteModule } from '../../services/courseService';
import { generateTopicModules } from '../../services/geminiService';
import { getLocalizedContent } from '../../i18n/config';
import { SortableList } from '../../components/ui/SortableList';

export const TopicManager: React.FC = () => {
    const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
    const navigate = useNavigate();
    const [topic, setTopic] = useState<CourseTopic | null>(null);
    const [modules, setModules] = useState<LearningModule[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if(topicId) loadData();
    }, [topicId]);

    const loadData = async () => {
        setLoading(true);
        if(!topicId) return;
        const tSnap = await getDoc(doc(db, 'topics', topicId));
        if(tSnap.exists()) {
            setTopic({ id: tSnap.id, ...tSnap.data() } as CourseTopic);
            const m = await getModulesByTopic(topicId);
            setModules(m);
        }
        setLoading(false);
    };

    const handleGenerateModules = async () => {
        if(!topic || !courseId) return;
        setIsGenerating(true);
        const result = await generateTopicModules(getLocalizedContent(topic.title), "Hotel Training");
        for (const m of result.modules) {
            await createModule(topic.id, courseId, m.title, m.type as any);
        }
        await loadData();
        setIsGenerating(false);
    };

    const handleCreateModule = async (type: 'VIDEO' | 'QUIZ' | 'READING') => {
        if(!topic || !courseId) return;
        const title = prompt("Modül Başlığı:");
        if(!title) return;
        await createModule(topic.id, courseId, title, type);
        await loadData();
    };

    const handleSort = (newItems: LearningModule[]) => {
        setModules(newItems);
        if (topicId) {
            reorderModules(topicId, newItems.map(m => m.id));
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!topicId || !confirm("Bu modülü silmek istediğinize emin misiniz?")) return;
        setModules(prev => prev.filter(m => m.id !== moduleId));
        await deleteModule(topicId, moduleId);
    };

    if(loading) return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>;
    if(!topic) return <div>Konu bulunamadı.</div>;

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'VIDEO': return <Video className="w-4 h-4 text-blue-600" />;
            case 'QUIZ': return <BrainCircuit className="w-4 h-4 text-orange-600" />;
            default: return <BookOpen className="w-4 h-4 text-green-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'VIDEO': return 'bg-blue-100';
            case 'QUIZ': return 'bg-orange-100';
            default: return 'bg-green-100';
        }
    };

    return (
        <div className="bg-white border border-[#d8dfea] min-h-[600px]">
            <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-4">
                <h1 className="text-lg font-bold text-[#333] mb-1">{getLocalizedContent(topic.title)}</h1>
                <p className="text-xs text-gray-500">{getLocalizedContent(topic.summary)}</p>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-gray-700 uppercase">Öğrenme Modülleri</h2>
                    <button 
                        onClick={handleGenerateModules} 
                        disabled={isGenerating || modules.length > 0}
                        className="text-[11px] font-bold text-[#3b5998] flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                        <Wand2 className="w-3 h-3" /> Modül Öner
                    </button>
                </div>

                <div className="mb-6">
                    <SortableList 
                        items={modules}
                        onOrderChange={handleSort}
                        renderItem={({ item, dragListeners }) => (
                            <div className="flex items-center gap-3 p-3 bg-white border-b border-[#e9e9e9] hover:bg-[#f0f2f5] group transition-all">
                                <div {...dragListeners} className="text-gray-400 cursor-move p-1 hover:text-[#3b5998]">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                
                                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${getTypeColor(item.type)}`}>
                                    {getTypeIcon(item.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-800">{getLocalizedContent(item.title)}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => navigate(`/admin/modules/${item.id}/edit`)}
                                        className="text-[10px] bg-[#3b5998] text-white px-2 py-1 rounded font-bold hover:bg-[#2d4373] border border-[#29447e]"
                                    >
                                        Stüdyo
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteModule(item.id)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    />
                </div>

                {isGenerating && <div className="p-4 text-center text-xs text-[#3b5998] font-bold animate-pulse">Modüller Oluşturuluyor...</div>}

                <div className="border-t border-[#e9e9e9] pt-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Manuel Ekle</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleCreateModule('VIDEO')} className="flex-1 py-2 border border-gray-300 rounded text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1"><Video className="w-3 h-3" /> Video</button>
                        <button onClick={() => handleCreateModule('READING')} className="flex-1 py-2 border border-gray-300 rounded text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> Okuma</button>
                        <button onClick={() => handleCreateModule('QUIZ')} className="flex-1 py-2 border border-gray-300 rounded text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1"><BrainCircuit className="w-3 h-3" /> Quiz</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
