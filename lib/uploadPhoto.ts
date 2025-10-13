// Firebase Storage helper for uploading student photos
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

/**
 * Upload a student photo to Firebase Storage
 * @param file - The image file to upload
 * @param teacherId - The teacher's UID
 * @param classId - The class ID
 * @param studentSRN - The student's SRN (for filename)
 * @returns Promise<string> - The download URL of the uploaded photo
 */
export const uploadStudentPhoto = async (
  file: File,
  teacherId: string,
  classId: string,
  studentSRN: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Create storage reference with SRN-based naming for ML training
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${studentSRN.toUpperCase()}.${fileExtension}`;
    const storageRef = ref(storage, `studentPhotos/${teacherId}/${classId}/${fileName}`);

    // Upload file
    if (onProgress) {
      onProgress(0);
    }

    const snapshot = await uploadBytes(storageRef, file);
    
    if (onProgress) {
      onProgress(100);
    }

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

/**
 * Upload a photo from base64 string
 * @param base64String - Base64 encoded image
 * @param teacherId - The teacher's UID
 * @param classId - The class ID
 * @param studentSRN - The student's SRN
 * @returns Promise<string> - The download URL
 */
export const uploadBase64Photo = async (
  base64String: string,
  teacherId: string,
  classId: string,
  studentSRN: string
): Promise<string> => {
  try {
    // Convert base64 to blob
    const response = await fetch(base64String);
    const blob = await response.blob();
    
    // Create file from blob with SRN-based naming
    const file = new File([blob], `${studentSRN.toUpperCase()}.jpg`, { type: 'image/jpeg' });
    
    return await uploadStudentPhoto(file, teacherId, classId, studentSRN);
  } catch (error) {
    console.error('Error uploading base64 photo:', error);
    throw error;
  }
};

/**
 * Delete a student photo from Firebase Storage
 * @param photoURL - The download URL of the photo to delete
 */
export const deleteStudentPhoto = async (photoURL: string): Promise<void> => {
  try {
    if (!photoURL) return;
    
    // Extract the file path from the download URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media&token=...
    const url = new URL(photoURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);
    
    if (!pathMatch) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    // Decode the file path
    const filePath = decodeURIComponent(pathMatch[1]);
    
    // Create reference using the file path
    const photoRef = ref(storage, filePath);
    
    // Delete the file
    await deleteObject(photoRef);
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

/**
 * Get optimized photo URL with size parameters
 * @param photoURL - Original photo URL
 * @param size - Desired size (e.g., 'thumb', 'small', 'medium')
 * @returns string - Optimized photo URL
 */
export const getOptimizedPhotoURL = (photoURL: string, size: 'thumb' | 'small' | 'medium' = 'medium'): string => {
  if (!photoURL) return '';
  
  const sizeMap = {
    thumb: '_200x200',
    small: '_400x400', 
    medium: '_800x800'
  };
  
  // For future implementation with image optimization service
  // return `${photoURL}${sizeMap[size]}`;
  
  // For now, return original URL
  return photoURL;
};