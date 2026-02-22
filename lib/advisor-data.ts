import {
    AVAILABLE_MODELS,
    AVAILABLE_REGIONS,
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
} from "./carbon-constants";
import { calculateGHGBreakdown } from "./ghg-protocol";
import { predictDailyCarbon } from "./carbon-forecast";
import {
    DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
    type AdvisorDataQuality,
    type AdvisorLanguageMode,
    type AdvisorSnapshot,
    type AdvisorSnapshotSource,
    type AdvisorSupplementalInput,
} from "./advisor-types";
import type { CarbonConfidence } from "./carbon-calc";

function round(value: number, digits = 4): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function sum(values: number[]): number {
    return values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
}

export function getAdvisorLanguageModeFromText(
    text: string | undefined | null
): AdvisorLanguageMode {
    if (!text || text.trim().length === 0) return "vi_mixed";
    const lower = text.toLowerCase();

    // Heuristic: Vietnamese diacritics or common VN keywords.
    const hasVietnameseChars = /[ăâđêôơưáàạảãấầậẩẫắằặẳẵéèẹẻẽếềệểễíìịỉĩóòọỏõốồộổỗớờợởỡúùụủũứừựửữýỳỵỷỹ]/i.test(text);
    const hasVietnameseWords = /\b(giup|giúp|bao cao|báo cáo|du lieu|dữ liệu|phat thai|phát thải|chi tiet|chi tiết)\b/i.test(lower);

    if (hasVietnameseChars || hasVietnameseWords) {
        return "vi_mixed";
    }

    return "en";
}

export function normalizeAdvisorSupplementalInput(
    input?: Partial<AdvisorSupplementalInput> | null
): AdvisorSupplementalInput {
    return {
        ...DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
        ...(input ?? {}),
        dataQualityLevel: (input?.dataQualityLevel ??
            DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT.dataQualityLevel) as AdvisorDataQuality,
        inventoryApproach:
            input?.inventoryApproach ??
            DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT.inventoryApproach,
    };
}

export function getAdvisorDataGaps(
    supplemental: AdvisorSupplementalInput
): string[] {
    const gaps: string[] = [];

    if (!supplemental.reportingEntity.trim()) {
        gaps.push("Missing reporting entity/legal unit name.");
    }
    if (!supplemental.reportingPeriodStart.trim()) {
        gaps.push("Missing reporting period start date.");
    }
    if (!supplemental.reportingPeriodEnd.trim()) {
        gaps.push("Missing reporting period end date.");
    }
    if (!supplemental.organizationalBoundary.trim()) {
        gaps.push("Missing organizational boundary definition.");
    }
    if (!supplemental.operationalBoundary.trim()) {
        gaps.push("Missing operational boundary definition.");
    }
    if (!supplemental.methodologyStandard.trim()) {
        gaps.push("Missing methodology standard reference.");
    }
    if (!supplemental.reportOwnerOrReviewer.trim()) {
        gaps.push("Missing report owner/reviewer information.");
    }

    return gaps;
}

function deriveConfidence(source: AdvisorSnapshotSource): CarbonConfidence {
    const assistantMessages = source.messages.filter((m) => m.role === "assistant");
    if (assistantMessages.length === 0) return "low";

    const scoreMap: Record<CarbonConfidence, number> = {
        high: 3,
        medium: 2,
        low: 1,
    };
    const avg =
        sum(
            assistantMessages.map(
                (m) => scoreMap[m.metrics.meta?.confidence ?? "low"]
            )
        ) / assistantMessages.length;

    if (avg >= 2.6 && source.isCILive && source.ciFactorType === "direct") {
        return "high";
    }
    if (avg >= 1.8) return "medium";
    return "low";
}

function buildAssumptions(source: AdvisorSnapshotSource): string[] {
    const assumptions: string[] = [
        "Scope 2 is estimated from operational inference energy and regional carbon intensity.",
        "Scope 3 is an estimated value-chain proxy (training amortization + infrastructure overhead).",
        "This output is advisory drafting support, not legal assurance or certification.",
    ];

    if (!source.isCILive) {
        assumptions.push("Carbon intensity may be static/annualized fallback for selected region.");
    }
    if (source.ciFactorType !== "direct") {
        assumptions.push("Carbon intensity factor type is not confirmed as direct operational emissions.");
    }

    return assumptions;
}

