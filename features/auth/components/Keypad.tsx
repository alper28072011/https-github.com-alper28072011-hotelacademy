import React from 'react';
import { Delete } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';

export const Keypad: React.FC = () => {
  const { appendPin, deletePin, enteredPin, error } = useAuthStore();
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto animate-in slide-in-from-bottom-5 fade-in duration-500">
      
      {/* PIN Indicators */}
      <div className={`flex gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              i < enteredPin.length
                ? 'bg-accent border-accent scale-110'
                : 'bg-transparent border-white/20'
            } ${error ? 'border-red-500 bg-red-500/50' : ''}`}
          />
        ))}
      </div>

      {/* Numeric Grid */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => appendPin(num)}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 hover:bg-white/10 active:bg-accent active:text-primary border border-white/10 text-white text-2xl font-semibold transition-all shadow-lg flex items-center justify-center mx-auto"
          >
            {num}
          </button>
        ))}
        
        {/* Bottom Row */}
        <div /> {/* Empty Spacer */}
        <button
          onClick={() => appendPin('0')}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 hover:bg-white/10 active:bg-accent active:text-primary border border-white/10 text-white text-2xl font-semibold transition-all shadow-lg flex items-center justify-center mx-auto"
        >
          0
        </button>
        <button
          onClick={deletePin}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center mx-auto"
        >
          <Delete className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};