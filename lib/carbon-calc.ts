// ============================================================
// ACRM Carbon Calculator
// V1 fallback: CO2(g) = (tokens/1000) * E_coeff(kWh) * CI(gCO2/kWh)
// V2 primary:  energy(kWh) = (tokens * J_per_token) / 3_600_000
//              CO2(g) = energy(kWh) * CI
// ============================================================

import {
    AVAILABLE_MODELS,
    CARBON_INTENSITY,
    ENERGY_COEFFICIENTS,
    JOULES_PER_KWH,
    SIMPLE_PROMPT_THRESHOLD,
    SMARTPHONE_CHARGE_WH,
    type ModelClass,
} from "./carbon-constants";

export type CarbonLevel = "low" | "medium" | "high";
export type CarbonMethod = "v2-model-specific" | "v1-class-fallback";
export type CarbonTokenSource = "api" | "heuristic";
export type CarbonCISource = "live" | "static";
export type CarbonCIFactorType = "direct" | "lifecycle" | "unknown";
export type CarbonConfidence = "high" | "medium" | "low";

export interface CarbonComputationMeta {
    method: CarbonMethod;
    tokenSource: CarbonTokenSource;
    ciSource: CarbonCISource;
    ciFactorType: CarbonCIFactorType;
    confidence: CarbonConfidence;
    assumptions: string[];
}

export interface ComputeMetricsOptions {
    tokenSource?: CarbonTokenSource;
    ciSource?: CarbonCISource;
    ciFactorType?: CarbonCIFactorType;
    assumptions?: string[];
}

export interface CarbonMetrics {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    /** Non-thinking output tokens visible in final response text */
    visibleOutputTokens?: number;
    /** Reasoning / thought tokens reported by provider */
    reasoningTokens?: number;
    /** Billed output tokens = visible + reasoning */
    billedOutputTokens?: number;
    energyKwh: number;
    energyWh: number;
    co2Grams: number;
    /** Scope 2 operational emissions (gCO2). */
    scope2Grams?: number;
    /** Scope 3 value-chain estimate (gCO2). Optional and usually set in report layer. */
    scope3Grams?: number;
    meta?: CarbonComputationMeta;
    level: CarbonLevel;
    /** If false, this metric only carries token count (no AI inference happened yet) */
    showCarbon: boolean;
}

function sanitizeTokenCount(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.floor(value);
}

function sanitizeNonNegative(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
}

function deriveConfidence(
    tokenSource: CarbonTokenSource,
    ciSource: CarbonCISource,
    ciFactorType: CarbonCIFactorType
): CarbonConfidence {
    if (tokenSource !== "api") return "low";
    if (ciSource === "live" && ciFactorType === "direct") return "high";
    return "medium";
}

function buildMeta(
    method: CarbonMethod,
    options: ComputeMetricsOptions
): CarbonComputationMeta {
    const tokenSource = options.tokenSource ?? "heuristic";
    const ciSource = options.ciSource ?? "static";
    const ciFactorType = options.ciFactorType ?? "unknown";
    const assumptions = options.assumptions ?? [];

    return {
        method,
        tokenSource,
        ciSource,
        ciFactorType,
        confidence: deriveConfidence(tokenSource, ciSource, ciFactorType),
        assumptions,
    };
}

/**
 * Calculate energy consumption in kWh for a token count and model class.
 */
export function calculateEnergy(tokens: number, modelClass: ModelClass): number {
    const safeTokens = sanitizeTokenCount(tokens);
    return (safeTokens / 1000) * ENERGY_COEFFICIENTS[modelClass];
}

/**
 * Calculate CO2 emissions in grams using default global CI.
 */
export function calculateCO2(tokens: number, modelClass: ModelClass): number {
    const energyKwh = calculateEnergy(tokens, modelClass);
    return energyKwh * CARBON_INTENSITY;
}

/**
 * Map raw CO2 grams to a severity level for color coding.
 */
export function getCarbonLevel(co2Grams: number): CarbonLevel {
    if (co2Grams < 0.5) return "low";
    if (co2Grams < 2.0) return "medium";
    return "high";
}

/**
 * V1 fallback (class-based) metrics.
 * @param carbonIntensity Regional CI override (default: global fallback)
 */
