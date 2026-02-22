"use client";

import { useACRMStore } from "@/lib/store";
import { AVAILABLE_REGIONS } from "@/lib/carbon-constants";
import { formatSlotTime, getCIColor } from "@/lib/carbon-intensity-api";
import type { GreenHoursSlot } from "@/lib/carbon-intensity-api";

export default function GreenHours() {
    const greenHours = useACRMStore((s) => s.greenHours);
    const isCILive = useACRMStore((s) => s.isCILive);
    const selectedRegion = useACRMStore((s) => s.selectedRegion);

    if (!isCILive || !greenHours || greenHours.slots.length === 0) {
        return null;
    }

    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === selectedRegion);

    const { slots, bestSlot, worstSlot, currentCI, savingPercent } = greenHours;

    // Get max CI for scaling bars
    const maxCI = Math.max(...slots.map((s) => s.ci));

    // Current time slot highlight
    const now = new Date();

    return (
        <div className="rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#141720] p-4 shadow-sm backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">🌿</span>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                        Green Hours
                    </h3>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Live {regionInfo?.flag ?? "🌍"} {regionInfo?.label ?? "Grid"}
                    </span>
                </div>
            </div>

            {/* Best slot recommendation */}
            {bestSlot && savingPercent > 0 && (
                <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">⚡</span>
                        <div className="text-xs">
                            <span className="text-emerald-400 font-semibold">
                                Best time: {formatSlotTime(bestSlot.from)} – {formatSlotTime(bestSlot.to)}
                            </span>
                            <span className="text-gray-400 ml-1.5">
                                ({bestSlot.ci} gCO₂/kWh)
                            </span>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 ml-6">
                        Run AI queries then to save{" "}
                        <span className="text-emerald-400 font-semibold">~{savingPercent}%</span>{" "}
                        carbon vs now ({currentCI} gCO₂/kWh)
                    </p>
                </div>
            )}

            {/* Current vs Best vs Worst summary */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <CISummaryCard
                    label="Current"
                    value={currentCI}
                    color="#0FA697"
                />
                {bestSlot && (
                    <CISummaryCard
                        label="Lowest"
                        value={bestSlot.ci}
                        color="#22c55e"
                    />
                )}
                {worstSlot && (
                    <CISummaryCard
                        label="Highest"
                        value={worstSlot.ci}
                        color="#f97316"
                    />
                )}
            </div>

            {/* 24h CI Bar Chart */}
            <div className="mb-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                    Carbon Intensity — Today ({regionInfo?.label ?? "Grid"})
                </p>
                <div className="flex items-end gap-[2px] h-16">
                    {slots.map((slot, i) => {
                        const height = maxCI > 0 ? (slot.ci / maxCI) * 100 : 0;
                        const isCurrentSlot =
                            new Date(slot.from) <= now && new Date(slot.to) > now;
                        const isBest = bestSlot && slot.from === bestSlot.from;

                        return (
                            <div
                                key={i}
                                className="relative flex-1 group"
                                title={`${formatSlotTime(slot.from)}: ${slot.ci} gCO₂/kWh (${slot.index})`}
                            >
                                <div
                                    className={`w-full rounded-t-[2px] transition-all duration-300 ${isCurrentSlot
                                        ? "ring-1 ring-white/60"
                                        : ""
                                        } ${isBest ? "ring-1 ring-emerald-400/80" : ""}`}
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: getCIColor(slot.index),
                                        opacity: isCurrentSlot ? 1 : 0.7,
                                    }}
                                />
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                    <div className="bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg">
                                        {formatSlotTime(slot.from)} · {slot.ci}g
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Time axis labels */}
                <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-gray-500">00:00</span>
                    <span className="text-[8px] text-gray-500">06:00</span>
                    <span className="text-[8px] text-gray-500">12:00</span>
                    <span className="text-[8px] text-gray-500">18:00</span>
                    <span className="text-[8px] text-gray-500">24:00</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
                {["very low", "low", "moderate", "high", "very high"].map((level) => (
                    <div key={level} className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCIColor(level) }}
                        />
                        <span className="text-[8px] text-gray-500 capitalize">{level}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CISummaryCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="rounded-lg bg-gray-100/50 dark:bg-[#1a1d27] p-2 text-center">
            <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">
                {label}
            </p>
            <p className="text-sm font-bold" style={{ color }}>
                {value}
            </p>
            <p className="text-[8px] text-gray-400">gCO₂/kWh</p>
        </div>
    );
}
