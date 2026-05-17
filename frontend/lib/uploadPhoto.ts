// Student photo upload helper — routes through the backend which stores photos in Cloudinary.

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
}

/**
 * Upload a student photo via the backend API.
 * The backend uploads the file to Cloudinary and returns a permanent CDN URL.
 */
export const uploadStudentPhoto = async (
  file: File,
  teacherId: string,
  classId: string,
  studentSRN: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Client-side validation (fail fast before network request)
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  if (onProgress) onProgress(0);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('teacher_id', teacherId);
  formData.append('class_id', classId);
  formData.append('student_srn', studentSRN);

  const res = await fetch(`${BACKEND_URL}/upload/student-photo`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }

  if (onProgress) onProgress(100);

  const data = await res.json();
  return data.photoURL;
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
 * Delete a student photo via the backend.
 * Cloudinary deletions require the API secret, so this is handled server-side.
 */
export const deleteStudentPhoto = async (photoURL: string): Promise<void> => {
  if (!photoURL) return;

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const res = await fetch(`${BACKEND_URL}/delete/student-photo`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoURL }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Delete failed');
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