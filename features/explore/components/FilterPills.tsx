
import React from 'react';
import { Category } from '../../../types';
import { Sparkles } from 'lucide-react';

interface FilterPillsProps {
  categories: Category[];
  selectedCatId: string | null;
  onSelect: (id: string | null) => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({ categories, selectedCatId, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2 sticky top-20 z-30 bg-primary-dark/5 backdrop-blur-sm pt-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
          selectedCatId === null
            ? 'bg-accent text-primary border-accent shadow-lg shadow-accent/20'
            : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
        }`}
      >
        Tümü
      </button>
      
      {/* Dynamic Categories */}
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
            selectedCatId === cat.id
              ? 'bg-white text-primary border-white shadow-lg'
              : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
          }`}
        >
          {/* Optional: Render Icons based on string name if we had a mapping component, for now simple text */}
          {cat.title}
        </button>
      ))}
    </div>
  );
};
