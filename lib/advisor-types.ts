import type {
    CarbonCIFactorType,
    CarbonConfidence,
    CarbonMetrics,
} from "./carbon-calc";
import type { CISource } from "./carbon-intensity-api";

export type AdvisorLanguageMode = "vi_mixed" | "en";
export type AdvisorDataQuality = "high" | "medium" | "low";
export type AdvisorInventoryApproach =
    | "location-based"
    | "market-based"
    | "unknown";

export interface AdvisorSupplementalInput {
    reportingEntity: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
    organizationalBoundary: string;
    operationalBoundary: string;
    methodologyStandard: string;
    inventoryApproach: AdvisorInventoryApproach;
    baseYear: string;
    dataQualityLevel: AdvisorDataQuality;
    reportOwnerOrReviewer: string;
}

export const DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT: AdvisorSupplementalInput = {
    reportingEntity: "",
    reportingPeriodStart: "",
    reportingPeriodEnd: "",
    organizationalBoundary: "",
    operationalBoundary: "",
    methodologyStandard: "GHG Protocol + ISO 14064-1",
    inventoryApproach: "location-based",
    baseYear: "",
    dataQualityLevel: "medium",
    reportOwnerOrReviewer: "",
};

export interface AdvisorMessageInput {
    role: "user" | "assistant";
    content: string;
    modelId: string;
    timestamp: number;
    metrics: CarbonMetrics;
}

export interface AdvisorModelBreakdown {
    modelId: string;
    modelName: string;
    messageCount: number;
    totalTokens: number;
    totalCO2: number;
    totalEnergyWh: number;
    avgCO2PerMessage: number;
}

export interface AdvisorTopCarbonMessage {
    timestamp: number;
    modelId: string;
    modelName: string;
    co2Grams: number;
    tokenCount: number;
    excerpt: string;
}

export interface AdvisorSnapshot {
    generatedAt: string;
    selectedModelId: string;
    sessionStartTime: number | null;
    durationMinutes: number;
    sessionStats: {
        totalCO2: number;
        totalEnergyWh: number;
        totalTokens: number;
        messageCount: number;
        assistantMessageCount: number;
    };
    tokenBreakdown: {
        inputTokens: number;
        visibleOutputTokens: number;
        reasoningTokens: number;
        billedOutputTokens: number;
    };
    region: {
        id: string;
        label: string;
        ciValue: number;
        ciSource: CISource | "static";
        ciFactorType: CarbonCIFactorType;
        ciZoneLabel: string | null;
        ciIsRepresentativeZone: boolean;
    };
    ghg: {
        scope2: number;
        scope3: number;
        totalGHG: number;
        scope2Percent: number;
        scope3Percent: number;
    };
    resilience: {
        carbonExposure: number;
        costShockIndex: number;
        resilienceScore: number;
    };
    forecast: {
        isReady: boolean;
        predictedDailyCO2: number;
        currentBudgetUsedPct: number;
        predictedBudgetUsedPct: number;
        confidence: "low" | "medium" | "high";
    } | null;
    modelBreakdown: AdvisorModelBreakdown[];
    topCarbonMessages: AdvisorTopCarbonMessage[];
    assumptions: string[];
    dataGaps: string[];
    confidence: CarbonConfidence;
}

export interface AdvisorDraftSections {
    executiveSummary: string;
    mrvDataInventory: string;
    scopeNarrative: string;
    methodologyAndAssumptions: string;
    dataGapsAndEvidence: string;
    nextActions: string;
}

export interface AdvisorDraftResult {
    createdAt: number;
    languageMode: AdvisorLanguageMode;
    modelId: string;
    disclaimer: string;
    confidence: CarbonConfidence;
    assumptions: string[];
    dataGaps: string[];
    sections: AdvisorDraftSections;
    fullText: string;
}

export interface AdvisorQAEntry {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    languageMode: AdvisorLanguageMode;
}

export interface AdvisorAnswerResult {
    text: string;
    confidence: CarbonConfidence;
    languageMode: AdvisorLanguageMode;
}

export interface AdvisorSnapshotSource {
    messages: AdvisorMessageInput[];
    sessionStats: {
        totalCO2: number;
        totalEnergyWh: number;
        totalTokens: number;
        messageCount: number;
    };
    selectedModelId: string;
    selectedRegion: string;
    liveCarbonIntensity: number | null;
    isCILive: boolean;
    ciSource: CISource | null;
    ciFactorType: CarbonCIFactorType;
    ciZoneLabel: string | null;
    ciIsRepresentativeZone: boolean;
    resilienceHistory: Array<{
        timestamp: number;
        carbonExposure: number;
        costShockIndex: number;
        resilienceScore: number;
    }>;
    sessionStartTime: number | null;
    carbonBudget: number;
}

