import "server-only";

import {
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
} from "@/lib/carbon-constants";
import type {
    CIFactorType,
    GreenHoursData,
    GreenHoursSlot,
    LiveCarbonData,
} from "@/lib/carbon-intensity-types";

const EMAPS_TOKEN = process.env.EMAPS_TOKEN ?? "";
const EMAPS_BASE = "https://api.electricitymaps.com/v3";
const UK_CI_API = "https://api.carbonintensity.org.uk";

interface ZoneConfig {
    zone: string;
    label: string;
    representative: boolean;
}

const REGION_TO_ZONE: Record<string, ZoneConfig | null> = {
    vietnam: { zone: "VN", label: "Vietnam grid", representative: false },
    china: { zone: "CN", label: "China grid", representative: false },
    india: { zone: "IN", label: "India grid", representative: false },
    us: { zone: "US-CAL-CISO", label: "California ISO", representative: true },
    eu: { zone: "DE", label: "Germany grid", representative: true },
    uk: { zone: "GB", label: "Great Britain grid", representative: false },
    japan: { zone: "JP", label: "Japan grid", representative: false },
    korea: { zone: "KR", label: "South Korea grid", representative: false },
    australia: { zone: "AU-NSW", label: "New South Wales grid", representative: true },
    nordics: { zone: "SE", label: "Sweden grid", representative: true },
    france: { zone: "FR", label: "France grid", representative: false },
    global: null,
};

const ciCache: Record<string, { data: LiveCarbonData; ts: number }> = {};
const greenHoursCache: Record<string, { data: GreenHoursData | null; ts: number }> = {};
const CACHE_MS = 5 * 60 * 1000;

function ciToIndex(ci: number): string {
    if (ci <= 50) return "very low";
    if (ci <= 150) return "low";
    if (ci <= 300) return "moderate";
    if (ci <= 500) return "high";
    return "very high";
}

function mapFactorType(raw: unknown): CIFactorType {
    if (raw === "direct") return "direct";
    if (raw === "lifecycle") return "lifecycle";
    return "unknown";
}

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

