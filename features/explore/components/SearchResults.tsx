
import React, { useState } from 'react';
import { SearchResult } from '../../../types';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Play, ArrowRight, Zap, Star } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';

interface SearchResultsProps {
    results: SearchResult[];
}

type Tab = 'ALL' | 'COURSE' | 'ORGANIZATION' | 'USER';

const CourseCard: React.FC<{ item: SearchResult }> = ({ item }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(item.url)}
            className="group flex gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
        >
            <div className="w-24 h-16 rounded-xl bg-gray-100 overflow-hidden relative shrink-0">
                {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-gray-800 text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-xs text-gray-500 line-clamp-1 mb-1">{item.subtitle}</p>
                {item.relevanceScore > 70 && (
                    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold w-max">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> En İyi Eşleşme
                    </span>
                )}
            </div>
        </div>
    );
};

const OrgCard: React.FC<{ item: SearchResult }> = ({ item }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(item.url)}
            className="flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary hover:shadow-md transition-all cursor-pointer text-center group"
        >
            <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center mb-3 border border-gray-200 overflow-hidden">
                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Building2 className="w-8 h-8 text-gray-300" />}
            </div>
            <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-primary">{item.title}</h4>
            <p className="text-[10px] text-gray-500 mt-1">{item.subtitle}</p>
        </div>
    );
};

const UserRow: React.FC<{ item: SearchResult }> = ({ item }) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(item.url)}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
        >
            <Avatar src={item.imageUrl} alt={item.title} size="md" />
            <div className="flex-1">
                <div className="font-bold text-sm text-gray-900 group-hover:text-primary">{item.title}</div>
                <div className="text-xs text-gray-500">{item.subtitle}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
    );
};

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
    const [activeTab, setActiveTab] = useState<Tab>('ALL');

    const filtered = activeTab === 'ALL' ? results : results.filter(r => r.type === activeTab);

    return (
        <div className="space-y-6">
            {/* TABS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'ALL', label: 'Tümü' },
                    { id: 'COURSE', label: 'Eğitimler' },
                    { id: 'ORGANIZATION', label: 'Kurumlar' },
                    { id: 'USER', label: 'Kişiler' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                            activeTab === tab.id 
                            ? 'bg-black text-white shadow-lg' 
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* RESULTS GRID */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'ALL' ? (
                    <div className="space-y-8">
                        {/* 1. Best Matches (Courses) */}
                        {results.some(r => r.type === 'COURSE') && (
                            <section>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 px-1">Eğitimler</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {results.filter(r => r.type === 'COURSE').slice(0, 4).map(r => (
                                        <CourseCard key={r.id} item={r} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. Organizations */}
                        {results.some(r => r.type === 'ORGANIZATION') && (
                            <section>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 px-1">Kurumlar</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {results.filter(r => r.type === 'ORGANIZATION').slice(0, 3).map(r => (
                                        <OrgCard key={r.id} item={r} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 3. People */}
                        {results.some(r => r.type === 'USER') && (
                            <section>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 px-1">Kişiler</h3>
                                <div className="bg-white rounded-2xl border border-gray-100 p-2">
                                    {results.filter(r => r.type === 'USER').slice(0, 5).map(r => (
                                        <UserRow key={r.id} item={r} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    // SPECIFIC TAB VIEW
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(item => {
                            if (item.type === 'COURSE') return <CourseCard key={item.id} item={item} />;
                            if (item.type === 'ORGANIZATION') return <div key={item.id}><OrgCard item={item} /></div>;
                            return <div key={item.id} className="bg-white p-2 rounded-2xl border border-gray-100"><UserRow item={item} /></div>;
                        })}
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <Zap className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="font-bold text-gray-500">Bu kategoride sonuç bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
