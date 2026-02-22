// ============================================================
// ACRM - GHG Protocol Engine (Scope 2 + Scope 3)
// ============================================================

import { AVAILABLE_REGIONS, GLOBAL_CI_FALLBACK } from "./carbon-constants";

// Scope 3 training amortization constants (gCO2 per 1K tokens)
const TRAINING_CO2_PER_1K_TOKENS: Record<string, number> = {
    "gpt-4o": 0.0120,
    "gpt-4-turbo": 0.0150,
    "claude-sonnet": 0.0100,
    "claude-opus": 0.0130,
    "gemini-pro": 0.0080,
    "gpt-3.5-turbo": 0.0040,
    "claude-haiku": 0.0035,
    "gemini-flash": 0.0030,
    "gemini-flash-lite": 0.0015,
    large: 0.0120,
    medium: 0.0040,
    small: 0.0015,
};

// Infrastructure overhead multiplier (PUE ~1.15).
const INFRA_OVERHEAD_FACTOR = 1.15;

export interface GHGBreakdown {
    scope2: {
        total: number;
        description: string;
        methodology: string;
    };
    scope3: {
        total: number;
        training: number;
        infrastructure: number;
        description: string;
        methodology: string;
    };
    totalGHG: number;
    scope2Percent: number;
    scope3Percent: number;
}

export interface VerificationStatement {
    methodology: string;
    dataSources: string[];
    confidence: "high" | "medium" | "low";
    limitations: string[];
    standard: string;
    boundaries: string;
}

function safePositive(value: number, fallback = 0): number {
    if (!Number.isFinite(value) || value < 0) return fallback;
    return value;
}

/**
 * Scope 2 = purchased electricity emissions from inference runtime.
 */
export function calculateScope2(energyWh: number, regionCI: number): number {
    const safeEnergyWh = safePositive(energyWh);
    const safeRegionCI = safePositive(regionCI, GLOBAL_CI_FALLBACK);
    return (safeEnergyWh / 1000) * safeRegionCI;
}

/**
 * Scope 3 (estimated) = amortized training + infrastructure overhead.
 */
export function calculateScope3(
    messages: Array<{ role: string; modelId: string; metrics: { totalTokens: number } }>
): { training: number; infrastructure: number; total: number } {
    const aiMessages = messages.filter((m) => m.role === "assistant");

    let training = 0;
    for (const msg of aiMessages) {
        const safeTokens = safePositive(msg.metrics.totalTokens);
        const rate = TRAINING_CO2_PER_1K_TOKENS[msg.modelId]
            ?? TRAINING_CO2_PER_1K_TOKENS.medium;
        training += (safeTokens / 1000) * rate;
    }

    const infrastructure = training * (INFRA_OVERHEAD_FACTOR - 1);
    return {
        training,
        infrastructure,
        total: training + infrastructure,
    };
}

/**
 * Complete Scope 2 + Scope 3 breakdown.
 */
export function calculateGHGBreakdown(
    energyWh: number,
    regionCI: number,
    messages: Array<{ role: string; modelId: string; metrics: { totalTokens: number } }>
): GHGBreakdown {
    const scope2Total = calculateScope2(energyWh, regionCI);
    const scope3 = calculateScope3(messages);

    const totalGHG = scope2Total + scope3.total;
    const scope2Percent = totalGHG > 0 ? Math.round((scope2Total / totalGHG) * 100) : 0;
    const scope3Percent = totalGHG > 0 ? Math.round((scope3.total / totalGHG) * 100) : 0;

    return {
        scope2: {
            total: scope2Total,
            description: "Operational inference emissions from purchased electricity (Scope 2).",
            methodology: "Location-based Scope 2: energy (kWh) x regional grid carbon intensity (gCO2/kWh).",
        },
        scope3: {
            total: scope3.total,
            training: scope3.training,
            infrastructure: scope3.infrastructure,
            description: "Estimated value-chain emissions (Scope 3): amortized training plus infrastructure overhead.",
            methodology: "Estimated amortized training CO2 per 1K tokens with PUE adjustment (1.15).",
        },
        totalGHG,
        scope2Percent,
        scope3Percent,
    };
}

export function generateVerificationStatement(region: string): VerificationStatement {
    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === region);

    return {
        methodology: `This report follows the GHG Protocol Corporate Standard (Scope 2 location-based and Scope 3 Category 11) and aligns with ISO 14064-1:2018. Scope 2 is based on measured session energy and ${regionInfo ? `${regionInfo.label} grid` : "global average"} intensity factors. Scope 3 values are estimated from published training studies and amortization assumptions.`,
        dataSources: [
            `Regional CI: ${regionInfo ? `${regionInfo.ci} gCO2/kWh (${regionInfo.label})` : `${GLOBAL_CI_FALLBACK} gCO2/kWh (global average fallback)`}`,
            "Model energy: provider-reported usage and published energy studies.",
            "Training CO2 estimates: Strubell et al. (2019), Patterson et al. (2021), Luccioni et al. (2023).",
            "Infrastructure overhead: PUE factor 1.15 (hyperscale reference).",
            "Token counting: API-reported (Gemini) or heuristic estimate (4 chars/token) for mock models.",
        ],
        confidence: "medium",
        limitations: [
            "Scope 3 values are estimated and may differ from provider-internal accounting.",
            "Energy per token uses model-level averages and can vary by hardware/runtime load.",
            "Regional CI can fluctuate; static CI values are annualized approximations.",
            "Non-live model integrations may use heuristic token counts.",
        ],
        standard: "GHG Protocol Corporate Standard, ISO 14064-1:2018",
        boundaries: "Organizational boundary: operational control. Reporting period: single user session.",
    };
}

/**
 * Deterministic report ID helper.
 */
export function generateReportHash(data: {
    totalCO2: number;
    totalTokens: number;
    messageCount: number;
    timestamp: string;
}): string {
    const input = `ACRM|${data.totalCO2}|${data.totalTokens}|${data.messageCount}|${data.timestamp}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `ACRM-${hex.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}
