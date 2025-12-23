
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, GripVertical, ChevronRight, Wand2, Trash2, Plus } from 'lucide-react';
import { Course, CourseTopic } from '../../types';
import { getCourse } from '../../services/db';
import { getTopicsByCourse, createTopic, reorderTopics, deleteTopic } from '../../services/courseService';
import { generateCourseTopics } from '../../services/geminiService';
import { getLocalizedContent } from '../../i18n/config';
import { SortableList } from '../../components/ui/SortableList';

export const CourseDetail: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [topics, setTopics] = useState<CourseTopic[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI & Actions
    const [isGenerating, setIsGenerating] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');

    useEffect(() => {
        if(courseId) loadData();
    }, [courseId]);

    const loadData = async () => {
        setLoading(true);
        if(!courseId) return;
        const [c, t] = await Promise.all([getCourse(courseId), getTopicsByCourse(courseId)]);
        setCourse(c);
        setTopics(t);
        setLoading(false);
    };

    const handleGenerateTopics = async () => {
        if(!course) return;
        setIsGenerating(true);
        const result = await generateCourseTopics(getLocalizedContent(course.title));
        for (const t of result.topics) {
            await createTopic(course.id, t.title, t.summary);
        }
        await loadData();
        setIsGenerating(false);
    };

    const handleAddTopic = async () => {
        if(!course || !newTopicTitle) return;
        await createTopic(course.id, newTopicTitle, '');
        setNewTopicTitle('');
        await loadData();
    };

    const handleSort = (newItems: CourseTopic[]) => {
        setTopics(newItems); // Optimistic Update
        if (courseId) {
            const ids = newItems.map(t => t.id);
            reorderTopics(courseId, ids);
        }
    };

    const handleDeleteTopic = async (topicId: string) => {
        if (!courseId || !confirm("Bu konuyu silmek istediğinize emin misiniz?")) return;
        
        // Optimistic Remove
        setTopics(prev => prev.filter(t => t.id !== topicId));
        await deleteTopic(courseId, topicId);
    };

    if(loading) return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#3b5998]" /></div>;
    if(!course) return <div>Bulunamadı.</div>;

    return (
        <div className="bg-white border border-[#d8dfea] min-h-[600px]">
            {/* Header */}
            <div className="bg-[#f7f7f7] border-b border-[#d8dfea] p-4">
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-lg font-bold text-[#3b5998]">{getLocalizedContent(course.title)}</h1>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded font-bold uppercase">{course.visibility}</span>
                </div>
                <p className="text-xs text-gray-500">{getLocalizedContent(course.description)}</p>
            </div>

            {/* Topics List */}
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-gray-700 uppercase">Müfredat (Konular)</h2>
                    <button 
                        onClick={handleGenerateTopics} 
                        disabled={isGenerating || topics.length > 0}
                        className="text-[11px] font-bold text-[#3b5998] flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                        <Wand2 className="w-3 h-3" /> AI ile Planla
                    </button>
                </div>

                <div className="mb-6">
                    <SortableList
                        items={topics}
                        onOrderChange={handleSort}
                        renderItem={({ item, index, dragListeners }) => (
                            <div className="flex items-center gap-3 p-3 bg-white border-b border-[#e9e9e9] hover:bg-[#f0f2f5] group transition-all">
                                <div {...dragListeners} className="text-gray-400 cursor-move p-1 hover:text-[#3b5998]">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="w-6 h-6 bg-[#f0f2f5] rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/admin/courses/${course.id}/topics/${item.id}`)}>
                                    <div className="text-sm font-bold text-gray-800 group-hover:text-[#3b5998]">{getLocalizedContent(item.title)}</div>
                                    <div className="text-[10px] text-gray-500">{(item.moduleIds || []).length} Modül</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleDeleteTopic(item.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Konuyu Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        )}
                    />
                    
                    {topics.length === 0 && !isGenerating && (
                        <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded text-gray-400 text-xs">
                            Henüz konu eklenmemiş. AI ile taslak oluşturabilir veya manuel ekleyebilirsiniz.
                        </div>
                    )}
                    {isGenerating && <div className="p-4 text-center text-xs text-[#3b5998] font-bold animate-pulse">AI Müfredatı Hazırlıyor...</div>}
                </div>

                {/* Add Manual */}
                <div className="flex gap-2">
                    <input 
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        placeholder="Yeni Konu Başlığı..."
                        className="flex-1 border border-[#bdc7d8] p-2 text-xs rounded outline-none focus:border-[#3b5998]"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                    />
                    <button onClick={handleAddTopic} className="bg-[#3b5998] text-white px-4 py-2 rounded text-xs font-bold border border-[#29447e]">Ekle</button>
                </div>
            </div>
        </div>
    );
};
