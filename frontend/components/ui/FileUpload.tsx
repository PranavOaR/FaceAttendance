"use client";

/**
 * FileUpload - Based on KokonutUI
 * @description: Animated file upload component with drag and drop
 */

import {
    useState,
    useRef,
    useCallback,
    type DragEvent,
    useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type FileStatus = "idle" | "dragging" | "uploading" | "success";

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    acceptedFileTypes?: string[];
    maxFileSize?: number;
    className?: string;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const formatBytes = (bytes: number, decimals = 2): string => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

const UploadIllustration = () => (
    <div className="relative w-12 h-12">
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
        >
            <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-gray-200"
                strokeWidth="2"
                strokeDasharray="4 4"
            >
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="60s"
                    repeatCount="indefinite"
                />
            </circle>

            <path
                d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
                className="fill-blue-100 stroke-blue-500"
                strokeWidth="2"
            >
                <animate
                    attributeName="d"
                    dur="2s"
                    repeatCount="indefinite"
                    values="
                        M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
                        M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
                        M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
                />
            </path>

            <g className="transform translate-y-2">
                <line
                    x1="50"
                    y1="45"
                    x2="50"
                    y2="60"
                    className="stroke-blue-500"
                    strokeWidth="2"
                    strokeLinecap="round"
                >
                    <animate
                        attributeName="y2"
                        values="60;55;60"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </line>
                <polyline
                    points="42,52 50,45 58,52"
                    className="stroke-blue-500"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                >
                    <animate
                        attributeName="points"
                        values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </polyline>
            </g>
        </svg>
    </div>
);

export default function FileUpload({
    onFileSelect,
    acceptedFileTypes = ["image/*"],
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    className,
}: FileUploadProps) {
    const [status, setStatus] = useState<FileStatus>("idle");
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
        (selectedFile: File | null) => {
            if (!selectedFile) return;

            setError(null);

            // Validate file size
            if (selectedFile.size > maxFileSize) {
                setError(`File size exceeds ${formatBytes(maxFileSize)}`);
                return;
            }

            // Validate file type
            if (acceptedFileTypes.length > 0) {
                const isValidType = acceptedFileTypes.some((type) => {
                    if (type.endsWith("/*")) {
                        return selectedFile.type.startsWith(type.replace("/*", ""));
                    }
                    return selectedFile.type === type;
                });

                if (!isValidType) {
                    setError("Invalid file type. Please upload an image.");
                    return;
                }
            }

            setStatus("success");
            onFileSelect(selectedFile);

            // Reset status after brief delay
            setTimeout(() => setStatus("idle"), 500);
        },
        [maxFileSize, acceptedFileTypes, onFileSelect]
    );

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus("dragging");
    }, []);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus("idle");
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setStatus("idle");
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) handleFileSelect(droppedFile);
        },
        [handleFileSelect]
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = e.target.files?.[0];
            handleFileSelect(selectedFile || null);
            if (e.target) e.target.value = "";
        },
        [handleFileSelect]
    );

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className={cn("relative w-full", className)}>
            <div
                className={cn(
                    "relative w-full rounded-xl border-2 border-dashed transition-all duration-200",
                    status === "dragging"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100",
                    error && "border-red-300 bg-red-50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center py-6 px-4 cursor-pointer" onClick={triggerFileInput}>
                    <UploadIllustration />

                    <div className="text-center mt-3">
                        <p className="text-sm font-medium text-gray-700">
                            {status === "dragging" ? "Drop your photo here" : "Drag & drop or click to upload"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG or GIF up to {formatBytes(maxFileSize)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerFileInput();
                        }}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>Choose File</span>
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        onChange={handleFileInputChange}
                        accept={acceptedFileTypes.join(",")}
                    />
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-sm text-red-500 mt-2 text-center"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
