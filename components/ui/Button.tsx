
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends HTMLMotionProps<"button"> {
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
    
    // Classic 2008 Style: Sharp corners, 1px borders, subtle vertical gradient or solid
    const baseStyles = "inline-flex items-center justify-center font-bold border cursor-pointer active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed leading-normal";
    
    const variants = {
        // The classic "Facebook Blue" button
        primary: "bg-[#3b5998] border-[#29447e] text-white hover:bg-[#3b5998]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
        // The "Gray" button (Cancel, etc.)
        secondary: "bg-[#f5f6f7] border-[#d8dfea] text-[#333] hover:bg-[#ebedef] shadow-sm",
        // Simple outline
        outline: "bg-white border-[#999] text-[#333] hover:bg-[#f9f9f9]",
        // Ghost link
        ghost: "bg-transparent border-transparent text-[#3b5998] hover:underline hover:bg-[#eff0f2]",
    };

    const sizes = {
        sm: "text-[11px] px-2 py-1 gap-1",
        md: "text-[13px] px-4 py-1.5 gap-2",
        lg: "text-[14px] px-6 py-2 gap-2",
    };

    return (
        <motion.button
            // Removing spring animations for a snappier, older feel
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
            {isLoading && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
            {!isLoading && icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
        </motion.button>
    );
};
