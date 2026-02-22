"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
    AVAILABLE_MODELS,
    AVAILABLE_REGIONS,
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
    type Region,
} from "@/lib/carbon-constants";
import { computeMetricsV2 } from "@/lib/carbon-calc";
import { generateMockResponse } from "@/lib/mock-llm";
import { useACRMStore } from "@/lib/store";
import AIResponseRenderer from "@/components/markdown/AIResponseRenderer";
import { deriveResponsePolicy } from "@/lib/gemini-api";
import { callAIGenerate } from "@/lib/ai-api-client";

// Helper for smart number formatting
function formatNumber(value: number): string {
    if (value === 0) return "0";
    if (value < 0.001) return value.toExponential(1);
    if (value < 0.1) return value.toFixed(4);
    if (value < 10) return value.toFixed(3);
    return value.toFixed(1);
}

interface ComparisonResult {
    modelId: string;
    modelName: string;
    badge: string;
    provider: string;
    response: string;
    co2Grams: number;
    energyWh: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    visibleOutputTokens: number;
    reasoningTokens: number;
    billedOutputTokens: number;
    confidence: string;
}

export default function ComparePage() {
    const [prompt, setPrompt] = useState("");
    // Fix #1: Default selection to include at least one real model
    const [selectedModels, setSelectedModels] = useState<string[]>(["gemini-flash", "gpt-4-turbo"]);
    const [results, setResults] = useState<ComparisonResult[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    // Fix #4: Track pending models for skeleton UI
    const [pendingModels, setPendingModels] = useState<string[]>([]);

    // Fix #2: Get setRegion from store
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const setRegion = useACRMStore((s) => s.setRegion);
    const liveCarbonIntensity = useACRMStore((s) => s.liveCarbonIntensity);
    const isCILive = useACRMStore((s) => s.isCILive);
    const ciFactorType = useACRMStore((s) => s.ciFactorType);
    const fetchLiveCarbonData = useACRMStore((s) => s.fetchLiveCarbonData);

    useEffect(() => {
        fetchLiveCarbonData();
    }, [selectedRegion, fetchLiveCarbonData]);

    const toggleModel = (modelId: string) => {
        if (selectedModels.includes(modelId)) {
            if (selectedModels.length <= 1) return; // at least 1
            setSelectedModels(selectedModels.filter((m) => m !== modelId));
        } else {
            if (selectedModels.length >= 3) return; // max 3
            setSelectedModels([...selectedModels, modelId]);
        }
    };

    const runComparison = async () => {
        if (!prompt.trim() || selectedModels.length === 0) return;
        setIsComparing(true);
        setResults([]);
        setPendingModels([...selectedModels]);

        try {
            const ci = (isCILive && liveCarbonIntensity !== null)
                ? liveCarbonIntensity
                : (CARBON_INTENSITY_BY_REGION[selectedRegion as Region] ?? GLOBAL_CI_FALLBACK);
            const responsePolicy = deriveResponsePolicy(prompt);

            // Process models in parallel but update UI as each completes
            const promises = selectedModels.map(async (modelId) => {
                const model = AVAILABLE_MODELS.find((m) => m.id === modelId)!;

                let responseText: string;
                let inputTk: number;
                let outputTk: number;
                let visibleOutputTk: number;
                let reasoningTk: number;
                let tokenSource: "api" | "heuristic" = "heuristic";

                if (model.apiModelId) {
                    try {
                        const apiResult = await callAIGenerate({
                            prompt,
                            apiModelId: model.apiModelId,
                            history: [],
                            responseProfile: responsePolicy,
                        });
                        responseText = apiResult.text;
                        inputTk = apiResult.inputTokens;
                        outputTk = apiResult.chargedOutputTokens;
                        visibleOutputTk = apiResult.visibleOutputTokens;
                        reasoningTk = apiResult.reasoningTokens;
                        tokenSource = "api";
                    } catch {
                        const llmResult = generateMockResponse(prompt, modelId);
                        responseText = llmResult.text;
                        inputTk = llmResult.inputTokens;
                        outputTk = llmResult.outputTokens;
                        visibleOutputTk = llmResult.outputTokens;
                        reasoningTk = 0;
                        tokenSource = "heuristic";
                    }
                } else {
                    const llmResult = generateMockResponse(prompt, modelId);
                    responseText = llmResult.text;
                    inputTk = llmResult.inputTokens;
                    outputTk = llmResult.outputTokens;
                    visibleOutputTk = llmResult.outputTokens;
                    reasoningTk = 0;
                    tokenSource = "heuristic";
                }

                const metrics = computeMetricsV2(inputTk, outputTk, modelId, ci, {
                    tokenSource,
                    ciSource: isCILive && liveCarbonIntensity !== null ? "live" : "static",
                    ciFactorType,
                    assumptions: ["Compare mode uses single-turn prompt per model."],
                });

                const result: ComparisonResult = {
                    modelId,
                    modelName: model.name,
                    badge: model.badge,
                    provider: model.provider,
                    response: responseText,
                    co2Grams: metrics.co2Grams,
                    energyWh: metrics.energyWh,
                    totalTokens: metrics.totalTokens,
                    inputTokens: metrics.inputTokens,
                    outputTokens: metrics.outputTokens,
                    visibleOutputTokens: visibleOutputTk,
                    reasoningTokens: reasoningTk,
                    billedOutputTokens: outputTk,
                    confidence: metrics.meta?.confidence ?? "low",
                };

                // Update results incrementally
                setResults((prev) => [...prev, result]);
                setPendingModels((prev) => prev.filter((id) => id !== modelId));

                return result;
            });

            await Promise.all(promises);
        } catch (error) {
            console.error("Comparison error:", error);
        } finally {
            setIsComparing(false);
        }
    };

    const bestModel = results.length > 0
        ? results.reduce((a, b) => (a.co2Grams < b.co2Grams ? a : b))
        : null;
    const worstModel = results.length > 0
        ? results.reduce((a, b) => (a.co2Grams > b.co2Grams ? a : b))
        : null;

    const savingPct =
        bestModel && worstModel && worstModel.co2Grams > 0
            ? ((worstModel.co2Grams - bestModel.co2Grams) / worstModel.co2Grams * 100)
            : 0;

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
            <Navbar />

            <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                        Compare Models
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base max-w-xl mx-auto">
                        Send the same prompt to 2-3 models, compare response, tokens, CO2, and energy side-by-side.
                    </p>
                </div>

                {/* Model Selection */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 mb-4 shadow-sm">
                    <h2 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3">
                        Select models (max 3)
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_MODELS.map((model) => {
                            const selected = selectedModels.includes(model.id);
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => toggleModel(model.id)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all border ${selected
                                        ? "border-[#0FA697] bg-[#0FA697]/10 text-[#0FA697] shadow-sm"
                                        : "border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                        }`}
                                >
                                    {model.name}
                                    <span className="ml-1 text-[10px] opacity-60">{model.badge}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 mb-6 shadow-sm">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter prompt to compare models..."
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-4 py-3 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:border-[#0FA697] focus:outline-none resize-none"
                    />
                    <div className="flex justify-between items-center mt-3">
                        {/* Fix #2: Region Selector UI */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                                {selectedModels.length} models selected
                            </span>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setRegion(e.target.value)}
                                className="rounded-lg border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-[#0FA697] focus:outline-none"
                            >
                                {AVAILABLE_REGIONS.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.flag} {r.label} ({r.ci} g)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={runComparison}
                            disabled={!prompt.trim() || isComparing}
                            className="rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isComparing ? "Comparing..." : "Compare Now"}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {(results.length > 0 || pendingModels.length > 0) && (
                    <>
                        {/* Summary bar */}
                        {bestModel && worstModel && results.length > 1 && !isComparing && (
                            <div className="rounded-xl bg-gradient-to-r from-[#0FA697]/10 to-[#AED911]/10 border border-[#0FA697]/20 p-4 mb-4 text-center">
                                <span className="text-sm font-bold text-[#0FA697]">
                                    {bestModel.modelName} saves {savingPct.toFixed(1)}% CO2 vs {worstModel.modelName}
                                </span>
                            </div>
                        )}

                        {/* Fix #6: Visual Comparison Bars */}
                        {results.length > 1 && (() => {
                            const maxCO2 = Math.max(...results.map((r) => r.co2Grams));
                            const maxEnergy = Math.max(...results.map((r) => r.energyWh));
                            return (
                                <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm p-4 mb-4 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Visual Comparison</h3>
                                    <div className="space-y-4">
                                        {/* CO2 bars */}
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">CO2 (g)</div>
                                            {results.map((r) => (
                                                <div key={r.modelId} className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-gray-500 w-24 truncate">{r.modelName}</span>
                                                    <div className="flex-1 h-5 bg-gray-100 dark:bg-[#1a1d27] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${r.modelId === bestModel?.modelId
                                                                ? "bg-[#0FA697]"
                                                                : "bg-[#D9CD2B]"
                                                                }`}
                                                            style={{ width: `${maxCO2 > 0 ? (r.co2Grams / maxCO2) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-500 w-20 text-right">
                                                        {formatNumber(r.co2Grams)}g
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Energy bars */}
                                        <div>
                                            <div className="text-xs text-gray-400 mb-1">Energy (Wh)</div>
                                            {results.map((r) => (
                                                <div key={r.modelId} className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-gray-500 w-24 truncate">{r.modelName}</span>
                                                    <div className="flex-1 h-5 bg-gray-100 dark:bg-[#1a1d27] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${r.modelId === bestModel?.modelId
                                                                ? "bg-[#0FA697]"
                                                                : "bg-[#F2C094]"
                                                                }`}
                                                            style={{ width: `${maxEnergy > 0 ? (r.energyWh / maxEnergy) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-500 w-20 text-right">
                                                        {formatNumber(r.energyWh)}Wh
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Comparison Grid */}
                        <div className={`grid gap-4 ${selectedModels.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
                            }`}>
                            {results.map((r) => {
                                const isBest = r.modelId === bestModel?.modelId;
                                return (
                                    <div
                                        key={r.modelId}
                                        className={`rounded-2xl border p-4 backdrop-blur-sm shadow-sm transition-all ${isBest
                                            ? "border-[#0FA697]/40 bg-[#0FA697]/5 ring-2 ring-[#0FA697]/20"
                                            : "border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60"
                                            }`}
                                    >
                                        {/* Model header - Fix #5: Badges */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                                        {r.modelName}
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    {r.provider} - {r.badge}
                                                </span>
                                            </div>
                                            {isBest && results.length > 1 && (
                                                <span className="text-[10px] font-bold text-[#0FA697] bg-[#0FA697]/10 px-2 py-0.5 rounded-full">
                                                    Eco Best
                                                </span>
                                            )}
                                        </div>

                                        {/* Stats - Fix #8 & #9 */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2 text-center">
                                                <div className="text-xs text-gray-400 dark:text-gray-500">CO2</div>
                                                <div className="text-sm font-black text-gray-700 dark:text-gray-200">
                                                    {formatNumber(r.co2Grams)}g
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2 text-center">
                                                <div className="text-xs text-gray-400 dark:text-gray-500">Energy</div>
                                                <div className="text-sm font-black text-gray-700 dark:text-gray-200">
                                                    {formatNumber(r.energyWh)} Wh
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2 text-center">
                                                <div className="text-xs text-gray-400 dark:text-gray-500">Input</div>
                                                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {r.inputTokens}
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2 text-center">
                                                <div className="text-xs text-gray-400 dark:text-gray-500">Output (Billed)</div>
                                                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {r.billedOutputTokens}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">
                                            Visible: {r.visibleOutputTokens} | Thinking: {r.reasoningTokens} | Total billed: {r.billedOutputTokens} | Confidence: {r.confidence}
                                        </div>

                                        <div className="rounded-lg bg-gray-50/80 dark:bg-[#1a1d27]/80 p-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                            <AIResponseRenderer content={r.response} variant="compare" />
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Fix #4: Skeleton cards for pending models */}
                            {pendingModels.map((modelId) => {
                                return (
                                    <div
                                        key={modelId}
                                        className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 p-4 backdrop-blur-sm shadow-sm animate-pulse"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-4 w-24 bg-gray-200 dark:bg-[#2a2d3a] rounded" />
                                            <div className="h-3 w-12 bg-gray-100 dark:bg-[#2a2d3a] rounded" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2">
                                                    <div className="h-3 w-8 bg-gray-200 dark:bg-[#2a2d3a] rounded mx-auto mb-1" />
                                                    <div className="h-4 w-16 bg-gray-200 dark:bg-[#2a2d3a] rounded mx-auto" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="rounded-lg bg-gray-50/80 dark:bg-[#1a1d27]/80 p-3 space-y-2">
                                            <div className="h-3 w-full bg-gray-200 dark:bg-[#2a2d3a] rounded" />
                                            <div className="h-3 w-4/5 bg-gray-200 dark:bg-[#2a2d3a] rounded" />
                                            <div className="h-3 w-3/5 bg-gray-200 dark:bg-[#2a2d3a] rounded" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}



