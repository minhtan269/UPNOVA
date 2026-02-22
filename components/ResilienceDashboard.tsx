"use client";

import { useACRMStore } from "@/lib/store";
import { toSmartphoneCharges } from "@/lib/carbon-calc";
import { computeResilienceScores, type ResilienceScores } from "@/lib/resilience-engine";
import {
    predictDailyCarbon,
    type ForecastMessageInput,
} from "@/lib/carbon-forecast";
import { calculateGHGBreakdown, generateVerificationStatement, generateReportHash } from "@/lib/ghg-protocol";
import {
    AVAILABLE_MODELS,
    AVAILABLE_REGIONS,
    CARBON_INTENSITY_BY_REGION,
    ENERGY_COEFFICIENTS,
    GLOBAL_CI_FALLBACK,
    type Region,
} from "@/lib/carbon-constants";
import CarbonOffset from "./CarbonOffset";
import CarbonBudget from "./CarbonBudget";
import { generatePDFReport } from "@/lib/pdf-export";
import SessionHistory from "./SessionHistory";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
    PieChart,
    Pie,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LineChart,
    Line,
    Legend,
} from "recharts";
import { useState } from "react";

// ---- Stat Card ----
function StatCard({
    icon,
    label,
    value,
    unit,
    color,
}: {
    icon: string;
    label: string;
    value: string;
    unit: string;
    color: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span>{icon}</span>
                <span>{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold ${color}`}>{value}</span>
                <span className="text-xs text-gray-400">{unit}</span>
            </div>
        </div>
    );
}

// ---- Score Gauge ----
function ScoreGauge({
    label,
    score,
    levelLabel,
    invert,
    icon,
}: {
    label: string;
    score: number;
    levelLabel: string;
    invert?: boolean; // true = higher is better (resilience)
    icon: string;
}) {
    // Color logic: for exposure/cost shock, high=bad(red). For resilience, high=good(green).
    let color: string;
    let bgColor: string;

    if (invert) {
        // Resilience: high=green, low=red
        color = score >= 70 ? "#0FA697" : score >= 40 ? "#D9CD2B" : "#D91A1A";
        bgColor = score >= 70 ? "bg-[#0FA697]/10" : score >= 40 ? "bg-[#D9CD2B]/10" : "bg-[#D91A1A]/10";
    } else {
        // Exposure/shock: high=red, low=green
        color = score >= 70 ? "#D91A1A" : score >= 40 ? "#D9CD2B" : "#0FA697";
        bgColor = score >= 70 ? "bg-[#D91A1A]/10" : score >= 40 ? "bg-[#D9CD2B]/10" : "bg-[#0FA697]/10";
    }

    return (
        <div className={`rounded-xl border border-gray-100 p-3 backdrop-blur-sm shadow-sm ${bgColor}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                    <span>{icon}</span>
                    <span>{label}</span>
                </div>
                <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color, backgroundColor: `${color}20` }}
                >
                    {levelLabel}
                </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-gray-200/60 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${score}%`, backgroundColor: color }}
                />
            </div>
            <div className="text-right mt-1">
                <span className="text-lg font-bold" style={{ color }}>
                    {score}
                </span>
                <span className="text-[10px] text-gray-400 ml-0.5">/100</span>
            </div>
        </div>
    );
}

// ---- Custom Tooltip ----
function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ value: number }>;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg">
            <span className="font-semibold">{payload[0].value.toFixed(4)}</span>{" "}
            g CO2
        </div>
    );
}

// ---- Baseline Comparison ----
const BASELINE_SCENARIOS = [
    { id: "large", label: "All Large", coeff: ENERGY_COEFFICIENTS.large },
    { id: "mixed", label: "Industry Average", coeff: (ENERGY_COEFFICIENTS.small + ENERGY_COEFFICIENTS.medium + ENERGY_COEFFICIENTS.large) / 3 },
    { id: "small", label: "All Small", coeff: ENERGY_COEFFICIENTS.small },
] as const;

function BaselineComparison({
    sessionStats,
    messages,
    selectedRegion,
}: {
    sessionStats: { totalCO2: number; totalTokens: number; totalEnergyWh: number };
    messages: Array<{ metrics: { totalTokens: number; inputTokens: number; outputTokens: number }; role: string }>;
    selectedRegion: string;
}) {
    const [scenario, setScenario] = useState(0);
    const ci =
        CARBON_INTENSITY_BY_REGION[selectedRegion as Region] ?? GLOBAL_CI_FALLBACK;
    const aiMessages = messages.filter((m) => m.role === "assistant");
    const totalTokensAI = aiMessages.reduce(
        (acc, m) => acc + m.metrics.totalTokens,
        0
    );

    const s = BASELINE_SCENARIOS[scenario];
    const baselineCO2 = (totalTokensAI / 1000) * s.coeff * ci;
    const actualCO2 = sessionStats.totalCO2;
    const saved = baselineCO2 - actualCO2;
    const savedPct = baselineCO2 > 0 ? (saved / baselineCO2) * 100 : 0;

    if (aiMessages.length === 0) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">
                    Carbon Savings vs Baseline
                </h3>
                <div className="text-xs text-gray-400 text-center py-2">
                    Send messages to see savings
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-600">
                    Carbon Savings vs Baseline
                </h3>
            </div>
            {/* Scenario selector */}
            <div className="flex gap-1 mb-2">
                {BASELINE_SCENARIOS.map((sc, i) => (
                    <button
                        key={sc.id}
                        onClick={() => setScenario(i)}
                        className={`flex-1 rounded-lg py-1 text-[9px] font-semibold transition-all ${scenario === i
                            ? "bg-[#0FA697] text-white shadow-sm"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                    >
                        {sc.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-gray-100/60 p-2">
                    <div className="text-[10px] text-gray-400 mb-0.5">Baseline CO2</div>
                    <div className="text-sm font-bold text-gray-600">
                        {baselineCO2.toFixed(4)}g
                    </div>
                </div>
                <div className="rounded-lg bg-[#0FA697]/10 p-2">
                    <div className="text-[10px] text-gray-400 mb-0.5">Actual Scope 2 CO2</div>
                    <div className="text-sm font-bold text-[#0FA697]">
                        {actualCO2.toFixed(4)}g
                    </div>
                </div>
            </div>
            {saved > 0 ? (
                <div className="mt-2 rounded-lg bg-gradient-to-r from-[#0FA697]/10 to-[#AED911]/10 p-2 text-center">
                    <span className="text-sm font-bold text-[#0FA697]">
                        Saved {savedPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-gray-500 ml-1">
                        ({saved.toFixed(4)}g CO2)
                    </span>
                </div>
            ) : saved < 0 ? (
                <div className="mt-2 rounded-lg bg-[#D91A1A]/10 p-2 text-center">
                    <span className="text-xs font-bold text-[#D91A1A]">
                        {Math.abs(savedPct).toFixed(1)}% more CO2 than {s.label}
                    </span>
                </div>
            ) : (
                <div className="mt-2 rounded-lg bg-gray-100 p-2 text-center">
                    <span className="text-xs font-bold text-gray-500">
                        Same as baseline
                    </span>
                </div>
            )}
        </div>
    );
}

// ---- Per-Model Breakdown Pie Chart ----
const PIE_COLORS = ["#0FA697", "#AED911", "#D9CD2B", "#F2C094", "#D91A1A", "#7C3AED", "#2563EB"];

function ModelBreakdownChart({
    messages,
}: {
    messages: Array<{ role: string; modelId: string; metrics: { co2Grams: number; totalTokens: number } }>;
}) {
    const aiMessages = messages.filter((m) => m.role === "assistant");

    if (aiMessages.length === 0) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">
                    CO2 by Model
                </h3>
                <div className="text-xs text-gray-400 text-center py-2">
                    Send messages to see analysis
                </div>
            </div>
        );
    }

    // Aggregate by model
    const modelMap = new Map<string, { co2: number; count: number; tokens: number }>();
    for (const msg of aiMessages) {
        const prev = modelMap.get(msg.modelId) ?? { co2: 0, count: 0, tokens: 0 };
        modelMap.set(msg.modelId, {
            co2: prev.co2 + msg.metrics.co2Grams,
            count: prev.count + 1,
            tokens: prev.tokens + msg.metrics.totalTokens,
        });
    }

    const totalCO2 = [...modelMap.values()].reduce((a, v) => a + v.co2, 0);

    const pieData = [...modelMap.entries()].map(([modelId, data]) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        return {
            name: model?.name ?? modelId,
            value: parseFloat(data.co2.toFixed(4)),
            count: data.count,
            tokens: data.tokens,
            pct: totalCO2 > 0 ? ((data.co2 / totalCO2) * 100).toFixed(1) : "0",
        };
    });

    return (
        <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
            <h3 className="text-xs font-semibold text-gray-600 mb-2">
                CO2 by Model
            </h3>
            <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        strokeWidth={2}
                        stroke="#fff"
                    >
                        {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg">
                                    <div className="font-bold">{d.name}</div>
                                    <div>{d.value}g CO2, {d.count} messages, {d.tokens} tokens</div>
                                </div>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-1 space-y-1">
                {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-[10px]">
                        <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-600 flex-1 truncate">{d.name}</span>
                        <span className="text-gray-500 font-medium">{d.pct}%</span>
                        <span className="text-gray-400">{d.value}g</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---- 2.2 Forecast Card ----
function ForecastCard({
    totalCO2,
    sessionStartTime,
    carbonBudget,
    resilienceHistory,
    messages,
}: {
    totalCO2: number;
    sessionStartTime: number | null;
    carbonBudget: number;
    resilienceHistory: { timestamp: number; carbonExposure: number }[];
    messages: ForecastMessageInput[];
}) {
    const forecast = predictDailyCarbon(
        totalCO2,
        sessionStartTime,
        carbonBudget,
        resilienceHistory,
        messages
    );

    const statusConfig = {
        "on-track": { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: "OK", label: "On Track" },
        "exceeding": { bg: "bg-amber-500/15", text: "text-amber-400", icon: "WARN", label: "Exceeding" },
        "critical": { bg: "bg-red-500/15", text: "text-red-400", icon: "ALERT", label: "Critical" },
    };

    const status = forecast.isReady
        ? statusConfig[forecast.budgetStatus]
        : { bg: "bg-slate-500/15", text: "text-slate-300", icon: "...", label: "Warming up" };

    return (
        <div className="px-4 pb-3">
            <h3 className="text-xs font-semibold text-gray-600 mb-2">
                Carbon Forecast
            </h3>
            <div className="rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27] p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400">Predicted End-of-Day</span>
                    <span className={`rounded-full ${status.bg} px-2 py-0.5 text-[10px] font-semibold ${status.text}`}>
                        {status.icon} {status.label}
                    </span>
                </div>
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                    {forecast.predictedDailyCO2.toFixed(3)}
                    <span className="text-xs font-normal text-gray-400 ml-1">g CO2</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                        <span className="text-gray-400">Effective Rate</span>
                        <p className="font-semibold text-gray-600 dark:text-gray-300">
                            {forecast.effectiveRatePerHour.toFixed(3)} g/hr
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-400">Predicted EOD Used</span>
                        <p className={`font-semibold ${forecast.isReady && forecast.predictedBudgetUsedPct > 100 ? "text-red-400" : "text-gray-600 dark:text-gray-300"}`}>
                            {forecast.predictedBudgetUsedPct}%
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-400">Current Used</span>
                        <p className="font-semibold text-gray-600 dark:text-gray-300">
                            {forecast.currentBudgetUsedPct}%
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-400">Confidence</span>
                        <p className="font-semibold text-gray-600 dark:text-gray-300 capitalize">
                            {forecast.confidence} | {forecast.assistantSamples} samples
                        </p>
                    </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-[#2a2d3a] overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${!forecast.isReady
                            ? "bg-sky-400"
                            : forecast.predictedBudgetUsedPct > 100
                                ? "bg-red-400"
                                : forecast.predictedBudgetUsedPct > 80
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                            }`}
                        style={{ width: `${Math.min(forecast.predictedBudgetUsedPct, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// ---- Main Dashboard ----
export default function ResilienceDashboard() {
    const sessionStats = useACRMStore((s) => s.sessionStats);
    const messages = useACRMStore((s) => s.messages);
    const clearSession = useACRMStore((s) => s.clearSession);
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const resilienceHistory = useACRMStore((s) => s.resilienceHistory);
    const sessionStartTime = useACRMStore((s) => s.sessionStartTime);
    const carbonBudget = useACRMStore((s) => s.carbonBudget);

    const smartphoneCharges = toSmartphoneCharges(sessionStats.totalEnergyWh);
    const resilience: ResilienceScores = computeResilienceScores(
        sessionStats,
        messages
    );

    // Get current region info
    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === selectedRegion);
    const regionCI = regionInfo?.ci ?? GLOBAL_CI_FALLBACK;
    const ghgSummary = calculateGHGBreakdown(
        sessionStats.totalEnergyWh,
        regionCI,
        messages.map((m) => ({
            role: m.role,
            modelId: m.modelId,
            metrics: { totalTokens: m.metrics.totalTokens },
        }))
    );
    const exportTemporarilyDisabled = true;
    const exportDisabled = exportTemporarilyDisabled || messages.length === 0;

    // Build chart data - CO2 per message (AI messages only)
    const chartData = messages
        .filter((m) => m.metrics.showCarbon)
        .map((m, i) => ({
            name: `#${i + 1}`,
            co2: parseFloat(m.metrics.co2Grams.toFixed(4)),
            level: m.metrics.level,
        }));

    return (
        <div className="flex h-full flex-col overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="border-b border-gray-200/60 px-5 py-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0FA697] to-[#AED911]">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800">Resilience Dashboard</h2>
                        <p className="text-[10px] text-gray-400">
                            {regionInfo ? `${regionInfo.flag} ${regionInfo.label} - ${regionInfo.ci} gCO2/kWh` : "Real-time carbon monitoring"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 p-4">
                <StatCard
                    icon="CO2"
                    label="Scope 2 CO2"
                    value={sessionStats.totalCO2 < 0.01 ? sessionStats.totalCO2.toExponential(2) : sessionStats.totalCO2.toFixed(4)}
                    unit="grams"
                    color="text-[#0FA697]"
                />
                <StatCard
                    icon="E"
                    label="Energy Used"
                    value={sessionStats.totalEnergyWh < 0.01 ? sessionStats.totalEnergyWh.toExponential(2) : sessionStats.totalEnergyWh.toFixed(4)}
                    unit="Wh"
                    color="text-[#D9CD2B]"
                />
                <StatCard
                    icon="TOK"
                    label="Total Tokens"
                    value={sessionStats.totalTokens.toLocaleString()}
                    unit="tokens"
                    color="text-gray-700"
                />
                <StatCard
                    icon="EQ"
                    label="Equivalent To"
                    value={smartphoneCharges < 0.0001 ? smartphoneCharges.toExponential(2) : smartphoneCharges.toFixed(4)}
                    unit="charges"
                    color="text-[#AED911]"
                />
            </div>
            <div className="px-4 pb-2 text-[11px] text-gray-500">
                Total GHG (Scope2 + Scope3 estimated):{" "}
                <span className="font-semibold text-gray-700">{ghgSummary.totalGHG.toFixed(4)} g</span>
            </div>

            {/* ---- Carbon Budget ---- */}
            <div className="px-4 pb-3">
                <CarbonBudget />
            </div>

            {/* ---- 2.2 Predictive Carbon Forecast ---- */}
            {sessionStats.messageCount > 0 && (
                <ForecastCard
                    totalCO2={sessionStats.totalCO2}
                    sessionStartTime={sessionStartTime}
                    carbonBudget={carbonBudget}
                    resilienceHistory={resilienceHistory}
                    messages={messages}
                />
            )}

            {/* ---- Phase 4: Resilience Scores ---- */}
            <div className="px-4 pb-3">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">
                    Resilience Indexes (Layer 4)
                </h3>
                {/* Radar Chart */}
                <div className="mb-3">
                    <ResponsiveContainer width="100%" height={170}>
                        <RadarChart data={[
                            { subject: "Carbon Exp.", value: resilience.carbonExposure, fullMark: 100 },
                            { subject: "Cost Shock", value: resilience.costShockIndex, fullMark: 100 },
                            { subject: "Resilience", value: resilience.resilienceScore, fullMark: 100 },
                        ]}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#666" }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                            <Radar
                                name="Scores"
                                dataKey="value"
                                stroke="#0FA697"
                                fill="#0FA697"
                                fillOpacity={0.25}
                                strokeWidth={2}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                    <ScoreGauge
                        icon="EXP"
                        label="Carbon Exposure"
                        score={resilience.carbonExposure}
                        levelLabel={resilience.carbonExposureLabel}
                    />
                    <ScoreGauge
                        icon="COST"
                        label="Cost Shock"
                        score={resilience.costShockIndex}
                        levelLabel={resilience.costShockLabel}
                    />
                    <ScoreGauge
                        icon="RES"
                        label="Resilience Score"
                        score={resilience.resilienceScore}
                        levelLabel={resilience.resilienceLabel}
                        invert
                    />
                </div>

                {/* Resilience Trend Line */}
                {resilienceHistory.length > 1 && (
                    <div className="mt-3">
                        <h4 className="text-[10px] font-semibold text-gray-500 mb-1">
                            Score Trend
                        </h4>
                        <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={resilienceHistory.map((h, i) => ({
                                name: `#${i + 1}`,
                                exposure: h.carbonExposure,
                                shock: h.costShockIndex,
                                resilience: h.resilienceScore,
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#999" }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#999" }} width={25} />
                                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }} />
                                <Line type="monotone" dataKey="exposure" stroke="#D91A1A" strokeWidth={1.5} dot={{ r: 2 }} name="Exposure" />
                                <Line type="monotone" dataKey="shock" stroke="#D9CD2B" strokeWidth={1.5} dot={{ r: 2 }} name="Cost Shock" />
                                <Line type="monotone" dataKey="resilience" stroke="#0FA697" strokeWidth={2} dot={{ r: 2 }} name="Resilience" />
                                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ---- Phase 5: Baseline Comparison ---- */}
            <div className="px-4 pb-3">
                <BaselineComparison
                    sessionStats={sessionStats}
                    messages={messages}
                    selectedRegion={selectedRegion}
                />
            </div>

            {/* Carbon per Message Chart */}
            <div className="px-4 pb-3">
                <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-3 text-xs font-semibold text-gray-600">
                        CO2 per Message (g)
                    </h3>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={chartData} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: "#999" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#999" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="co2" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={
                                                entry.level === "low"
                                                    ? "#0FA697"
                                                    : entry.level === "medium"
                                                        ? "#D9CD2B"
                                                        : "#D91A1A"
                                            }
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[150px] items-center justify-center text-xs text-gray-400">
                            Send messages to see carbon data
                        </div>
                    )}
                </div>
            </div>

            {/* ---- Per-Model CO2 Breakdown (Pie Chart) ---- */}
            <div className="px-4 pb-3">
                <ModelBreakdownChart messages={messages} />
            </div>

            {/* ---- Carbon Offset Calculator ---- */}
            <div className="px-4 pb-3">
                <CarbonOffset />
            </div>

            {/* Carbon Level Legend */}
            <div className="px-4 pb-3">
                <div className="rounded-xl border border-gray-100 bg-white/60 p-3 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-2 text-xs font-semibold text-gray-600">
                        Carbon Levels
                    </h3>
                    <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#0FA697]" />
                            <span className="text-gray-600">Low Impact: &lt; 0.5g CO2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#D9CD2B]" />
                            <span className="text-gray-600">Medium Impact: 0.5 - 2g CO2</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#D91A1A]" />
                            <span className="text-gray-600">High Impact: &gt; 2g CO2</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Session History ---- */}
            <div className="px-4 pb-3">
                <SessionHistory />
            </div>

            {/* ---- Phase 5: Export ESG Report ---- */}
            <div className="px-4 pb-3">
                <button
                    id="export-esg"
                    onClick={() => {
                        const report = generateESGReport(sessionStats, messages, resilience, selectedRegion);
                        const blob = new Blob([report], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `ACRM_ESG_Report_${new Date().toISOString().split("T")[0]}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className={`w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition-all ${
                        exportDisabled
                            ? "bg-gray-400 cursor-not-allowed opacity-70"
                            : "bg-gradient-to-r from-[#0FA697] to-[#AED911] hover:shadow-lg hover:scale-[1.02]"
                    }`}
                    disabled={exportDisabled}
                    title={exportTemporarilyDisabled ? "Temporarily disabled" : undefined}
                >
                    Export ESG Report
                </button>
                <button
                    onClick={async () => {
                        const carbonBudget = useACRMStore.getState().carbonBudget;
                        await generatePDFReport({
                            sessionStats,
                            messages: messages as Parameters<typeof generatePDFReport>[0]["messages"],
                            selectedRegion,
                            carbonBudget,
                            resilience,
                        });
                    }}
                    className={`w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition-all mt-2 ${
                        exportDisabled
                            ? "bg-gray-400 cursor-not-allowed opacity-70"
                            : "bg-gradient-to-r from-[#7C3AED] to-[#2563EB] hover:shadow-lg hover:scale-[1.02]"
                    }`}
                    disabled={exportDisabled}
                    title={exportTemporarilyDisabled ? "Temporarily disabled" : undefined}
                >
                    Export PDF Report
                </button>
            </div>

            {/* Clear Session */}
            <div className="mt-auto border-t border-gray-200/60 p-4">
                <button
                    id="clear-session"
                    onClick={clearSession}
                    className="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 text-xs font-medium 
                     text-gray-500 transition-all hover:border-[#D91A1A]/30 hover:text-[#D91A1A] 
                     hover:bg-[#D91A1A]/5"
                >
                    Clear Session
                </button>
            </div>
        </div>
    );
}

// ---- ESG Report Generator (GHG Protocol Upgrade 4.1) ----
function generateESGReport(
    stats: { totalCO2: number; totalEnergyWh: number; totalTokens: number; messageCount: number },
    messages: Array<{ role: string; modelId: string; metrics: { co2Grams: number; totalTokens: number; inputTokens: number; outputTokens: number } }>,
    resilience: ResilienceScores,
    region: string
): string {
    const regionInfo = AVAILABLE_REGIONS.find((r) => r.id === region);
    const aiMessages = messages.filter((m) => m.role === "assistant");
    const totalTokensAI = aiMessages.reduce((a, m) => a + m.metrics.totalTokens, 0);
    const ci = regionInfo?.ci ?? GLOBAL_CI_FALLBACK;
    const baselineCO2 = (totalTokensAI / 1000) * ENERGY_COEFFICIENTS.large * ci;
    const saved = baselineCO2 - stats.totalCO2;
    const savedPct = baselineCO2 > 0 ? ((saved / baselineCO2) * 100).toFixed(1) : "0";

    const ghg = calculateGHGBreakdown(stats.totalEnergyWh, ci, messages as never[]);
    const verification = generateVerificationStatement(region);
    const reportHash = generateReportHash({
        totalCO2: stats.totalCO2,
        totalTokens: stats.totalTokens,
        messageCount: stats.messageCount,
        timestamp: new Date().toISOString(),
    });

    return `# ACRM - ESG Carbon Report (GHG Protocol)
Report ID: ${reportHash}
Generated: ${new Date().toISOString()}
Standard: ${verification.standard}

## 1. Reporting Boundaries
${verification.boundaries}

## 2. Region and Grid Information
${regionInfo ? `${regionInfo.flag} ${regionInfo.label} - ${regionInfo.ci} gCO2/kWh` : `Global Average - ${GLOBAL_CI_FALLBACK} gCO2/kWh`}

## 3. Session Summary
| Metric | Value |
|---|---|
| Total Messages | ${stats.messageCount} |
| Total Tokens | ${stats.totalTokens.toLocaleString()} |
| Total Energy | ${stats.totalEnergyWh.toFixed(4)} Wh |
| Total CO2 (Scope 2 operational) | ${stats.totalCO2.toFixed(4)} g |
| Total GHG (Scope2 + Scope3 estimated) | ${ghg.totalGHG.toFixed(4)} g |
| Smartphone Charge Equiv. | ${(stats.totalEnergyWh / 5).toFixed(4)} charges |

## 4. GHG Protocol Emissions Breakdown

### Scope 2 - Operational (Purchased Electricity)
> ${ghg.scope2.description}

| Component | Value |
|---|---|
| Energy Consumed | ${stats.totalEnergyWh.toFixed(4)} Wh |
| Grid Carbon Intensity | ${ci} gCO2/kWh |
| Scope 2 Total | ${ghg.scope2.total.toFixed(4)} g CO2 |
| Methodology | ${ghg.scope2.methodology} |

### Scope 3 - Estimated Value Chain Emissions
> ${ghg.scope3.description}

| Component | Value |
|---|---|
| Amortized Training | ${ghg.scope3.training.toFixed(4)} g CO2 |
| Infrastructure Overhead (PUE 1.15) | ${ghg.scope3.infrastructure.toFixed(4)} g CO2 |
| Scope 3 Total | ${ghg.scope3.total.toFixed(4)} g CO2 |
| Methodology | ${ghg.scope3.methodology} |

### Total GHG Emissions
| Scope | Emissions (g CO2) | Share |
|---|---|---|
| Scope 2 | ${ghg.scope2.total.toFixed(4)} | ${ghg.scope2Percent}% |
| Scope 3 | ${ghg.scope3.total.toFixed(4)} | ${ghg.scope3Percent}% |
| Total | ${ghg.totalGHG.toFixed(4)} | 100% |

## 5. Resilience Indexes
| Index | Score | Level |
|---|---|---|
| AI Carbon Exposure | ${resilience.carbonExposure}/100 | ${resilience.carbonExposureLabel} |
| AI Cost Shock | ${resilience.costShockIndex}/100 | ${resilience.costShockLabel} |
| AI Resilience Score | ${resilience.resilienceScore}/100 | ${resilience.resilienceLabel} |

## 6. Carbon Reduction (vs Baseline)
- Baseline CO2 (all large-class fallback): ${baselineCO2.toFixed(4)} g
- Actual Scope 2 CO2: ${stats.totalCO2.toFixed(4)} g
- Carbon Saved: ${saved.toFixed(4)} g (${savedPct}% reduction)

## 7. Model Usage Breakdown
${[...new Set(aiMessages.map((m) => m.modelId))]
        .map((id) => {
            const count = aiMessages.filter((m) => m.modelId === id).length;
            const co2 = aiMessages.filter((m) => m.modelId === id).reduce((a, m) => a + m.metrics.co2Grams, 0);
            return `- **${id}**: ${count} messages, ${co2.toFixed(4)} g CO2`;
        })
        .join("\n")}

## 8. Verification Methodology
${verification.methodology}

### Data Sources
${verification.dataSources.map((s) => `- ${s}`).join("\n")}

### Limitations and Uncertainty Assessment
${verification.limitations.map((l) => `- ${l}`).join("\n")}

Confidence Level: ${verification.confidence.toUpperCase()}

---
Report ID: ${reportHash}
Generated by ACRM - AI Carbon-Resilience Management Platform
Aligned with GHG Protocol Corporate Standard and ISO 14064-1:2018
`;
}



