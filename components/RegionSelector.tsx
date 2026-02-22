"use client";

import { useEffect } from "react";
import { useACRMStore } from "@/lib/store";
import { AVAILABLE_REGIONS, GLOBAL_CI_FALLBACK } from "@/lib/carbon-constants";

export default function RegionSelector() {
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const setRegion = useACRMStore((s) => s.setRegion);
    const isCILive = useACRMStore((s) => s.isCILive);
    const liveCarbonIntensity = useACRMStore((s) => s.liveCarbonIntensity);
    const ciIndex = useACRMStore((s) => s.ciIndex);
    const ciSource = useACRMStore((s) => s.ciSource);
    const ciFactorType = useACRMStore((s) => s.ciFactorType);
    const ciZoneLabel = useACRMStore((s) => s.ciZoneLabel);
    const ciIsRepresentativeZone = useACRMStore((s) => s.ciIsRepresentativeZone);
    const fetchLiveCarbonData = useACRMStore((s) => s.fetchLiveCarbonData);

    const currentRegion = AVAILABLE_REGIONS.find((r) => r.id === selectedRegion);

    useEffect(() => {
        fetchLiveCarbonData();
        const interval = setInterval(fetchLiveCarbonData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [selectedRegion, fetchLiveCarbonData]);

    const displayCI = liveCarbonIntensity ?? currentRegion?.ci ?? GLOBAL_CI_FALLBACK;
    const ciUnit = ciSource === "electricitymaps" ? "gCO2e/kWh" : "gCO2/kWh";
    const sourceLabel =
        ciSource === "electricitymaps"
            ? `Electricity Maps (${ciFactorType})`
            : ciSource === "uk-national-grid"
                ? "UK National Grid"
                : "Static regional factor";

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label
                htmlFor="region-select"
                className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >
                Region:
            </label>

            <div className="relative">
                <select
                    id="region-select"
                    value={selectedRegion}
                    onChange={(e) => setRegion(e.target.value)}
                    className="appearance-none rounded-lg border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]
                     py-1.5 pr-8 pl-3 text-xs font-medium text-gray-700 dark:text-gray-200
                     shadow-sm backdrop-blur-sm transition-all
                     hover:border-[#0FA697]/50 focus:border-[#0FA697] focus:ring-2 focus:ring-[#0FA697]/20
                     focus:outline-none cursor-pointer"
                >
                    {AVAILABLE_REGIONS.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.flag} {r.label} ({r.ci} gCO2/kWh)
                        </option>
                    ))}
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {isCILive ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        LIVE
                    </span>
                ) : (
                    <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                        Static
                    </span>
                )}
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {displayCI} {ciUnit}
                    {isCILive && ciIndex && (
                        <span className={`ml-1 ${
                            ciIndex === "very low" || ciIndex === "low"
                                ? "text-emerald-400"
                                : ciIndex === "moderate"
                                    ? "text-yellow-400"
                                    : "text-orange-400"
                        }`}>
                            ({ciIndex})
                        </span>
                    )}
                </span>
            </div>

            {isCILive && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                    <span>{sourceLabel}</span>
                    {ciZoneLabel && (
                        <span>
                            · Zone: {ciZoneLabel}
                            {ciIsRepresentativeZone ? " (representative)" : ""}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
