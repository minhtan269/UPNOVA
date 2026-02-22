// ============================================================
// ACRM - Client carbon intensity API wrapper
// Calls internal server routes to keep provider tokens server-side
// ============================================================

import {
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
} from "./carbon-constants";
import type {
    CIFactorType,
    CISource,
    GreenHoursData,
    GreenHoursSlot,
    LiveCarbonData,
} from "./carbon-intensity-types";

export type {
    CIFactorType,
    CISource,
    GreenHoursData,
    GreenHoursSlot,
    LiveCarbonData,
};

function buildStaticCI(region: string): LiveCarbonData {
    const staticCI =
        CARBON_INTENSITY_BY_REGION[region as keyof typeof CARBON_INTENSITY_BY_REGION] ??
        GLOBAL_CI_FALLBACK;

    return {
        currentCI: staticCI,
        index: "static",
        isLive: false,
        updatedAt: new Date().toISOString(),
        source: "static",
        factorType: "unknown",
        zone: null,
        zoneLabel: null,
        isRepresentativeZone: false,
    };
}

/**
 * Fetch real-time carbon intensity for a region from internal API.
 * Falls back to static regional intensity on error.
 */
export async function fetchLiveCI(region: string): Promise<LiveCarbonData> {
    try {
        const res = await fetch(`/api/carbon/live?region=${encodeURIComponent(region)}`, {
            method: "GET",
            cache: "no-store",
        });

        if (!res.ok) {
            return buildStaticCI(region);
        }

        const data = (await res.json()) as LiveCarbonData;
        if (!Number.isFinite(data?.currentCI)) {
            return buildStaticCI(region);
        }

        return data;
    } catch {
        return buildStaticCI(region);
    }
}

/**
 * Fetch green-hours data from internal API.
 */
export async function fetchGreenHours(region: string): Promise<GreenHoursData | null> {
    try {
        const res = await fetch(`/api/carbon/green-hours?region=${encodeURIComponent(region)}`, {
            method: "GET",
            cache: "no-store",
        });

        if (!res.ok) return null;
        const data = (await res.json()) as GreenHoursData | null;
        if (!data || !Array.isArray(data.slots)) return null;
        return data;
    } catch {
        return null;
    }
}

/**
 * Format a UTC ISO string to local HH:mm.
 */
export function formatSlotTime(isoString: string): string {
    try {
        return new Date(isoString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return isoString;
    }
}

/**
 * Color helper by CI index.
 */
export function getCIColor(index: string): string {
    switch (index) {
        case "very low":
            return "#22c55e";
        case "low":
            return "#0FA697";
        case "moderate":
            return "#D9CD2B";
        case "high":
            return "#f97316";
        case "very high":
            return "#D91A1A";
        default:
            return "#6b7280";
    }
}
