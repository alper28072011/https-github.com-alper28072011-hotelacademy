
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock, ChevronRight } from 'lucide-react';
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
        
        const newRecent = [term, ...recent.filter(r => r !== term)].slice(0, 5);
        setRecent(newRecent);
        localStorage.setItem('recent_searches', JSON.stringify(newRecent));
    };

    return (
        <div className="relative w-full">
            <div className="flex relative">
                <input 
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay for click
                    onKeyDown={handleKeyDown}
                    placeholder="Eğitim, kişi veya departman ara..."
                    className="w-full h-8 pl-2 pr-8 text-xs font-bold text-[#333] bg-white border border-[#20365F] outline-none placeholder-gray-400 focus:border-white"
                />
                <div className="absolute right-0 top-0 h-8 w-8 bg-[#f7f7f7] border border-l-0 border-[#20365F] flex items-center justify-center">
                    <Search className="w-4 h-4 text-[#3b5998]" />
                </div>
            </div>

            {/* SUGGESTIONS DROPDOWN */}
            {isFocused && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#899bc1] border-t-0 shadow-xl z-50">
                    
                    {/* Recent */}
                    {recent.length > 0 && !value && (
                        <div className="border-b border-[#eee]">
                            <div className="bg-[#f7f7f7] px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">Geçmiş</div>
                            {recent.map(term => (
                                <div 
                                    key={term}
                                    onMouseDown={() => triggerSearch(term)}
                                    className="px-2 py-1.5 hover:bg-[#3b5998] hover:text-white cursor-pointer flex items-center gap-2 text-xs font-bold text-[#333] transition-colors"
                                >
                                    <Clock className="w-3 h-3 opacity-50" />
                                    {term}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Trending */}
                    {!value && (
                        <div>
                            <div className="bg-[#f7f7f7] px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">Popüler</div>
                            {trends.map(trend => (
                                <div 
                                    key={trend.term}
                                    onMouseDown={() => triggerSearch(trend.term)}
                                    className="px-2 py-1.5 hover:bg-[#3b5998] hover:text-white cursor-pointer flex items-center gap-2 text-xs font-bold text-[#333] transition-colors"
                                >
                                    <TrendingUp className="w-3 h-3 text-blue-500" />
                                    {trend.term}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Live Typing */}
                    {value && (
                        <div 
                            onMouseDown={() => triggerSearch(value)}
                            className="px-2 py-2 hover:bg-[#eff0f5] cursor-pointer text-xs font-bold text-[#3b5998]"
                        >
                            "{value}" için sonuçları göster...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
