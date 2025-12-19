
/**
 * NATIVE IMAGE OPTIMIZER
 * Uses HTML5 Canvas to resize and compress images on the client-side before upload.
 * No external dependencies required.
 */

export type OptimizationType = 'AVATAR' | 'POST' | 'BANNER';

interface OptimizationConfig {
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0 to 1
    mimeType: string;
}

const CONFIGS: Record<OptimizationType, OptimizationConfig> = {
    AVATAR: { maxWidth: 500, maxHeight: 500, quality: 0.7, mimeType: 'image/jpeg' }, // Instagram-like avatar
    POST: { maxWidth: 1920, maxHeight: 1920, quality: 0.8, mimeType: 'image/jpeg' }, // High quality feed
    BANNER: { maxWidth: 1200, maxHeight: 600, quality: 0.75, mimeType: 'image/jpeg' } // Cover images
};

export const compressImage = (file: File, type: OptimizationType): Promise<File> => {
    return new Promise((resolve, reject) => {
        const config = CONFIGS[type];
        const reader = new FileReader();
        
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Maintain Aspect Ratio
                if (width > height) {
                    if (width > config.maxWidth) {
                        height = Math.round((height * config.maxWidth) / width);
                        width = config.maxWidth;
                    }
                } else {
                    if (height > config.maxHeight) {
                        width = Math.round((width * config.maxHeight) / height);
                        height = config.maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context not available"));
                    return;
                }

                // Smooth resizing
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const optimizedFile = new File([blob], file.name, {
                                type: config.mimeType,
                                lastModified: Date.now(),
                            });
                            resolve(optimizedFile);
                        } else {
                            reject(new Error("Image compression failed"));
                        }
                    },
                    config.mimeType,
                    config.quality
                );
            };
            
            img.onerror = (err) => reject(err);
        };
        
        reader.onerror = (err) => reject(err);
    });
};
