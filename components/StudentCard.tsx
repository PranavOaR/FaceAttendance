'use client';

import { motion } from 'framer-motion';
import { Student } from '@/lib/types';
import Image from 'next/image';

interface StudentCardProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
  attendanceStatus?: 'present' | 'absent' | null;
}

export default function StudentCard({ 
  student, 
  onEdit, 
  onDelete, 
  attendanceStatus = null 
}: StudentCardProps) {
  const getStatusColor = () => {
    switch (attendanceStatus) {
      case 'present':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'absent':
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (attendanceStatus) {
      case 'present':
        return (
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'absent':
        return (
          <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, scale: 1.02 }}
      className={`relative rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border overflow-hidden ${getStatusColor()}`}
    >
      {/* Status Indicator */}
      {getStatusIcon()}

      <div className="p-4">
        {/* Student Photo */}
        <div className="flex justify-center mb-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
            {student.photo ? (
              <Image
                src={student.photo}
                alt={student.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Student Info */}
        <div className="text-center mb-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">{student.name}</h3>
          <p className="text-xs text-gray-600 font-mono">{student.srn}</p>
        </div>

        {/* Attendance Status Badge */}
        {attendanceStatus && (
          <div className="flex justify-center mb-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              attendanceStatus === 'present' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
            </span>
          </div>
        )}

        {/* Action Buttons (only show if not in attendance mode) */}
        {!attendanceStatus && (
          <div className="flex justify-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(student)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              title="Edit Student"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(student.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Student"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}