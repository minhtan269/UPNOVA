// ============================================================
// ACRM - Predictive Carbon Forecasting (2.2)
// End-of-day projection with warm-up gate + EMA-smoothed rate
// ============================================================

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DECAY_FACTOR = 0.7;
const MIN_ASSISTANT_SAMPLES = 3;
const MIN_WARMUP_MS = 5 * MINUTE_MS;
const EMA_ALPHA = 0.35;
const EMA_WINDOW = 8;

export interface ForecastMessageInput {
    role: string;
    timestamp: number;
    metrics?: {
        co2Grams?: number;
    };
}

interface EmissionPoint {
    timestamp: number;
    emission: number;
    cumulative: number;
}

export interface CarbonForecast {
    predictedDailyCO2: number;
    currentCO2: number;
    ratePerHour: number;
    effectiveRatePerHour: number;
    hoursElapsed: number;
    hoursRemaining: number;
    budgetStatus: "on-track" | "exceeding" | "critical";
    percentOfBudget: number;
    currentBudgetUsedPct: number;
    predictedBudgetUsedPct: number;
    isReady: boolean;
    confidence: "low" | "medium" | "high";
    assistantSamples: number;
    trendData: { time: number; co2: number; predicted: boolean }[];
}

function round(value: number, digits: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function toPercent(value: number, budget: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(budget) || budget <= 0) return 0;
    return Math.max(0, Math.round((value / budget) * 100));
}

function toBudgetStatus(percent: number): "on-track" | "exceeding" | "critical" {
    if (percent <= 80) return "on-track";
    if (percent <= 120) return "exceeding";
    return "critical";
}

function inferStartTime(sessionStartTime: number | null, messages: ForecastMessageInput[], now: number): number {
    if (typeof sessionStartTime === "number" && Number.isFinite(sessionStartTime)) {
        return Math.min(sessionStartTime, now);
    }

    const earliestMessageTs = messages
        .map((m) => m.timestamp)
        .filter((ts) => Number.isFinite(ts))
        .reduce<number | null>((acc, ts) => (acc === null ? ts : Math.min(acc, ts)), null);

    return earliestMessageTs === null ? now : Math.min(earliestMessageTs, now);
}

function buildEmissionSeries(messages: ForecastMessageInput[]): EmissionPoint[] {
    const assistantMessages = messages
        .filter((m) => m.role === "assistant")
        .map((m) => ({
            timestamp: m.timestamp,
            emission:
                typeof m.metrics?.co2Grams === "number" && Number.isFinite(m.metrics.co2Grams)
                    ? Math.max(0, m.metrics.co2Grams)
                    : 0,
        }))
        .filter((m) => Number.isFinite(m.timestamp) && m.emission > 0)
        .sort((a, b) => a.timestamp - b.timestamp);

    let cumulative = 0;
    return assistantMessages.map((m) => {
        cumulative += m.emission;
        return {
            timestamp: m.timestamp,
            emission: m.emission,
            cumulative,
        };
    });
}

function computeIntervalRates(series: EmissionPoint[], startTime: number): number[] {
    const rates: number[] = [];
    let prevTimestamp = startTime;
    let prevCumulative = 0;

    for (const point of series) {
        const deltaMs = point.timestamp - prevTimestamp;
        const deltaCo2 = point.cumulative - prevCumulative;
        if (deltaMs <= 0 || deltaCo2 < 0) {
            prevTimestamp = point.timestamp;
            prevCumulative = point.cumulative;
            continue;
        }

        const hours = deltaMs / HOUR_MS;
        if (hours <= 0) {
            prevTimestamp = point.timestamp;
            prevCumulative = point.cumulative;
            continue;
        }

        const rate = deltaCo2 / hours;
        if (Number.isFinite(rate) && rate >= 0) {
            rates.push(rate);
        }

        prevTimestamp = point.timestamp;
        prevCumulative = point.cumulative;
    }

    return rates;
}

function computeEMA(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    let ema = values[0];
    for (let i = 1; i < values.length; i += 1) {
        ema = alpha * values[i] + (1 - alpha) * ema;
    }
    return ema;
}

function deriveConfidence(isReady: boolean, assistantSamples: number, hoursElapsed: number): "low" | "medium" | "high" {
    if (!isReady) return "low";
    if (assistantSamples >= 8 && hoursElapsed >= 0.5) return "high";
    return "medium";
}

