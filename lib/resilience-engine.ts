// ============================================================
// ACRM Resilience Engine â€” Layer 4
// Calculates AI Carbon Exposure, Cost Shock, and Resilience Score
// ============================================================

import type { ChatMessage, SessionStats } from "./store";
import {
    AVAILABLE_MODELS,
    ENERGY_COEFFICIENTS,
    GLOBAL_CI_FALLBACK,
    type ModelClass,
} from "./carbon-constants";

// ---- Types ----

export interface ResilienceScores {
    /** 0â€“100: How exposed the org is to carbon costs from AI usage */
    carbonExposure: number;
    /** 0â€“100: Vulnerability to AI cost spikes (over-reliance on large models) */
    costShockIndex: number;
    /** 0â€“100: Overall resilience score (higher = better) */
    resilienceScore: number;
    /** Textual labels */
    carbonExposureLabel: string;
    costShockLabel: string;
    resilienceLabel: string;
}

// ---- Helpers ----

function getModelClass(modelId: string): ModelClass {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    return model?.modelClass ?? "medium";
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}

function getLabel(score: number, invert = false): string {
    // For inverted scales (resilience: higher = better)
    const effective = invert ? 100 - score : score;
    if (effective >= 70) return "Critical";
    if (effective >= 40) return "Moderate";
    return "Healthy";
}

// ---- Core Calculations ----

/**
 * AI Carbon Exposure Index (0â€“100)
 * Measures how much carbon is being generated relative to the amount of
 * useful work (tokens). High exposure = high carbon per token.
 *
 * Logic:
 * - Calculates average COâ‚‚ per 1k tokens across the session
 * - Maps it to a 0â€“100 scale where:
 *   - 0 = minimal exposure (using small models efficiently)
 *   - 100 = maximum exposure (heavy large-model usage)
 * - Reference is dynamically derived from fallback energy coefficients and global CI.
 */
export function calculateCarbonExposure(
    sessionStats: SessionStats,
    messages: ChatMessage[]
): number {
    if (sessionStats.totalTokens === 0 || messages.length === 0) return 0;

    const avgCO2Per1kTokens =
        (sessionStats.totalCO2 / sessionStats.totalTokens) * 1000;

    // Scale: 0.3 g/1k â†’ 0 exposure, 2.5 g/1k â†’ 100 exposure
    const minRef = ENERGY_COEFFICIENTS.small * GLOBAL_CI_FALLBACK;
    const maxRef = Math.max(
        minRef + 0.01,
        ENERGY_COEFFICIENTS.large * GLOBAL_CI_FALLBACK * 1.5
    );
    const score = ((avgCO2Per1kTokens - minRef) / (maxRef - minRef)) * 100;

    return clamp(Math.round(score), 0, 100);
}

/**
 * AI Cost Shock Index (0â€“100)
 * Measures vulnerability to AI cost spikes based on model dependency pattern.
 *
 * Logic:
 * - Calculates percentage of messages using "large" class models
 * - Factors in diversity of model usage (using only one model = riskier)
 * - Penalises sessions where large models are used for short prompts
 */
export function calculateCostShockIndex(messages: ChatMessage[]): number {
    if (messages.length === 0) return 0;

    // Only count AI messages (those with actual carbon)
    const aiMessages = messages.filter((m) => m.role === "assistant");
    if (aiMessages.length === 0) return 0;

    // Factor 1: Large model dependency (0â€“60 points)
    const largeCount = aiMessages.filter(
        (m) => getModelClass(m.modelId) === "large"
    ).length;
    const largePct = largeCount / aiMessages.length;
    const largeScore = largePct * 60;

    // Factor 2: Model diversity penalty (0â€“20 points)
    // Using only 1 model = 20, using 3+ = 0
    const uniqueModels = new Set(aiMessages.map((m) => m.modelId)).size;
    const diversityPenalty = uniqueModels <= 1 ? 20 : uniqueModels === 2 ? 10 : 0;

    // Factor 3: Efficiency penalty â€” large model for short prompts (0â€“20 points)
    const inefficientCount = aiMessages.filter((m) => {
        const mc = getModelClass(m.modelId);
        return mc === "large" && m.metrics.inputTokens < 50;
    }).length;
    const inefficientPct = aiMessages.length > 0 ? inefficientCount / aiMessages.length : 0;
    const efficiencyPenalty = inefficientPct * 20;

    return clamp(Math.round(largeScore + diversityPenalty + efficiencyPenalty), 0, 100);
}

/**
 * AI Resilience Score (0â€“100)
 * Composite score: higher = more resilient (better).
 *
 * Logic: Inverse weighted average of exposure and cost shock,
 * plus bonus points for good practices.
 */
export function calculateResilienceScore(
    carbonExposure: number,
    costShockIndex: number,
    messages: ChatMessage[]
): number {
    if (messages.length === 0) return 100; // No usage = no risk

    // Base: inverse of combined risk (60% weight on exposure, 40% on cost shock)
    const combinedRisk = carbonExposure * 0.6 + costShockIndex * 0.4;
    let score = 100 - combinedRisk;

    // Bonus: using small models boosts resilience (+5 per small-model message, max +15)
    const aiMessages = messages.filter((m) => m.role === "assistant");
    const smallCount = aiMessages.filter(
        (m) => getModelClass(m.modelId) === "small"
    ).length;
    const smallBonus = Math.min(smallCount * 5, 15);
    score += smallBonus;

    return clamp(Math.round(score), 0, 100);
}

/**
 * Compute all three resilience indexes at once.
 */
export function computeResilienceScores(
    sessionStats: SessionStats,
    messages: ChatMessage[]
): ResilienceScores {
    const carbonExposure = calculateCarbonExposure(sessionStats, messages);
    const costShockIndex = calculateCostShockIndex(messages);
    const resilienceScore = calculateResilienceScore(
        carbonExposure,
        costShockIndex,
        messages
    );

    return {
        carbonExposure,
        costShockIndex,
        resilienceScore,
        carbonExposureLabel: getLabel(carbonExposure),
        costShockLabel: getLabel(costShockIndex),
        resilienceLabel: getLabel(resilienceScore, true),
    };
}
