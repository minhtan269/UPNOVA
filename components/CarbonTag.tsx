"use client";

import { type CarbonLevel } from "@/lib/carbon-calc";

interface CarbonTagProps {
    totalTokens: number;
    energyWh: number;
    co2Grams: number;
    level: CarbonLevel;
    /** If false, only show token count (user messages before inference) */
    showCarbon: boolean;
}

const LEVEL_STYLES: Record<CarbonLevel, { bg: string; text: string; label: string }> = {
    low: {
        bg: "bg-[#0FA697]/15",
        text: "text-[#0FA697]",
        label: "Low Impact",
    },
    medium: {
        bg: "bg-[#D9CD2B]/15",
        text: "text-[#b8a800]",
        label: "Medium Impact",
    },
    high: {
        bg: "bg-[#D91A1A]/15",
        text: "text-[#D91A1A]",
        label: "High Impact",
    },
};

export default function CarbonTag({
    totalTokens,
    energyWh,
    co2Grams,
    level,
    showCarbon,
}: CarbonTagProps) {
    const style = LEVEL_STYLES[level];

    // User messages: only show token count
    if (!showCarbon) {
        return (
            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100/60 mt-1.5">
                <span className="text-gray-500">
                    🔤 {totalTokens.toLocaleString()} tokens
                </span>
            </div>
        );
    }

    // AI messages: full carbon info
    return (
        <div
            className={`inline-flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium ${style.bg} mt-1.5 flex-wrap`}
        >
            {/* Tokens */}
            <span className="text-gray-500">
                🔤 {totalTokens.toLocaleString()} tokens
            </span>

            <span className="text-gray-300">|</span>

            {/* Energy */}
            <span className="text-gray-500">
                ⚡ {energyWh < 0.01 ? energyWh.toExponential(2) : energyWh.toFixed(4)}{" "}
                Wh
            </span>

            <span className="text-gray-300">|</span>

            {/* CO₂ */}
            <span className={`font-semibold ${style.text}`}>
                🌿 {co2Grams < 0.01 ? co2Grams.toExponential(2) : co2Grams.toFixed(4)}{" "}
                g CO₂
            </span>

            {/* Badge */}
            <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
            >
                {style.label}
            </span>
        </div>
    );
}
