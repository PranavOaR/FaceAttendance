"use client";

/**
 * Loader - Inspired by Aceternity UI
 * @description: Beautiful animated loader components for loading states
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LoaderProps {
    className?: string;
    text?: string;
}

// Loader One - Spinning gradient ring
export function LoaderOne({ className, text }: LoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative w-16 h-16">
                {/* Outer spinning ring */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: "conic-gradient(from 0deg, transparent, #3b82f6, #8b5cf6, #ec4899, transparent)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                {/* Inner circle to create ring effect */}
                <div className="absolute inset-2 rounded-full bg-white" />
                {/* Center dot */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                </motion.div>
            </div>
            {text && (
                <motion.p
                    className="text-sm font-medium text-gray-600"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}

// Loader Two - Pulsing dots
export function LoaderTwo({ className, text }: LoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        animate={{
                            y: ["0%", "-50%", "0%"],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                        }}
                    />
                ))}
            </div>
            {text && (
                <p className="text-sm font-medium text-gray-600">{text}</p>
            )}
        </div>
    );
}

// Loader Three - Scanning animation (for face recognition)
export function ScanningLoader({ className, text }: LoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative w-24 h-24">
                {/* Face outline */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-200" />

                {/* Scanning line */}
                <motion.div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-500 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-500 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-500 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-500 rounded-br" />

                {/* Pulsing center */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <div className="w-8 h-8 rounded-full bg-blue-100" />
                </motion.div>
            </div>
            {text && (
                <motion.p
                    className="text-sm font-medium text-gray-600"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}

// Loader Four - Training animation (for model training)
export function TrainingLoader({ className, text, progress }: LoaderProps & { progress?: number }) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
            <div className="relative w-20 h-20">
                {/* Rotating outer rings */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border-2 border-transparent"
                        style={{
                            borderTopColor: i === 0 ? "#3b82f6" : i === 1 ? "#8b5cf6" : "#ec4899",
                            inset: `${i * 6}px`,
                        }}
                        animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                        transition={{ duration: 2 - i * 0.3, repeat: Infinity, ease: "linear" }}
                    />
                ))}

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </motion.div>
                </div>
            </div>

            {/* Progress bar if provided */}
            {progress !== undefined && (
                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}

            {text && (
                <motion.p
                    className="text-sm font-medium text-gray-600 text-center"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}

// Default export
export default LoaderOne;
