'use client';

import { motion } from 'framer-motion';
import { Teacher } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface NavbarProps {
  teacher?: Teacher;
  showLogout?: boolean;
}

export default function Navbar({ teacher, showLogout = false }: NavbarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
            className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center"
          >
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Face Recognition Attendance"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Face Recognition Attendance
              </h1>
            </div>
          </motion.div>

          {/* Navigation & Actions */}
          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            {teacher && (
              <div className="hidden md:flex items-center space-x-6 mr-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/reports')}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
                >
                  Reports
                </button>
              </div>
            )}

            {/* User Info and Logout */}
            {teacher && (
              <div className="flex items-center space-x-4">
                {/* User Info */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {teacher.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {teacher.name || teacher.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.email}</p>
                  </div>
                </div>

                {showLogout && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}