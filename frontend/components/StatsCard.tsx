'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
    blue: {
        light: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
    },
    green: {
        light: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
    },
    purple: {
        light: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
        light: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
    },
};

export default function StatsCard({
    title,
    value,
    icon: Icon,
    subtitle,
    color = 'blue',
}: StatsCardProps) {
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 p-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {title}
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                    )}
                </div>
                <div className={`${colors.light} p-4 rounded-full`}>
                    <Icon className={`w-8 h-8 ${colors.text}`} />
                </div>
            </div>
        </motion.div>
    );
}
