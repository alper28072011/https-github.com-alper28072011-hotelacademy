
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock, Sparkles, ChevronRight, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTrendingSearches } from '../../../services/searchService';
import { SearchTrend } from '../../../types';

interface SearchOmniBoxProps {
    value: string;
    onChange: (val: string) => void;
    onSearch: (val: string) => void;
    isSearching: boolean;
}

export const SearchOmniBox: React.FC<SearchOmniBoxProps> = ({ value, onChange, onSearch, isSearching }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [trends, setTrends] = useState<SearchTrend[]>([]);
    const [recent, setRecent] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load trends & recent
        getTrendingSearches().then(setTrends);
        const storedRecent = localStorage.getItem('recent_searches');
        if (storedRecent) setRecent(JSON.parse(storedRecent).slice(0, 3));
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            triggerSearch(value);
        }
    };

    const triggerSearch = (term: string) => {
        inputRef.current?.blur();
        setIsFocused(false);
        onSearch(term);
        
        // Update Local History
        const newRecent = [term, ...recent.filter(r => r !== term)].slice(0, 5);
        setRecent(newRecent);
        localStorage.setItem('recent_searches', JSON.stringify(newRecent));
    };

    return (
        <div className="relative z-50 w-full max-w-2xl mx-auto">
            {/* BACKDROP DIMMER */}
            <AnimatePresence>
                {isFocused && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        onClick={() => setIsFocused(false)}
                    />
                )}
            </AnimatePresence>

            {/* INPUT BOX */}
            <div className={`relative z-50 transition-all duration-300 ${isFocused ? 'scale-105' : ''}`}>
                <div className={`
                    flex items-center gap-3 px-5 py-4 bg-white rounded-2xl shadow-xl 
                    border-2 transition-colors
                    ${isFocused ? 'border-primary' : 'border-transparent'}
                `}>
                    <Search className={`w-6 h-6 ${isFocused ? 'text-primary' : 'text-gray-400'}`} />
                    <input 
                        ref={inputRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Eğitim, kişi veya departman ara..."
                        className="flex-1 bg-transparent text-lg font-medium text-gray-900 placeholder-gray-400 outline-none"
                    />
                    {value ? (
                        <button onClick={() => { onChange(''); inputRef.current?.focus(); }} className="p-1 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    ) : (
                        <div className="hidden md:flex items-center gap-1 text-xs text-gray-300 font-mono border border-gray-100 px-2 py-1 rounded">
                            <Command className="w-3 h-3" /> K
                        </div>
                    )}
                </div>

                {/* SUGGESTIONS DROPDOWN */}
                <AnimatePresence>
                    {isFocused && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                            <div className="p-2">
                                {/* Recent Searches */}
                                {recent.length > 0 && !value && (
                                    <div className="mb-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase px-4 py-2">Son Aramalar</h4>
                                        {recent.map(term => (
                                            <button 
                                                key={term}
                                                onClick={() => triggerSearch(term)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                                            >
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-700">{term}</span>
                                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Trending */}
                                {!value && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase px-4 py-2 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3" /> Popüler
                                        </h4>
                                        {trends.map(trend => (
                                            <button 
                                                key={trend.term}
                                                onClick={() => triggerSearch(trend.term)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                                            >
                                                <Sparkles className="w-4 h-4 text-accent" />
                                                <span className="text-sm font-bold text-gray-800">{trend.term}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Typing Suggestions (Simulated for Demo) */}
                                {value && (
                                    <div>
                                        <button 
                                            onClick={() => triggerSearch(value)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors text-left text-primary"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span className="text-sm font-bold">"{value}" için ara</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
