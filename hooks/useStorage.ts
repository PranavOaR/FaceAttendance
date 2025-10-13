'use client';

import { useState } from 'react';
import { uploadStudentPhoto, uploadBase64Photo, deleteStudentPhoto } from '@/lib/uploadPhoto';

export interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
}

// Hook for uploading student photos
export function usePhotoUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    url: null
  });

  const uploadPhoto = async (
    file: File,
    teacherId: string,
    classId: string,
    studentSRN: string
  ): Promise<string> => {
    try {
      setUploadState({
        uploading: true,
        progress: 0,
        error: null,
        url: null
      });

      const url = await uploadStudentPhoto(
        file,
        teacherId,
        classId,
        studentSRN,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }));
        }
      );

      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        url
      });

      return url;
    } catch (error: any) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error.message || 'Upload failed',
        url: null
      });
      throw error;
    }
  };

  const uploadBase64 = async (
    base64String: string,
    teacherId: string,
    classId: string,
    studentSRN: string
  ): Promise<string> => {
    try {
      setUploadState({
        uploading: true,
        progress: 0,
        error: null,
        url: null
      });

      const url = await uploadBase64Photo(base64String, teacherId, classId, studentSRN);

      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        url
      });

      return url;
    } catch (error: any) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error.message || 'Upload failed',
        url: null
      });
      throw error;
    }
  };

  const deletePhoto = async (photoURL: string): Promise<void> => {
    try {
      await deleteStudentPhoto(photoURL);
      setUploadState({
        uploading: false,
        progress: 0,
        error: null,
        url: null
      });
    } catch (error: any) {
      setUploadState(prev => ({
        ...prev,
        error: error.message || 'Delete failed'
      }));
      throw error;
    }
  };

  const reset = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      url: null
    });
  };

  return {
    ...uploadState,
    uploadPhoto,
    uploadBase64,
    deletePhoto,
    reset
  };
}

// Hook for handling multiple file uploads
export function useMultipleUpload() {
  const [uploads, setUploads] = useState<{ [key: string]: UploadState }>({});

  const uploadFile = async (
    key: string,
    file: File,
    teacherId: string,
    classId: string,
    studentSRN: string
  ): Promise<string> => {
    try {
      setUploads(prev => ({
        ...prev,
        [key]: { uploading: true, progress: 0, error: null, url: null }
      }));

      const url = await uploadStudentPhoto(
        file,
        teacherId,
        classId,
        studentSRN,
        (progress) => {
          setUploads(prev => ({
            ...prev,
            [key]: { ...prev[key], progress }
          }));
        }
      );

      setUploads(prev => ({
        ...prev,
        [key]: { uploading: false, progress: 100, error: null, url }
      }));

      return url;
    } catch (error: any) {
      setUploads(prev => ({
        ...prev,
        [key]: {
          uploading: false,
          progress: 0,
          error: error.message || 'Upload failed',
          url: null
        }
      }));
      throw error;
    }
  };

  const getUploadState = (key: string): UploadState => {
    return uploads[key] || { uploading: false, progress: 0, error: null, url: null };
  };

  const removeUpload = (key: string) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[key];
      return newUploads;
    });
  };

  const reset = () => {
    setUploads({});
  };

  return {
    uploads,
    uploadFile,
    getUploadState,
    removeUpload,
    reset
  };
}

// Hook for drag and drop file uploads
export function useDragAndDrop(
  onFilesDrop: (files: File[]) => void,
  acceptedTypes: string[] = ['image/*']
) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      })
    );

    if (validFiles.length > 0) {
      onFilesDrop(validFiles);
    }
  };

  const dragHandlers = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop
  };

  return {
    isDragOver,
    dragHandlers
  };
}