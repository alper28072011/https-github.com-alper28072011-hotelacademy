
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    icon, 
    fullWidth = false,
    className = '',
    disabled,
    ...props 
}) => {
    
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-lg hover:shadow-xl hover:shadow-primary/20 focus:ring-primary/50 border border-transparent",
        secondary: "bg-secondary text-primary hover:bg-secondary-dark focus:ring-secondary/50 border border-transparent",
        outline: "bg-transparent border-2 border-gray-200 text-gray-600 hover:border-primary hover:text-primary focus:ring-gray-200",
        ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-primary shadow-none",
    };

    const sizes = {
        sm: "text-xs px-4 py-2 gap-1.5",
        md: "text-sm px-6 py-3 gap-2",
        lg: "text-base px-8 py-4 gap-2.5",
    };

    return (
        <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.02, y: -2 } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
            className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </motion.button>
    );
};