export function computeMetrics(
    inputTokens: number,
    outputTokens: number,
    modelClass: ModelClass,
    carbonIntensity: number = CARBON_INTENSITY,
    options: ComputeMetricsOptions = {}
): CarbonMetrics {
    const safeInput = sanitizeTokenCount(inputTokens);
    const safeOutput = sanitizeTokenCount(outputTokens);
    const totalTokens = safeInput + safeOutput;
    const safeCI = sanitizeNonNegative(carbonIntensity);

    const energyKwh = calculateEnergy(totalTokens, modelClass);
    const energyWh = energyKwh * 1000;
    const co2Grams = energyKwh * safeCI;
    const level = getCarbonLevel(co2Grams);

    return {
        totalTokens,
        inputTokens: safeInput,
        outputTokens: safeOutput,
        visibleOutputTokens: safeOutput,
        reasoningTokens: 0,
        billedOutputTokens: safeOutput,
        energyKwh,
        energyWh,
        co2Grams,
        scope2Grams: co2Grams,
        scope3Grams: 0,
        meta: buildMeta("v1-class-fallback", {
            ...options,
            assumptions: [
                "Class-based fallback coefficient derived from median J/token by class.",
                ...(options.assumptions ?? []),
            ],
        }),
        level,
        showCarbon: true,
    };
}

/**
 * Lightweight metrics for user messages (token count only, no carbon).
 */
export function computeUserMetrics(inputTokens: number): CarbonMetrics {
    const safeInput = sanitizeTokenCount(inputTokens);
    return {
        totalTokens: safeInput,
        inputTokens: safeInput,
        outputTokens: 0,
        visibleOutputTokens: 0,
        reasoningTokens: 0,
        billedOutputTokens: 0,
        energyKwh: 0,
        energyWh: 0,
        co2Grams: 0,
        scope2Grams: 0,
        scope3Grams: 0,
        meta: {
            method: "v1-class-fallback",
            tokenSource: "heuristic",
            ciSource: "static",
            ciFactorType: "unknown",
            confidence: "low",
            assumptions: ["User message only; no model inference executed."],
        },
        level: "low",
        showCarbon: false,
    };
}

/**
 * Convert total Wh consumed to smartphone-charge equivalents.
 */
export function toSmartphoneCharges(totalWh: number): number {
    return sanitizeNonNegative(totalWh) / SMARTPHONE_CHARGE_WH;
}

/**
 * Determine whether to recommend a lighter model.
 */
export function getSmartRecommendation(modelId: string, inputTokens: number): string | null {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) return null;

    if (model.modelClass === "large" && inputTokens < SIMPLE_PROMPT_THRESHOLD) {
        const largeCO2 = calculateCO2(inputTokens, "large");
        const smallCO2 = calculateCO2(inputTokens, "small");
        const savingPct = largeCO2 > 0
            ? Math.round(((largeCO2 - smallCO2) / largeCO2) * 100)
            : 0;

        return `Resilience Alert: You used a high-emission model for a simple task (${inputTokens} tokens). Switching to Gemini Flash would save ~${savingPct}% carbon.`;
    }

    return null;
}

/**
 * V2 primary metrics.
 * energy(kWh) = (totalTokens * jPerToken) / 3,600,000
 * co2(g) = energy(kWh) * carbonIntensity
 *
 * Falls back to V1 class-based coefficient if model has no jPerToken.
 */
export function computeMetricsV2(
    inputTokens: number,
    outputTokens: number,
    modelId: string,
    carbonIntensity: number = CARBON_INTENSITY,
    options: ComputeMetricsOptions = {}
): CarbonMetrics {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    const safeInput = sanitizeTokenCount(inputTokens);
    const safeOutput = sanitizeTokenCount(outputTokens);
    const totalTokens = safeInput + safeOutput;
    const safeCI = sanitizeNonNegative(carbonIntensity);

    const hasModelSpecificData = !!(model && Number.isFinite(model.jPerToken) && model.jPerToken > 0);
    let energyKwh: number;

    if (hasModelSpecificData && model) {
        energyKwh = (totalTokens * model.jPerToken) / JOULES_PER_KWH;
    } else {
        const modelClass = model?.modelClass ?? "medium";
        energyKwh = calculateEnergy(totalTokens, modelClass);
    }

    const energyWh = energyKwh * 1000;
    const co2Grams = energyKwh * safeCI;
    const level = getCarbonLevel(co2Grams);

    const method: CarbonMethod = hasModelSpecificData
        ? "v2-model-specific"
        : "v1-class-fallback";

    const assumptions = hasModelSpecificData
        ? options.assumptions ?? []
        : [
            "Model missing J/token; used class-based fallback coefficient.",
            ...(options.assumptions ?? []),
        ];

    return {
        totalTokens,
        inputTokens: safeInput,
        outputTokens: safeOutput,
        visibleOutputTokens: safeOutput,
        reasoningTokens: 0,
        billedOutputTokens: safeOutput,
        energyKwh,
        energyWh,
        co2Grams,
        scope2Grams: co2Grams,
        scope3Grams: 0,
        meta: buildMeta(method, { ...options, assumptions }),
        level,
        showCarbon: true,
    };
}