async function fetchEMapsLatest(
    zoneConfig: ZoneConfig,
    factorType?: "direct" | "lifecycle"
): Promise<LiveCarbonData | null> {
    if (!EMAPS_TOKEN) return null;
    const params = new URLSearchParams({ zone: zoneConfig.zone });
    if (factorType) {
        params.set("emissionFactorType", factorType);
    }

    const res = await fetch(`${EMAPS_BASE}/carbon-intensity/latest?${params.toString()}`, {
        headers: { "auth-token": EMAPS_TOKEN },
        cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json();
    const currentCI = Number(data?.carbonIntensity);
    if (!Number.isFinite(currentCI)) return null;

    return {
        currentCI: Math.round(currentCI),
        index: ciToIndex(currentCI),
        isLive: true,
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
        source: "electricitymaps",
        factorType: mapFactorType(data?.emissionFactorType ?? factorType),
        zone: zoneConfig.zone,
        zoneLabel: zoneConfig.label,
        isRepresentativeZone: zoneConfig.representative,
    };
}

export async function fetchLiveCIFromProvider(region: string): Promise<LiveCarbonData> {
    const cached = ciCache[region];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
        return cached.data;
    }

    const zoneConfig = REGION_TO_ZONE[region];

    if (zoneConfig && EMAPS_TOKEN) {
        try {
            const preferred = await fetchEMapsLatest(zoneConfig, "direct");
            const fallback = preferred ?? await fetchEMapsLatest(zoneConfig);
            if (fallback) {
                ciCache[region] = { data: fallback, ts: Date.now() };
                return fallback;
            }
        } catch {
            // Fall through to next source.
        }
    }

    if (region === "uk") {
        try {
            const res = await fetch(`${UK_CI_API}/intensity`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const entry = data?.data?.[0];
                if (entry?.intensity) {
                    const currentCI = entry.intensity.actual ?? entry.intensity.forecast;
                    if (Number.isFinite(currentCI)) {
                        const result: LiveCarbonData = {
                            currentCI,
                            index: entry.intensity.index ?? ciToIndex(currentCI),
                            isLive: true,
                            updatedAt: new Date().toISOString(),
                            source: "uk-national-grid",
                            factorType: "direct",
                            zone: "GB",
                            zoneLabel: "Great Britain grid",
                            isRepresentativeZone: false,
                        };
                        ciCache[region] = { data: result, ts: Date.now() };
                        return result;
                    }
                }
            }
        } catch {
            // Fall through to static.
        }
    }

    const staticData = buildStaticCI(region);
    ciCache[region] = { data: staticData, ts: Date.now() };
    return staticData;
}

function analyzeSlots(slots: GreenHoursSlot[]): GreenHoursData {
    const bestSlot = slots.reduce((a, b) => (a.ci < b.ci ? a : b));
    const worstSlot = slots.reduce((a, b) => (a.ci > b.ci ? a : b));

    const now = new Date();
    const currentSlot = slots.find(
        (slot) => new Date(slot.from) <= now && new Date(slot.to) > now
    ) ?? slots[slots.length - 1];

    const currentCI = currentSlot.ci;
    const savingPercent = currentCI > 0
        ? Math.round(((currentCI - bestSlot.ci) / currentCI) * 100)
        : 0;

    return {
        slots,
        bestSlot,
        worstSlot,
        currentCI,
        savingPercent: Math.max(0, savingPercent),
    };
}

async function fetchGreenHoursUK(): Promise<GreenHoursData | null> {
    try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`${UK_CI_API}/intensity/date/${today}`, { cache: "no-store" });
        if (!res.ok) return null;

        const data = await res.json();
        const entries = data?.data;
        if (!Array.isArray(entries) || entries.length === 0) return null;

        const slots: GreenHoursSlot[] = entries.map(
            (entry: {
                from: string;
                to: string;
                intensity: { forecast: number; actual: number | null; index: string };
            }) => ({
                from: entry.from,
                to: entry.to,
                ci: entry.intensity.actual ?? entry.intensity.forecast,
                index: entry.intensity.index,
            })
        );

        return analyzeSlots(slots);
    } catch {
        return null;
    }
}

async function fetchGreenHoursEMaps(zone: string): Promise<GreenHoursData | null> {
    try {
        const params = new URLSearchParams({
            zone,
            emissionFactorType: "direct",
        });
        const res = await fetch(`${EMAPS_BASE}/carbon-intensity/history?${params.toString()}`, {
            headers: { "auth-token": EMAPS_TOKEN },
            cache: "no-store",
        });
        if (!res.ok) return null;

        const data = await res.json();
        const history = data?.history;
        if (!Array.isArray(history) || history.length === 0) return null;

        const slots: GreenHoursSlot[] = history.map(
            (entry: { datetime: string; carbonIntensity: number }, index: number) => {
                const nextDatetime = history[index + 1]?.datetime
                    ?? new Date(new Date(entry.datetime).getTime() + 3600000).toISOString();
                return {
                    from: entry.datetime,
                    to: nextDatetime,
                    ci: Math.round(entry.carbonIntensity),
                    index: ciToIndex(entry.carbonIntensity),
                };
            }
        );

        return analyzeSlots(slots);
    } catch {
        return null;
    }
}

export async function fetchGreenHoursFromProvider(region: string): Promise<GreenHoursData | null> {
    const cached = greenHoursCache[region];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
        return cached.data;
    }

    let result: GreenHoursData | null = null;
    if (region === "uk") {
        result = await fetchGreenHoursUK();
    } else {
        const zoneConfig = REGION_TO_ZONE[region];
        if (zoneConfig && EMAPS_TOKEN) {
            result = await fetchGreenHoursEMaps(zoneConfig.zone);
        }
    }

    greenHoursCache[region] = { data: result, ts: Date.now() };
    return result;
}
