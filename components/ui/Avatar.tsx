
import React, { useState, useEffect, useRef } from 'react';
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
    const imgRef = useRef<HTMLImageElement>(null);

    // HELPER: Determine if the src is likely a valid image URL or just Initials (e.g. "AY")
    // If it's short (<= 4 chars) or doesn't look like a URL/Path, treat as initials immediately.
    const isImageSrc = src && (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:') || src.includes('/') || src.length > 4);

    // Reset state when src changes
    useEffect(() => {
        if (isImageSrc) {
            setError(false);
            setLoaded(false);
        }
    }, [src, isImageSrc]);

    // CACHE FIX: Check if image is already loaded in browser cache
    useEffect(() => {
        if (imgRef.current && imgRef.current.complete && isImageSrc) {
            if (imgRef.current.naturalWidth > 0) {
                setLoaded(true);
            }
        }
    }, [src, isImageSrc]);

    const getInitials = (name: string) => {
        if (!name) return '';
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

    // RENDER LOGIC
    // 1. If no src
    // 2. If error occurred
    // 3. If src is NOT an image URL (it's initials string like "AY") -> Show placeholder immediately without trying to load image
    if (!src || error || !isImageSrc) {
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
                ref={imgRef}
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
