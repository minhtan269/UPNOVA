// ============================================================
// ACRM Carbon Engine - Constants and Model Definitions
// ============================================================

/** Global default carbon intensity fallback (gCO2/kWh). */
export const GLOBAL_CI_FALLBACK = 445;

/** Backward-compatible alias used across existing code. */
export const CARBON_INTENSITY = GLOBAL_CI_FALLBACK;

/** Physics conversion: 1 kWh = 3,600,000 Joules. */
export const JOULES_PER_KWH = 3_600_000;

export type ModelClass = "small" | "medium" | "large";

export interface ModelInfo {
    id: string;
    name: string;
    provider: "OpenAI" | "Google" | "Anthropic";
    modelClass: ModelClass;
    badge: string;
    /** Wh consumed per average query (~500 tokens) - research estimate */
    whPerQuery: number;
    /** Joules consumed per token */
    jPerToken: number;
    /** Source for model energy estimate */
    energySource: string;
    /** Real API model ID for live calls (null = mock only) */
    apiModelId: string | null;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
    // ---- Google (Real API) ----
    {
        id: "gemini-flash",
        name: "Gemini Flash",
        provider: "Google",
        modelClass: "small",
        badge: "Eco",
        whPerQuery: 0.022,
        jPerToken: 0.16,
        energySource: "Google Environmental Report 2025",
        apiModelId: "gemini-2.5-flash-lite",
    },
    {
        id: "gemini-pro",
        name: "Gemini Pro",
        provider: "Google",
        modelClass: "large",
        badge: "Power",
        whPerQuery: 0.24,
        jPerToken: 1.5,
        energySource: "Google Environmental Report 2025",
        apiModelId: "gemini-2.5-flash",
    },
    // ---- OpenAI (Mock) ----
    {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "OpenAI",
        modelClass: "small",
        badge: "Eco",
        whPerQuery: 0.075,
        jPerToken: 0.5,
        energySource: "OffsetAI Research 2024",
        apiModelId: null,
    },
    {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "OpenAI",
        modelClass: "medium",
        badge: "Balanced",
        whPerQuery: 0.15,
        jPerToken: 1.0,
        energySource: "OffsetAI Research 2024",
        apiModelId: null,
    },
    {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "OpenAI",
        modelClass: "large",
        badge: "Power",
        whPerQuery: 0.38,
        jPerToken: 2.0,
        energySource: "Energy Institute 2024, arXiv 2025",
        apiModelId: null,
    },
    // ---- Anthropic (Mock) ----
    {
        id: "claude-haiku",
        name: "Claude Haiku",
        provider: "Anthropic",
        modelClass: "medium",
        badge: "Balanced",
        whPerQuery: 0.15,
        jPerToken: 0.8,
        energySource: "Anthropic estimates 2024",
        apiModelId: null,
    },
    {
        id: "claude-opus",
        name: "Claude Opus",
        provider: "Anthropic",
        modelClass: "large",
        badge: "Power",
        whPerQuery: 0.8,
        jPerToken: 2.5,
        energySource: "arXiv 2025 eco-efficiency study",
        apiModelId: null,
    },
];

function median(values: number[]): number {
    if (values.length === 0) return 1;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function deriveFallbackJPerTokenByClass(): Record<ModelClass, number> {
    const byClass: Record<ModelClass, number[]> = {
        small: [],
        medium: [],
        large: [],
    };

    for (const model of AVAILABLE_MODELS) {
        if (Number.isFinite(model.jPerToken) && model.jPerToken > 0) {
            byClass[model.modelClass].push(model.jPerToken);
        }
    }

    return {
        small: round(median(byClass.small), 3),
        medium: round(median(byClass.medium), 3),
        large: round(median(byClass.large), 3),
    };
}

/** Fallback J/token values derived from the current model catalog medians. */
export const FALLBACK_J_PER_TOKEN_BY_CLASS = deriveFallbackJPerTokenByClass();

function toEnergyCoeffPer1kTokens(jPerToken: number): number {
    // kWh per 1,000 tokens = (1,000 * J/token) / 3,600,000
    return round((1000 * jPerToken) / JOULES_PER_KWH, 8);
}

/**
 * Class-based fallback coefficients in kWh per 1,000 tokens.
 * Derived from FALLBACK_J_PER_TOKEN_BY_CLASS to stay aligned with V2 scale.
 */
export const ENERGY_COEFFICIENTS: Record<ModelClass, number> = {
    small: toEnergyCoeffPer1kTokens(FALLBACK_J_PER_TOKEN_BY_CLASS.small),
    medium: toEnergyCoeffPer1kTokens(FALLBACK_J_PER_TOKEN_BY_CLASS.medium),
    large: toEnergyCoeffPer1kTokens(FALLBACK_J_PER_TOKEN_BY_CLASS.large),
};

/** Threshold (tokens) below which a prompt is considered simple. */
export const SIMPLE_PROMPT_THRESHOLD = 50;

/** 1 smartphone charge ~= 5 Wh. */
export const SMARTPHONE_CHARGE_WH = 5;

// ============================================================
// Regional Carbon Intensity (gCO2/kWh)
// ============================================================

export const CARBON_INTENSITY_BY_REGION = {
    global: GLOBAL_CI_FALLBACK,
    vietnam: 681,
    china: 530,
    india: 632,
    us: 376,
    eu: 220,
    uk: 170,
    japan: 430,
    korea: 400,
    australia: 480,
    nordics: 20,
    france: 50,
} as const;

export type Region = keyof typeof CARBON_INTENSITY_BY_REGION;

export interface RegionInfo {
    id: Region;
    label: string;
    flag: string;
    ci: number;
}

export const AVAILABLE_REGIONS: RegionInfo[] = [
    { id: "global", label: "Global Average", flag: "🌍", ci: GLOBAL_CI_FALLBACK },
    { id: "vietnam", label: "Vietnam", flag: "🇻🇳", ci: 681 },
    { id: "china", label: "China", flag: "🇨🇳", ci: 530 },
    { id: "india", label: "India", flag: "🇮🇳", ci: 632 },
    { id: "us", label: "United States", flag: "🇺🇸", ci: 376 },
    { id: "eu", label: "European Union", flag: "🇪🇺", ci: 220 },
    { id: "uk", label: "United Kingdom", flag: "🇬🇧", ci: 170 },
    { id: "japan", label: "Japan", flag: "🇯🇵", ci: 430 },
    { id: "korea", label: "South Korea", flag: "🇰🇷", ci: 400 },
    { id: "australia", label: "Australia", flag: "🇦🇺", ci: 480 },
    { id: "nordics", label: "Nordics", flag: "🇸🇪", ci: 20 },
    { id: "france", label: "France", flag: "🇫🇷", ci: 50 },
];

// ============================================================
// Carbon Equivalence Constants (for Offset Calculator)
// ============================================================

/** One tree absorbs ~25 kg CO2/year. */
export const TREE_CO2_KG_PER_YEAR = 25;

/** Average EU car: 107 gCO2/km. */
export const CAR_CO2_G_PER_KM = 107;

/** Flight Hanoi -> Ho Chi Minh: ~180 kg CO2. */
export const FLIGHT_HN_SGN_CO2_KG = 180;

/** 1 hour streaming baseline equivalence. */
export const NETFLIX_CO2_G_PER_HOUR = 36;

/** Voluntary market average offset cost in USD/tCO2. */
export const OFFSET_COST_VOLUNTARY_USD_PER_TON = 6.34;

/** EU ETS-like compliance reference in USD/tCO2. */
export const OFFSET_COST_EU_ETS_USD_PER_TON = 70;
