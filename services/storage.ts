
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { compressImage, OptimizationType } from '../utils/imageOptimizer';

/**
 * Uploads a file to Firebase Storage with automatic client-side compression.
 * Enforces WebP for images.
 */
export const uploadFile = async (
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void,
  optimizationType: OptimizationType = 'POST' // Default to high quality
): Promise<string> => {
  
  // 1. Compress Image (if it's an image)
  let fileToUpload = file;
  
  if (file.type.startsWith('image/')) {
      try {
          fileToUpload = await compressImage(file, optimizationType);
      } catch (e) {
          console.warn("Image compression failed, uploading original.", e);
      }
  } 
  // 2. Video Validation (Basic)
  else if (file.type.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) { // 100MB Limit for client upload
          throw new Error("Video boyutu 100MB'dan küçük olmalıdır.");
      }
  }

  return new Promise((resolve, reject) => {
    // Create a unique filename: timestamp_originalName
    const uniqueName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

/**
 * Safely deletes a file from Firebase Storage using its download URL.
 * Swallows errors if the file doesn't exist (idempotent operation).
 */
export const deleteFileByUrl = async (url: string | undefined | null): Promise<void> => {
    if (!url || !url.includes('firebasestorage')) return;

    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        console.log(`Deleted file: ${url}`);
    } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn(`Failed to delete file (${url}):`, error);
        }
    }
};
