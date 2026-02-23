"use client";

import { useACRMStore } from "@/lib/store";
import {
    TREE_CO2_KG_PER_YEAR,
    CAR_CO2_G_PER_KM,
    FLIGHT_HN_SGN_CO2_KG,
    NETFLIX_CO2_G_PER_HOUR,
    OFFSET_COST_VOLUNTARY_USD_PER_TON,
    OFFSET_COST_EU_ETS_USD_PER_TON,
    SMARTPHONE_CHARGE_WH,
} from "@/lib/carbon-constants";

interface OffsetItem {
    icon: string;
    label: string;
    value: string;
    sublabel: string;
}

function computeOffsets(
    co2Grams: number,
    energyWh: number
): OffsetItem[] {
    // Trees needed to offset (1 tree = 25kg/year = 25000g/year)
    const treeDays = co2Grams > 0 ? (co2Grams / (TREE_CO2_KG_PER_YEAR * 1000)) * 365 : 0;

    // Driving distance equivalent
    const drivingKm = co2Grams / CAR_CO2_G_PER_KM;

    // Smartphone charges
    const charges = energyWh / SMARTPHONE_CHARGE_WH;

    // Flight percentage (HN → SGN = 180kg = 180,000g)
    const flightPct = (co2Grams / (FLIGHT_HN_SGN_CO2_KG * 1000)) * 100;

    // Netflix hours
    const netflixHours = co2Grams / NETFLIX_CO2_G_PER_HOUR;

    // Offset costs (1 ton = 1,000,000 g)
    const costVoluntary = (co2Grams / 1_000_000) * OFFSET_COST_VOLUNTARY_USD_PER_TON;
    const costEU = (co2Grams / 1_000_000) * OFFSET_COST_EU_ETS_USD_PER_TON;

    return [
        {
            icon: "🌳",
            label: "Trees to plant",
            value: treeDays < 0.001 ? treeDays.toExponential(1) : treeDays.toFixed(3),
            sublabel: "absorption days (25 kg CO₂/year/tree)",
        },
        {
            icon: "🚗",
            label: "Km driven",
            value: drivingKm < 0.001 ? drivingKm.toExponential(1) : drivingKm.toFixed(4),
            sublabel: `equivalent (EU avg ${CAR_CO2_G_PER_KM}g/km)`,
        },
        {
            icon: "📱",
            label: "Smartphone charges",
            value: charges < 0.0001 ? charges.toExponential(1) : charges.toFixed(4),
            sublabel: "full charges (5 Wh/charge)",
        },
        {
            icon: "✈️",
            label: "% of HN→SGN flight",
            value: flightPct < 0.0001 ? flightPct.toExponential(1) : flightPct.toFixed(6),
            sublabel: `% (of total ${FLIGHT_HN_SGN_CO2_KG}kg CO₂)`,
        },
        {
            icon: "🎬",
            label: "Netflix hours",
            value: netflixHours < 0.001 ? netflixHours.toExponential(1) : netflixHours.toFixed(4),
            sublabel: `hours of streaming (${NETFLIX_CO2_G_PER_HOUR}g/hour)`,
        },
        {
            icon: "💰",
            label: "Offset cost",
            value: costVoluntary < 0.000001
                ? `$${costVoluntary.toExponential(1)}`
                : `$${costVoluntary.toFixed(6)}`,
            sublabel: `Voluntary ($${OFFSET_COST_VOLUNTARY_USD_PER_TON}/ton) | EU: $${costEU.toFixed(6)}`,
        },
    ];
}

export default function CarbonOffset() {
    const sessionStats = useACRMStore((s) => s.sessionStats);

    const offsets = computeOffsets(sessionStats.totalCO2, sessionStats.totalEnergyWh);

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 p-3 backdrop-blur-sm shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                🌍 Carbon Equivalents
            </h3>

            {sessionStats.totalCO2 === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    Send a message to view equivalents
                </div>
            ) : (
                <div className="space-y-2">
                    {offsets.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-2.5 rounded-lg bg-gray-50/80 dark:bg-[#1a1d27]/80 px-2.5 py-2"
                        >
                            <span className="text-lg flex-shrink-0">{item.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                                        {item.value}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {item.label}
                                    </span>
                                </div>
                                <p className="text-[9px] text-gray-400 leading-tight truncate">
                                    {item.sublabel}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Data sources */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#2a2d3a]">
                <p className="text-[8px] text-gray-300 leading-relaxed">
                    Sources: EcoTree, ACEA/EU 2024, ICAO, IEA/Carbon Trust, CarbonCredits.com 2025, ICAP 2024
                </p>
            </div>
        </div>
    );
}
