"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useACRMStore } from "@/lib/store";
import {
    AVAILABLE_MODELS,
    AVAILABLE_REGIONS,
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
    type Region,
} from "@/lib/carbon-constants";
import { computeResilienceScores } from "@/lib/resilience-engine";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from "recharts";
import { useTranslation } from "@/lib/i18n/useTranslation";

const CHART_COLORS = ["#0FA697", "#AED911", "#D9CD2B", "#F2C094", "#D91A1A", "#7C3AED", "#2563EB"];

// Helper for smart number formatting
function formatNumber(value: number): string {
    if (value === 0) return "0";
    if (value < 0.001) return value.toExponential(1);
    if (value < 0.1) return value.toFixed(4);
    if (value < 10) return value.toFixed(3);
    return value.toFixed(1);
}

function formatDuration(startMs: number): string {
    const elapsed = Date.now() - startMs;
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m ${secs}s`;
}

export default function AnalyticsPage() {
    const { t } = useTranslation();
    const messages = useACRMStore((s) => s.messages);
    const sessionStats = useACRMStore((s) => s.sessionStats);
    const carbonBudget = useACRMStore((s) => s.carbonBudget);
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const liveCarbonIntensity = useACRMStore((s) => s.liveCarbonIntensity);
    const isCILive = useACRMStore((s) => s.isCILive);
    const ciSource = useACRMStore((s) => s.ciSource);
    const ciFactorType = useACRMStore((s) => s.ciFactorType);
    const sessionStartTime = useACRMStore((s) => s.sessionStartTime);
    const resilienceHistory = useACRMStore((s) => s.resilienceHistory);

    const aiMessages = messages.filter((m) => m.role === "assistant");
    const hasData = aiMessages.length > 0;

    const trendData = aiMessages.map((m, i) => ({
        name: `#${i + 1}`,
        co2: m.metrics.co2Grams,
        energy: m.metrics.energyWh,
    }));

    const modelMap = new Map<string, { co2: number; count: number; tokens: number }>();
    for (const msg of aiMessages) {
        const prev = modelMap.get(msg.modelId) ?? { co2: 0, count: 0, tokens: 0 };
        modelMap.set(msg.modelId, {
            co2: prev.co2 + msg.metrics.co2Grams,
            count: prev.count + 1,
            tokens: prev.tokens + msg.metrics.totalTokens,
        });
    }
    const modelData = [...modelMap.entries()].map(([modelId, data]) => {
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        return {
            name: model?.name ?? modelId,
            co2: data.co2,
            tokens: data.tokens,
            count: data.count,
            avgCO2: data.count > 0 ? data.co2 / data.count : 0,
        };
    });

    let cumEnergy = 0;
    const cumulativeData = aiMessages.map((m, i) => {
        cumEnergy += m.metrics.energyWh;
        return {
            name: `#${i + 1}`,
            cumulative: cumEnergy,
        };
    });

    const resilienceTrendData = resilienceHistory.map((entry, i) => ({
        name: `#${i + 1}`,
        exposure: entry.carbonExposure,
        costShock: entry.costShockIndex,
        resilience: entry.resilienceScore,
    }));

    const topCarbon = [...aiMessages]
        .sort((a, b) => b.metrics.co2Grams - a.metrics.co2Grams)
        .slice(0, 5);

    const avgCO2 = aiMessages.length > 0 ? aiMessages.reduce((acc, m) => acc + m.metrics.co2Grams, 0) / aiMessages.length : 0;
    const avgTokens = aiMessages.length > 0 ? aiMessages.reduce((acc, m) => acc + m.metrics.totalTokens, 0) / aiMessages.length : 0;
    const peakCO2 = aiMessages.length > 0 ? Math.max(...aiMessages.map((m) => m.metrics.co2Grams)) : 0;

    const resilience = computeResilienceScores(sessionStats, messages);

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
            <Navbar />

            <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                        {t("analytics.title")}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto">
                        {t("analytics.subtitle")}
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-xs bg-gray-100 dark:bg-[#1a1d27] px-3 py-1 rounded-full text-gray-500 dark:text-gray-400">
                            {t("analytics.regionLabel")}: {AVAILABLE_REGIONS.find((r) => r.id === selectedRegion)?.label ?? selectedRegion}
                        </span>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isCILive
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-[#1a1d27] text-gray-500 dark:text-gray-400"
                            }`}>
                            CI: {isCILive && liveCarbonIntensity
                                ? `${liveCarbonIntensity} ${ciSource === "electricitymaps" ? "gCO2e/kWh" : "gCO2/kWh"} (${t("analytics.liveLabel")}${ciSource === "electricitymaps" ? `, ${ciFactorType}` : ""})`
                                : `${CARBON_INTENSITY_BY_REGION[selectedRegion as Region] ?? GLOBAL_CI_FALLBACK} gCO2/kWh`
                            }
                        </span>
                    </div>
                </div>

                {!hasData ? (
                    <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 p-12 text-center">
                        <div className="text-5xl mb-4">{t("analytics.emptyIconLabel")}</div>
                        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">{t("analytics.noDataTitle")}</h2>
                        <p className="text-gray-400 dark:text-gray-500 text-base">
                            {t("analytics.noDataMessage")}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                            <SummaryCard icon="CO2" label={t("analytics.cardTotalCO2")} value={`${formatNumber(sessionStats.totalCO2)}g`} />
                            <SummaryCard icon="E" label={t("analytics.cardTotalEnergy")} value={`${formatNumber(sessionStats.totalEnergyWh)} Wh`} />
                            <SummaryCard icon="Avg" label={t("analytics.cardAvgCO2")} value={`${formatNumber(avgCO2)}g`} />
                            <SummaryCard icon="Peak" label={t("analytics.cardPeakCO2")} value={`${formatNumber(peakCO2)}g`} />
                            <SummaryCard icon="Msg" label={t("analytics.cardAIMessages")} value={`${aiMessages.length}`} />
                            <SummaryCard icon="Tok" label={t("analytics.cardAvgTokens")} value={`${Math.round(avgTokens)}`} />
                            <SummaryCard icon="Time" label={t("analytics.cardSession")} value={sessionStartTime ? formatDuration(sessionStartTime) : "-"} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                            <ScoreCard
                                label={t("analytics.scoreCarbonExposure")}
                                score={resilience.carbonExposure}
                                status={resilience.carbonExposureLabel}
                                description={t("analytics.scoreCarbonExposureDesc")}
                                colorScale="inverted"
                            />
                            <ScoreCard
                                label={t("analytics.scoreCostShock")}
                                score={resilience.costShockIndex}
                                status={resilience.costShockLabel}
                                description={t("analytics.scoreCostShockDesc")}
                                colorScale="inverted"
                            />
                            <ScoreCard
                                label={t("analytics.scoreResilience")}
                                score={resilience.resilienceScore}
                                status={resilience.resilienceLabel}
                                description={t("analytics.scoreResilienceDesc")}
                                colorScale="normal"
                            />
                        </div>

                        {carbonBudget > 0 && (
                            <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 shadow-sm mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                        {t("analytics.carbonBudgetTitle")}
                                    </h3>
                                    <span className="text-xs text-gray-400">
                                        {sessionStats.totalCO2.toFixed(2)}g / {carbonBudget}g
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-gray-100 dark:bg-[#1a1d27] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min((sessionStats.totalCO2 / carbonBudget) * 100, 100)}%`,
                                            backgroundColor:
                                                sessionStats.totalCO2 / carbonBudget > 0.9
                                                    ? "#D91A1A"
                                                    : sessionStats.totalCO2 / carbonBudget > 0.6
                                                        ? "#D9CD2B"
                                                        : "#0FA697",
                                        }}
                                    />
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">
                                    {`${((sessionStats.totalCO2 / carbonBudget) * 100).toFixed(1)}% ${t("carbonBudget.used")}`}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ChartCard title={t("analytics.chartCO2Energy")}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} />
                                        <YAxis tick={{ fontSize: 10, fill: "#999" }} width={40} />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: "1px solid var(--border-color, #e5e7eb)",
                                                boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                            }}
                                            formatter={(value: number | undefined) => formatNumber(value ?? 0) as any}
                                        />
                                        <Line type="monotone" dataKey="co2" stroke="#0FA697" strokeWidth={2} dot={{ r: 3 }} name={t("analytics.tableHeaderCO2")} />
                                        <Line type="monotone" dataKey="energy" stroke="#AED911" strokeWidth={2} dot={{ r: 3 }} name={t("analytics.tableHeaderEnergy")} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title={t("analytics.chartCO2ByModel")}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={modelData}
                                            dataKey="co2"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            strokeWidth={2}
                                            stroke="#fff"
                                            label={false}
                                        >
                                            {modelData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: "1px solid var(--border-color, #e5e7eb)",
                                                boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                            }}
                                            formatter={(value: number | undefined) => formatNumber(value ?? 0) as any}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                    {modelData.map((d, i) => (
                                        <div key={d.name} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                            />
                                            {d.name} ({d.count})
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>

                            <ChartCard title={t("analytics.chartTokenUsage")}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={modelData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} />
                                        <YAxis tick={{ fontSize: 10, fill: "#999" }} width={50} />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: "1px solid var(--border-color, #e5e7eb)",
                                                boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                            }}
                                            formatter={(value: number | undefined) => formatNumber(value ?? 0) as any}
                                        />
                                        <Bar dataKey="tokens" radius={[6, 6, 0, 0]}>
                                            {modelData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title={t("analytics.chartCumulativeEnergy")}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={cumulativeData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} />
                                        <YAxis tick={{ fontSize: 10, fill: "#999" }} width={50} />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: 11,
                                                borderRadius: 8,
                                                border: "1px solid var(--border-color, #e5e7eb)",
                                                boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                            }}
                                            formatter={(value: number | undefined) => formatNumber(value ?? 0) as any}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="#AED911"
                                            fill="#AED911"
                                            fillOpacity={0.2}
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {resilienceTrendData.length > 1 && (
                                <div className="md:col-span-2">
                                    <ChartCard title={t("analytics.chartResilienceTrend")}>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={resilienceTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#999" }} />
                                                <YAxis tick={{ fontSize: 10, fill: "#999" }} width={40} domain={[0, 100]} />
                                                <Tooltip
                                                    contentStyle={{
                                                        fontSize: 11,
                                                        borderRadius: 8,
                                                        border: "1px solid var(--border-color, #e5e7eb)",
                                                        boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                                                        backgroundColor: "var(--background)",
                                                        color: "var(--foreground)",
                                                    }}
                                                />
                                                <Line type="monotone" dataKey="resilience" stroke="#0FA697" strokeWidth={2} dot={{ r: 3 }} name={t("analytics.resilienceLegend")} />
                                                <Line type="monotone" dataKey="exposure" stroke="#D91A1A" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name={t("analytics.exposureLegend")} />
                                                <Line type="monotone" dataKey="costShock" stroke="#D9CD2B" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name={t("analytics.costShockLegend")} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 shadow-sm">
                            <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3">
                                {t("analytics.topCarbonTitle")}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-[#2a2d3a]">
                                            <th className="text-left py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderNum")}</th>
                                            <th className="text-left py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderModel")}</th>
                                            <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderTokens")}</th>
                                            <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderCO2")}</th>
                                            <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderEnergy")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCarbon.map((m, i) => {
                                            const model = AVAILABLE_MODELS.find((md) => md.id === m.modelId);
                                            return (
                                                <tr key={m.id} className="border-b border-gray-50 dark:border-[#1e212c] hover:bg-gray-50/50 dark:hover:bg-white/5">
                                                    <td className="py-2 px-2 font-bold text-gray-500 dark:text-gray-400">{i + 1}</td>
                                                    <td className="py-2 px-2 font-semibold text-gray-700 dark:text-gray-200">{model?.name ?? m.modelId}</td>
                                                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{m.metrics.totalTokens}</td>
                                                    <td className="py-2 px-2 text-right font-bold text-[#D91A1A]">{formatNumber(m.metrics.co2Grams)}</td>
                                                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(m.metrics.energyWh)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {modelData.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 shadow-sm">
                                <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3">
                                    {t("analytics.modelStatsTitle")}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 dark:border-[#2a2d3a]">
                                                <th className="text-left py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderModel")}</th>
                                                <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderMessages")}</th>
                                                <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderTokens")}</th>
                                                <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderTotalCO2")}</th>
                                                <th className="text-right py-2 px-2 text-gray-400 dark:text-gray-500 font-semibold">{t("analytics.tableHeaderAvgCO2")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {modelData.map((d) => (
                                                <tr key={d.name} className="border-b border-gray-50 dark:border-[#1e212c] hover:bg-gray-50/50 dark:hover:bg-white/5">
                                                    <td className="py-2 px-2 font-semibold text-gray-700 dark:text-gray-200">{d.name}</td>
                                                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{d.count}</td>
                                                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{d.tokens}</td>
                                                    <td className="py-2 px-2 text-right font-bold text-[#0FA697]">{formatNumber(d.co2)}g</td>
                                                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">{formatNumber(d.avgCO2)}g</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}

function SummaryCard({
    icon,
    label,
    value,
}: {
    icon: string;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-3 shadow-sm text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</div>
            <div className="text-base font-black text-gray-700 dark:text-gray-200">{value}</div>
        </div>
    );
}

function ChartCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 shadow-sm h-full flex flex-col">
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3">{title}</h3>
            <div className="flex-1 min-h-[200px]">
                {children}
            </div>
        </div>
    );
}

function ScoreCard({
    label,
    score,
    status,
    description,
    colorScale,
}: {
    label: string;
    score: number;
    status: string;
    description: string;
    colorScale: "normal" | "inverted";
}) {
    const effective = colorScale === "inverted" ? 100 - score : score;
    const color =
        effective >= 70 ? "#0FA697" : effective >= 40 ? "#D9CD2B" : "#D91A1A";
    const bgColor =
        effective >= 70
            ? "bg-[#0FA697]/10"
            : effective >= 40
                ? "bg-[#D9CD2B]/10"
                : "bg-[#D91A1A]/10";

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {label}
                </span>
                <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgColor}`}
                    style={{ color }}
                >
                    {status}
                </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-[#1a1d27] rounded-full overflow-hidden mb-1.5">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: color }}
                />
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {description}
                </span>
                <span
                    className="text-sm font-black"
                    style={{ color }}
                >
                    {score}
                </span>
            </div>
        </div>
    );
}