function buildTrendData(
    startTime: number,
    now: number,
    totalCO2: number,
    series: EmissionPoint[],
    resilienceHistory: { timestamp: number; carbonExposure: number }[]
): CarbonForecast["trendData"] {
    const trendData: CarbonForecast["trendData"] = [];

    if (series.length > 0) {
        trendData.push({ time: startTime, co2: 0, predicted: false });
        for (const point of series) {
            trendData.push({
                time: point.timestamp,
                co2: round(point.cumulative, 3),
                predicted: false,
            });
        }

        const lastActual = series[series.length - 1]?.cumulative ?? 0;
        if (Math.abs(lastActual - totalCO2) > 0.0005) {
            trendData.push({ time: now, co2: round(totalCO2, 3), predicted: false });
        }
        return trendData;
    }

    if (resilienceHistory.length > 0 && totalCO2 > 0) {
        let cumulative = 0;
        const co2PerPoint = totalCO2 / resilienceHistory.length;
        trendData.push({ time: startTime, co2: 0, predicted: false });
        for (const entry of resilienceHistory) {
            cumulative += co2PerPoint;
            trendData.push({
                time: entry.timestamp,
                co2: round(cumulative, 3),
                predicted: false,
            });
        }
        return trendData;
    }

    if (totalCO2 > 0) {
        trendData.push({ time: startTime, co2: 0, predicted: false });
        trendData.push({ time: now, co2: round(totalCO2, 3), predicted: false });
    }

    return trendData;
}

/**
 * Predict end-of-day CO2 from current session pace.
 */
export function predictDailyCarbon(
    totalCO2: number,
    sessionStartTime: number | null,
    carbonBudget: number,
    resilienceHistory: { timestamp: number; carbonExposure: number }[],
    messages: ForecastMessageInput[]
): CarbonForecast {
    const now = Date.now();
    const safeTotalCO2 = Number.isFinite(totalCO2) ? Math.max(0, totalCO2) : 0;
    const startTime = inferStartTime(sessionStartTime, messages, now);

    const elapsedMs = Math.max(0, now - startTime);
    const hoursElapsedRaw = elapsedMs / HOUR_MS;

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const hoursRemainingRaw = Math.max(0, (endOfDay.getTime() - now) / HOUR_MS);

    const series = buildEmissionSeries(messages);
    const assistantSamples = series.length;
    const isReady = assistantSamples >= MIN_ASSISTANT_SAMPLES && elapsedMs >= MIN_WARMUP_MS;

    const intervalRates = computeIntervalRates(series, startTime).slice(-EMA_WINDOW);
    const avgRate = hoursElapsedRaw > 0 ? safeTotalCO2 / hoursElapsedRaw : 0;
    const emaRate = computeEMA(intervalRates, EMA_ALPHA);

    let effectiveRatePerHour = avgRate;
    if (intervalRates.length > 0) {
        effectiveRatePerHour = 0.7 * emaRate + 0.3 * avgRate;
    }
    if (!Number.isFinite(effectiveRatePerHour) || effectiveRatePerHour < 0) {
        effectiveRatePerHour = 0;
    }

    if (!isReady) {
        effectiveRatePerHour = 0;
    }

    let predictedDailyCO2 = safeTotalCO2;
    if (isReady) {
        predictedDailyCO2 = safeTotalCO2 + effectiveRatePerHour * hoursRemainingRaw * DECAY_FACTOR;
    }
    if (!Number.isFinite(predictedDailyCO2) || predictedDailyCO2 < 0) {
        predictedDailyCO2 = safeTotalCO2;
    }

    const currentBudgetUsedPct = toPercent(safeTotalCO2, carbonBudget);
    const predictedBudgetUsedPct = toPercent(predictedDailyCO2, carbonBudget);
    const budgetStatus = isReady ? toBudgetStatus(predictedBudgetUsedPct) : "on-track";
    const confidence = deriveConfidence(isReady, assistantSamples, hoursElapsedRaw);

    const trendData = buildTrendData(startTime, now, safeTotalCO2, series, resilienceHistory);
    const futureHours = Math.floor(Math.min(hoursRemainingRaw, 12));
    for (let h = 1; h <= futureHours; h += 1) {
        const futureTime = now + h * HOUR_MS;
        const futureCO2 = isReady
            ? safeTotalCO2 + effectiveRatePerHour * h * DECAY_FACTOR
            : safeTotalCO2;
        trendData.push({
            time: futureTime,
            co2: round(futureCO2, 3),
            predicted: true,
        });
    }

    return {
        predictedDailyCO2: round(predictedDailyCO2, 3),
        currentCO2: round(safeTotalCO2, 3),
        ratePerHour: round(effectiveRatePerHour, 3),
        effectiveRatePerHour: round(effectiveRatePerHour, 3),
        hoursElapsed: round(hoursElapsedRaw, 2),
        hoursRemaining: round(hoursRemainingRaw, 2),
        budgetStatus,
        percentOfBudget: predictedBudgetUsedPct,
        currentBudgetUsedPct,
        predictedBudgetUsedPct,
        isReady,
        confidence,
        assistantSamples,
        trendData,
    };
}
