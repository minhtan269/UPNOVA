"use client";

import { useACRMStore } from "@/lib/store";
import { useState } from "react";

const PRESETS = [
    { label: "1g", value: 1 },
    { label: "5g", value: 5 },
    { label: "10g", value: 10 },
    { label: "50g", value: 50 },
];

export default function CarbonBudget() {
    const carbonBudget = useACRMStore((s) => s.carbonBudget);
    const setCarbonBudget = useACRMStore((s) => s.setCarbonBudget);
    const totalCO2 = useACRMStore((s) => s.sessionStats.totalCO2);
    const [isEditing, setIsEditing] = useState(false);

    const usedPct = carbonBudget > 0 ? Math.min((totalCO2 / carbonBudget) * 100, 100) : 0;
    const remaining = Math.max(carbonBudget - totalCO2, 0);

    // Color logic: green → yellow → red
    let ringColor: string;
    let statusLabel: string;
    let statusColor: string;

    if (usedPct >= 100) {
        ringColor = "#D91A1A";
        statusLabel = "Budget exceeded!";
        statusColor = "text-[#D91A1A]";
    } else if (usedPct >= 85) {
        ringColor = "#D91A1A";
        statusLabel = "Near limit!";
        statusColor = "text-[#D91A1A]";
    } else if (usedPct >= 60) {
        ringColor = "#D9CD2B";
        statusLabel = "Warning";
        statusColor = "text-[#b8a800]";
    } else {
        ringColor = "#0FA697";
        statusLabel = "Good";
        statusColor = "text-[#0FA697]";
    }

    // SVG Ring constants
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (usedPct / 100) * circumference;

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 p-3 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    💰 Carbon Budget
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[10px] text-gray-400 hover:text-[#0FA697] transition-colors"
                >
                    {isEditing ? "✓ Done" : "⚙️ Set budget"}
                </button>
            </div>

            {/* Budget Presets (when editing) */}
            {isEditing && (
                <div className="flex gap-1.5 mb-3">
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setCarbonBudget(p.value)}
                            className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold transition-all ${carbonBudget === p.value
                                ? "bg-[#0FA697] text-white shadow-sm"
                                : "bg-gray-100 dark:bg-[#1a1d27] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <input
                        type="number"
                        min={0.1}
                        step={0.5}
                        value={carbonBudget}
                        onChange={(e) => setCarbonBudget(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="w-14 rounded-lg border border-gray-200 dark:border-[#2a2d3a] px-1.5 py-1 text-[10px] text-center font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1a1d27] focus:border-[#0FA697] focus:outline-none"
                    />
                </div>
            )}

            {/* Circular progress ring */}
            <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                    <svg width="90" height="90" viewBox="0 0 90 90">
                        {/* Background ring */}
                        <circle
                            cx="45"
                            cy="45"
                            r={radius}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="6"
                        />
                        {/* Progress ring */}
                        <circle
                            cx="45"
                            cy="45"
                            r={radius}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 45 45)"
                            className="transition-all duration-700 ease-out"
                        />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black" style={{ color: ringColor }}>
                            {usedPct.toFixed(0)}%
                        </span>
                        <span className="text-[8px] text-gray-400 dark:text-gray-500">used</span>
                    </div>
                </div>

                {/* Stats beside ring */}
                <div className="flex-1 space-y-1.5">
                    <div>
                        <div className="text-[10px] text-gray-400">Used</div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {totalCO2 < 0.01 ? totalCO2.toExponential(1) : totalCO2.toFixed(4)}g
                            <span className="text-gray-400 dark:text-gray-500 font-normal"> / {carbonBudget}g</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400">Remaining</div>
                        <div className="text-sm font-bold" style={{ color: ringColor }}>
                            {remaining < 0.01 ? remaining.toExponential(1) : remaining.toFixed(4)}g
                        </div>
                    </div>
                    <div className={`text-[10px] font-bold ${statusColor}`}>
                        {statusLabel}
                    </div>
                </div>
            </div>
        </div>
    );
}
