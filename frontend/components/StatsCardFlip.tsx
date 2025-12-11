"use client";

/**
 * StatsCardFlip - Based on KokonutUI CardFlip
 * @description: 3D flip card component for displaying stats
 */

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useState } from "react";

export interface StatsCardFlipProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'slate';
}

const colorConfig = {
    blue: {
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        valueBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-blue-200',
    },
    green: {
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
        valueBg: 'bg-gradient-to-br from-green-50 to-green-100',
        border: 'border-green-200',
    },
    purple: {
        iconBg: 'bg-purple-100',
        iconText: 'text-purple-600',
        valueBg: 'bg-gradient-to-br from-purple-50 to-purple-100',
        border: 'border-purple-200',
    },
    orange: {
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600',
        valueBg: 'bg-gradient-to-br from-orange-50 to-orange-100',
        border: 'border-orange-200',
    },
    slate: {
        iconBg: 'bg-slate-100',
        iconText: 'text-slate-600',
        valueBg: 'bg-gradient-to-br from-slate-50 to-slate-100',
        border: 'border-slate-200',
    },
};

export default function StatsCardFlip({
    title,
    value,
    icon: Icon,
    subtitle,
    color = 'slate',
}: StatsCardFlipProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const colors = colorConfig[color];

    return (
        <div
            className="flip-card-container relative w-full h-[140px] cursor-pointer"
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <div className={cn("flip-card-inner", isFlipped && "flipped")}>
                {/* Front of card */}
                <div className={cn(
                    "flip-card-front rounded-xl bg-white border shadow-sm p-5",
                    colors.border
                )}>
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-3", colors.iconBg)}>
                            <Icon className={cn("w-7 h-7", colors.iconText)} />
                        </div>
                        <p className="text-base font-semibold text-slate-700">
                            {title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Hover to reveal
                        </p>
                    </div>
                </div>

                {/* Back of card */}
                <div className={cn(
                    "flip-card-back rounded-xl border shadow-sm p-5",
                    colors.valueBg,
                    colors.border
                )}>
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className={cn("text-4xl font-bold mb-2", colors.iconText)}>
                            {value}
                        </p>
                        <p className="text-sm font-medium text-slate-600">
                            {title}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-slate-400 mt-1">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .flip-card-container {
                    perspective: 1000px;
                }
                
                .flip-card-inner {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transition: transform 0.6s;
                    transform-style: preserve-3d;
                }
                
                .flip-card-inner.flipped {
                    transform: rotateY(180deg);
                }
                
                .flip-card-front,
                .flip-card-back {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    -webkit-backface-visibility: hidden;
                    backface-visibility: hidden;
                }
                
                .flip-card-back {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
}
