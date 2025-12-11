'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AddStudentForm, Student } from '@/lib/types';
import { usePhotoUpload } from '@/hooks/useStorage';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import Image from 'next/image';
import FileUpload from '@/components/ui/FileUpload';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: Student) => void;
  initialData?: Student;
  isEditing?: boolean;
  classId: string;
}

export default function AddStudentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  classId
}: AddStudentModalProps) {
  const [formData, setFormData] = useState<AddStudentForm & { parentEmail: string }>({
    name: initialData?.name || '',
    srn: initialData?.srn || '',
    photo: null,
    parentEmail: initialData?.parentEmail || ''
  });
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.photo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { uploadPhoto, uploading, progress, error: uploadError } = usePhotoUpload();

  // Utility function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      try {
        const base64 = await convertFileToBase64(file);
        setFormData({ ...formData, photo: file });
        setPhotoPreview(base64);
      } catch (error) {
        toast.error('Failed to process image');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.srn.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isEditing && !formData.photo) {
      toast.error('Please upload a photo');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoURL = initialData?.photo || '';

      // Upload photo to Firebase Storage if a new photo is provided
      if (formData.photo) {
        photoURL = await uploadPhoto(
          formData.photo,
          user.uid,
          classId,
          formData.srn.trim().toUpperCase() // Use SRN for filename
        );
      }

      const studentData = {
        id: initialData?.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: formData.name.trim(),
        srn: formData.srn.trim().toUpperCase(),
        photo: photoURL,
        classId: classId,
        parentEmail: formData.parentEmail.trim() || undefined
      };

      await onSubmit(studentData);
      setFormData({ name: '', srn: '', photo: null, parentEmail: '' });
      setPhotoPreview('');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialData ? { name: initialData.name, srn: initialData.srn, photo: null, parentEmail: initialData.parentEmail || '' } : { name: '', srn: '', photo: null, parentEmail: '' });
    setPhotoPreview(initialData?.photo || '');
    onClose();
  };

  const removePhoto = () => {
    setFormData({ ...formData, photo: null });
    setPhotoPreview('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Student' : 'Add New Student'}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Student Name */}
                <div>
                  <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-2">
                    Student Name *
                  </label>
                  <input
                    type="text"
                    id="studentName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>

                {/* SRN */}
                <div>
                  <label htmlFor="srn" className="block text-sm font-medium text-gray-700 mb-2">
                    SRN *
                  </label>
                  <input
                    type="text"
                    id="srn"
                    value={formData.srn}
                    onChange={(e) => setFormData({ ...formData, srn: e.target.value })}
                    placeholder="e.g., PES1UG20CS001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Parent Email */}
                <div>
                  <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Email <span className="text-gray-400 font-normal">(for notifications)</span>
                  </label>
                  <input
                    type="email"
                    id="parentEmail"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    placeholder="e.g., parent@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Photo {!isEditing && '*'}
                  </label>

                  {photoPreview ? (
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={photoPreview}
                          alt="Student preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Photo uploaded</p>
                        <div className="flex space-x-2">
                          <label className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="hidden"
                              disabled={isSubmitting}
                            />
                            Change
                          </label>
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            disabled={isSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <FileUpload
                      onFileSelect={async (file) => {
                        try {
                          const base64 = await convertFileToBase64(file);
                          setFormData({ ...formData, photo: file });
                          setPhotoPreview(base64);
                        } catch (error) {
                          toast.error('Failed to process image');
                        }
                      }}
                      acceptedFileTypes={['image/*']}
                      maxFileSize={5 * 1024 * 1024}
                    />
                  )}
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isEditing ? 'Updating...' : 'Adding...'}
                      </div>
                    ) : (
                      isEditing ? 'Update Student' : 'Add Student'
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}