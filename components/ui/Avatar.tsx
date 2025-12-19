
import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
    src?: string | null;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'md', className = '' }) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Reset state when src changes
    useEffect(() => {
        setError(false);
        setLoaded(false);
    }, [src]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-10 h-10 text-xs',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-24 h-24 text-2xl',
        '2xl': 'w-32 h-32 text-4xl'
    };

    // Placeholder Logic
    if (!src || error) {
        return (
            <div className={`rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden border border-gray-200 ${sizeClasses[size]} ${className}`}>
                {alt ? getInitials(alt) : <User className="w-1/2 h-1/2" />}
            </div>
        );
    }

    return (
        <div className={`relative rounded-full overflow-hidden bg-gray-50 border border-gray-200 ${sizeClasses[size]} ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};
