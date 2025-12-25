
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon;
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ 
    icon: Icon, 
    label, 
    error, 
    className = '', 
    containerClassName = '',
    ...props 
}) => {
    return (
        <div className={`flex flex-col gap-1 ${containerClassName}`}>
            {label && (
                <label className="text-[11px] font-bold text-[#666] mb-0.5">
                    {label}:
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[#999]">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input 
                    className={`
                        w-full bg-white border border-[#bdc7d8] 
                        py-1.5 text-[#333] text-[13px] placeholder-gray-400
                        focus:border-[#3b5998] focus:ring-0
                        disabled:bg-[#f2f2f2] disabled:text-[#999]
                        ${Icon ? 'pl-8' : 'pl-2'} pr-2
                        ${error ? 'border-red-500 bg-red-50' : ''}
                        ${className}
                    `}
                    style={{ borderRadius: 0 }} // Force square
                    {...props}
                />
            </div>
            {error && (
                <span className="text-[10px] text-red-600 font-bold">
                    {error}
                </span>
            )}
        </div>
    );
};
