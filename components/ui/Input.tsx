
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
        <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
            {label && (
                <label className="text-xs font-bold text-text-muted uppercase ml-1 tracking-wide">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors duration-300">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                <input 
                    className={`
                        w-full bg-gray-50 border border-transparent rounded-xl
                        py-3.5 text-text-main font-medium placeholder-gray-400
                        transition-all duration-300 outline-none
                        focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5
                        disabled:bg-gray-100 disabled:text-gray-400
                        ${Icon ? 'pl-12' : 'pl-4'} pr-4
                        ${error ? 'bg-red-50 text-red-900 border-red-100 focus:border-red-200 focus:ring-red-50' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-red-500 font-bold ml-1 animate-in slide-in-from-top-1 fade-in">
                    {error}
                </span>
            )}
        </div>
    );
};
