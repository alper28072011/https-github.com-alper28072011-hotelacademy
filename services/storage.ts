
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * Provides progress updates via a callback.
 */
export const uploadFile = (
  file: File, 
  path: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create a unique filename: timestamp_originalName
    const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

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
        // Create a reference from the URL
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        console.log(`Deleted file: ${url}`);
    } catch (error: any) {
        // Ignore "Object not found" errors, log others
        if (error.code !== 'storage/object-not-found') {
            console.warn(`Failed to delete file (${url}):`, error);
        }
    }
};