export function buildAdvisorSnapshot(
    source: AdvisorSnapshotSource,
    supplementalInput?: AdvisorSupplementalInput
): AdvisorSnapshot {
    const supplemental = normalizeAdvisorSupplementalInput(supplementalInput);
    const dataGaps = getAdvisorDataGaps(supplemental);

    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === source.selectedRegion);
    const ciValue = source.isCILive && source.liveCarbonIntensity !== null
        ? source.liveCarbonIntensity
        : (CARBON_INTENSITY_BY_REGION[source.selectedRegion as keyof typeof CARBON_INTENSITY_BY_REGION]
            ?? GLOBAL_CI_FALLBACK);

    const assistantMessages = source.messages.filter((m) => m.role === "assistant");
    const userMessages = source.messages.filter((m) => m.role === "user");

    const inputTokens = sum(userMessages.map((m) => m.metrics.inputTokens));
    const visibleOutputTokens = sum(
        assistantMessages.map(
            (m) => m.metrics.visibleOutputTokens ?? m.metrics.outputTokens
        )
    );
    const reasoningTokens = sum(
        assistantMessages.map((m) => m.metrics.reasoningTokens ?? 0)
    );
    const billedOutputTokens = sum(
        assistantMessages.map(
            (m) => m.metrics.billedOutputTokens ?? m.metrics.outputTokens
        )
    );

    const modelMap = new Map<
        string,
        { messageCount: number; totalTokens: number; totalCO2: number; totalEnergyWh: number }
    >();
    for (const msg of assistantMessages) {
        const current = modelMap.get(msg.modelId) ?? {
            messageCount: 0,
            totalTokens: 0,
            totalCO2: 0,
            totalEnergyWh: 0,
        };
        current.messageCount += 1;
        current.totalTokens += msg.metrics.totalTokens;
        current.totalCO2 += msg.metrics.co2Grams;
        current.totalEnergyWh += msg.metrics.energyWh;
        modelMap.set(msg.modelId, current);
    }

    const modelBreakdown = [...modelMap.entries()].map(([modelId, data]) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        return {
            modelId,
            modelName: model?.name ?? modelId,
            messageCount: data.messageCount,
            totalTokens: data.totalTokens,
            totalCO2: round(data.totalCO2),
            totalEnergyWh: round(data.totalEnergyWh),
            avgCO2PerMessage: data.messageCount > 0
                ? round(data.totalCO2 / data.messageCount)
                : 0,
        };
    }).sort((a, b) => b.totalCO2 - a.totalCO2);

    const topCarbonMessages = [...assistantMessages]
        .sort((a, b) => b.metrics.co2Grams - a.metrics.co2Grams)
        .slice(0, 5)
        .map((msg) => {
            const model = AVAILABLE_MODELS.find((m) => m.id === msg.modelId);
            return {
                timestamp: msg.timestamp,
                modelId: msg.modelId,
                modelName: model?.name ?? msg.modelId,
                co2Grams: round(msg.metrics.co2Grams),
                tokenCount: msg.metrics.totalTokens,
                excerpt: msg.content.replace(/\s+/g, " ").trim().slice(0, 180),
            };
        });

    const ghg = calculateGHGBreakdown(
        source.sessionStats.totalEnergyWh,
        ciValue,
        assistantMessages.map((msg) => ({
            role: msg.role,
            modelId: msg.modelId,
            metrics: { totalTokens: msg.metrics.totalTokens },
        }))
    );

    const latestResilience = source.resilienceHistory[source.resilienceHistory.length - 1];
    const forecast = source.sessionStats.messageCount > 0
        ? predictDailyCarbon(
            source.sessionStats.totalCO2,
            source.sessionStartTime,
            source.carbonBudget,
            source.resilienceHistory,
            assistantMessages.map((msg) => ({
                role: msg.role,
                timestamp: msg.timestamp,
                metrics: { co2Grams: msg.metrics.co2Grams },
            }))
        )
        : null;

    const durationMinutes = source.sessionStartTime
        ? Math.max(0, Math.round((Date.now() - source.sessionStartTime) / 60000))
        : 0;

    return {
        generatedAt: new Date().toISOString(),
        selectedModelId: source.selectedModelId,
        sessionStartTime: source.sessionStartTime,
        durationMinutes,
        sessionStats: {
            totalCO2: round(source.sessionStats.totalCO2),
            totalEnergyWh: round(source.sessionStats.totalEnergyWh),
            totalTokens: Math.round(source.sessionStats.totalTokens),
            messageCount: source.sessionStats.messageCount,
            assistantMessageCount: assistantMessages.length,
        },
        tokenBreakdown: {
            inputTokens: Math.round(inputTokens),
            visibleOutputTokens: Math.round(visibleOutputTokens),
            reasoningTokens: Math.round(reasoningTokens),
            billedOutputTokens: Math.round(billedOutputTokens),
        },
        region: {
            id: source.selectedRegion,
            label: regionInfo?.label ?? source.selectedRegion,
            ciValue: round(ciValue, 2),
            ciSource: source.ciSource ?? "static",
            ciFactorType: source.ciFactorType,
            ciZoneLabel: source.ciZoneLabel,
            ciIsRepresentativeZone: source.ciIsRepresentativeZone,
        },
        ghg: {
            scope2: round(ghg.scope2.total),
            scope3: round(ghg.scope3.total),
            totalGHG: round(ghg.totalGHG),
            scope2Percent: ghg.scope2Percent,
            scope3Percent: ghg.scope3Percent,
        },
        resilience: {
            carbonExposure: latestResilience?.carbonExposure ?? 0,
            costShockIndex: latestResilience?.costShockIndex ?? 0,
            resilienceScore: latestResilience?.resilienceScore ?? 0,
        },
        forecast: forecast
            ? {
                isReady: forecast.isReady,
                predictedDailyCO2: forecast.predictedDailyCO2,
                currentBudgetUsedPct: forecast.currentBudgetUsedPct,
                predictedBudgetUsedPct: forecast.predictedBudgetUsedPct,
                confidence: forecast.confidence,
            }
            : null,
        modelBreakdown,
        topCarbonMessages,
        assumptions: buildAssumptions(source),
        dataGaps,
        confidence: deriveConfidence(source),
    };
}
