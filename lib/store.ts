import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import {
    computeMetricsV2,
    computeUserMetrics,
    type CarbonMetrics,
    type CarbonCIFactorType,
    type CarbonCISource,
    type CarbonTokenSource,
} from "./carbon-calc";
import { generateMockResponse } from "./mock-llm";
import { routePrompt, type RoutingResult } from "./model-router";
import {
    AVAILABLE_MODELS,
    CARBON_INTENSITY_BY_REGION,
    GLOBAL_CI_FALLBACK,
} from "./carbon-constants";
import { computeResilienceScores } from "./resilience-engine";
import {
    countWords,
    deriveResponsePolicy,
    type ChatTurnContext,
} from "./gemini-api";
import { callAIGenerate } from "./ai-api-client";
import { fetchLiveCI, fetchGreenHours, type CISource } from "./carbon-intensity-api";
import {
    DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
    type AdvisorDraftResult,
    type AdvisorQAEntry,
    type AdvisorSupplementalInput,
} from "./advisor-types";
import {
    buildAdvisorSnapshot,
    getAdvisorLanguageModeFromText,
    normalizeAdvisorSupplementalInput,
} from "./advisor-data";
import {
    askAdvisorQuestion,
    generateAdvisorDraft as generateAdvisorDraftContent,
} from "./advisor-service";

// ---- Types ----

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    modelId: string;
    metrics: CarbonMetrics;
    timestamp: number;
}

export interface SessionStats {
    totalCO2: number;
    totalEnergyWh: number;
    totalTokens: number;
    messageCount: number;
}

export interface ResilienceHistoryEntry {
    timestamp: number;
    carbonExposure: number;
    costShockIndex: number;
    resilienceScore: number;
}

interface ACRMState {
    // Session management
    sessionId: string | null;
    sessionLabel: string;

    messages: ChatMessage[];
    selectedModelId: string;
    sessionStats: SessionStats;
    isGenerating: boolean;
    recommendation: string | null;

    // Phase 2 â€” region
    selectedRegion: string;

    // Phase 3 â€” duplicate detection
    promptHistory: string[];
    duplicateWarning: string | null;

    // Carbon Budget
    carbonBudget: number; // grams COâ‚‚
    budgetWarningShown: boolean;

    // Resilience trend history
    resilienceHistory: ResilienceHistoryEntry[];

    // Live Carbon Intensity (Phase 2.1)
    liveCarbonIntensity: number | null;
    isCILive: boolean;
    ciIndex: string | null;
    ciLastUpdated: string | null;
    ciSource: CISource | null;
    ciFactorType: CarbonCIFactorType;
    ciZoneLabel: string | null;
    ciIsRepresentativeZone: boolean;
    greenHours: import("./carbon-intensity-api").GreenHoursData | null;

    // 2.1 Auto Model Routing
    routingSuggestion: RoutingResult | null;
    lastPromptForRouting: string | null;

    // 2.2 Predictive Carbon Forecasting
    sessionStartTime: number | null;

    // 2.3 Carbon-Aware Scheduling
    scheduledTasks: ScheduledTask[];

    // Advisor (ESG/MRV support)
    advisorSupplementalInput: AdvisorSupplementalInput;
    advisorDraft: AdvisorDraftResult | null;
    advisorQAHistory: AdvisorQAEntry[];
    advisorIsGeneratingDraft: boolean;
    advisorIsAsking: boolean;
    advisorError: string | null;

    // Actions
    setSessionId: (id: string) => void;
    setSessionLabel: (label: string) => void;
    setModel: (id: string) => void;
    setRegion: (region: string) => void;
    setCarbonBudget: (grams: number) => void;
    sendMessage: (prompt: string) => void;
    clearSession: () => void;
    dismissRecommendation: () => void;
    dismissDuplicateWarning: () => void;
    fetchLiveCarbonData: () => Promise<void>;
    // 2.1
    switchToSuggested: () => void;
    dismissRouting: () => void;
    // 2.3
    scheduleMessage: (prompt: string) => void;
    cancelScheduled: (id: string) => void;
    runScheduledNow: (id: string) => void;
    // Advisor
    setAdvisorInput: (patch: Partial<AdvisorSupplementalInput>) => void;
    generateAdvisorDraft: () => Promise<void>;
    askAdvisor: (question: string) => Promise<void>;
    clearAdvisor: () => void;
}

export interface ScheduledTask {
    id: string;
    prompt: string;
    modelId: string;
    scheduledFor: string;
    status: "queued" | "running" | "completed" | "cancelled";
    estimatedSaving: number;
    createdAt: number;
}

let msgCounter = 0;
function nextId(): string {
    msgCounter += 1;
    return `msg-${Date.now()}-${msgCounter}`;
}

// getModelClass no longer needed â€” computeMetricsV2 looks up model internally

/** Simple similarity check: normalised Jaccard on word sets */
function isSimilar(a: string, b: string, threshold = 0.6): boolean {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 && intersection / union >= threshold;
}

function inferSessionStartFromMessages(messages: unknown): number | null {
    if (!Array.isArray(messages)) return null;

    const timestamps = messages
        .map((msg) => {
            if (!msg || typeof msg !== "object" || !("timestamp" in msg)) return null;
            const timestamp = (msg as { timestamp?: unknown }).timestamp;
            if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
            return timestamp;
        })
        .filter((ts): ts is number => ts !== null);

    if (timestamps.length === 0) return null;
    return Math.min(...timestamps);
}

function normalizePersistedMessages(messages: unknown): ChatMessage[] {
    if (!Array.isArray(messages)) return [];

    return messages
        .filter((msg): msg is Record<string, unknown> => !!msg && typeof msg === "object")
        .map((msg) => {
            const rawMetrics = (msg.metrics && typeof msg.metrics === "object")
                ? (msg.metrics as Partial<CarbonMetrics>)
                : {};
            const safeCO2 = typeof rawMetrics.co2Grams === "number" && Number.isFinite(rawMetrics.co2Grams)
                ? Math.max(0, rawMetrics.co2Grams)
                : 0;
            const scope2Grams = typeof rawMetrics.scope2Grams === "number" && Number.isFinite(rawMetrics.scope2Grams)
                ? Math.max(0, rawMetrics.scope2Grams)
                : safeCO2;
            const scope3Grams = typeof rawMetrics.scope3Grams === "number" && Number.isFinite(rawMetrics.scope3Grams)
                ? Math.max(0, rawMetrics.scope3Grams)
                : 0;
            const tokenSource: CarbonTokenSource =
                rawMetrics.meta?.tokenSource === "api" ? "api" : "heuristic";
            const ciSource: CarbonCISource =
                rawMetrics.meta?.ciSource === "live" ? "live" : "static";
            const ciFactorType: CarbonCIFactorType =
                rawMetrics.meta?.ciFactorType ?? "unknown";

            const normalizedMetrics: CarbonMetrics = {
                totalTokens: rawMetrics.totalTokens ?? 0,
                inputTokens: rawMetrics.inputTokens ?? 0,
                outputTokens: rawMetrics.outputTokens ?? 0,
                visibleOutputTokens: rawMetrics.visibleOutputTokens ?? rawMetrics.outputTokens ?? 0,
                reasoningTokens: rawMetrics.reasoningTokens ?? 0,
                billedOutputTokens: rawMetrics.billedOutputTokens ?? rawMetrics.outputTokens ?? 0,
                energyKwh: rawMetrics.energyKwh ?? 0,
                energyWh: rawMetrics.energyWh ?? 0,
                co2Grams: safeCO2,
                scope2Grams,
                scope3Grams,
                meta: rawMetrics.meta ?? {
                    method: "v1-class-fallback",
                    tokenSource,
                    ciSource,
                    ciFactorType,
                    confidence: "low",
                    assumptions: ["Migrated from legacy session without carbon metadata."],
                },
                level: rawMetrics.level ?? "low",
                showCarbon: rawMetrics.showCarbon ?? false,
            };

            return {
                id: typeof msg.id === "string" ? msg.id : nextId(),
                role: msg.role === "assistant" ? "assistant" : "user",
                content: typeof msg.content === "string" ? msg.content : "",
                modelId: typeof msg.modelId === "string" ? msg.modelId : "gemini-flash",
                metrics: normalizedMetrics,
                timestamp:
                    typeof msg.timestamp === "number" && Number.isFinite(msg.timestamp)
                        ? msg.timestamp
                        : Date.now(),
            } satisfies ChatMessage;
        });
}

function normalizeAdvisorQAHistory(history: unknown): AdvisorQAEntry[] {
    if (!Array.isArray(history)) return [];

    return history
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
        .map((entry) => ({
            id: typeof entry.id === "string"
                ? entry.id
                : `advisor-qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: entry.role === "assistant" ? "assistant" : "user",
            content: typeof entry.content === "string" ? entry.content : "",
            timestamp:
                typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
                    ? entry.timestamp
                    : Date.now(),
            languageMode: entry.languageMode === "en" ? "en" : "vi_mixed",
        }));
}

function normalizeAdvisorDraft(draft: unknown): AdvisorDraftResult | null {
    if (!draft || typeof draft !== "object") return null;
    const raw = draft as Partial<AdvisorDraftResult>;
    if (typeof raw.fullText !== "string" || raw.fullText.trim().length === 0) {
        return null;
    }

    return {
        createdAt:
            typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
                ? raw.createdAt
                : Date.now(),
        languageMode: raw.languageMode === "en" ? "en" : "vi_mixed",
        modelId: typeof raw.modelId === "string" ? raw.modelId : "gemini-flash",
        disclaimer:
            typeof raw.disclaimer === "string" ? raw.disclaimer : "",
        confidence:
            raw.confidence === "high" || raw.confidence === "medium"
                ? raw.confidence
                : "low",
        assumptions: Array.isArray(raw.assumptions)
            ? raw.assumptions.filter((item): item is string => typeof item === "string")
            : [],
        dataGaps: Array.isArray(raw.dataGaps)
            ? raw.dataGaps.filter((item): item is string => typeof item === "string")
            : [],
        sections: {
            executiveSummary: raw.sections?.executiveSummary ?? "",
            mrvDataInventory: raw.sections?.mrvDataInventory ?? "",
            scopeNarrative: raw.sections?.scopeNarrative ?? "",
            methodologyAndAssumptions: raw.sections?.methodologyAndAssumptions ?? "",
            dataGapsAndEvidence: raw.sections?.dataGapsAndEvidence ?? "",
            nextActions: raw.sections?.nextActions ?? "",
        },
        fullText: raw.fullText,
    };
}

function isFollowUpPrompt(prompt: string): boolean {
    const trimmed = prompt.trim().toLowerCase();
    const shortFollowUp = /^(no|cai do|do|tiep|tiep di|the roi sao|the con|then|and|what about|it|that)\b/;
    return countWords(trimmed) <= 6 || shortFollowUp.test(trimmed);
}

function buildGeminiHistory(messages: ChatMessage[], activePrompt: string): ChatTurnContext[] {
    const budgetChars = 7000;
    const turnsForFollowUp = 14;
    const turnsDefault = 10;

    const conversational = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content })) as ChatTurnContext[];

    // If latest message is the same active prompt, keep it out of history because
    // we pass prompt as the newest user turn separately to Gemini API.
    const latest = conversational[conversational.length - 1];
    const withoutActivePrompt =
        latest?.role === "user" && latest.content === activePrompt
            ? conversational.slice(0, -1)
            : conversational;

    const recentCount = isFollowUpPrompt(activePrompt) ? turnsForFollowUp : turnsDefault;
    const sliced = withoutActivePrompt.slice(-recentCount);

    const truncated = sliced.map((turn) => ({
        role: turn.role,
        content: turn.content.slice(0, 1200),
    }));

    while (
        truncated.reduce((acc, turn) => acc + turn.content.length, 0) > budgetChars &&
        truncated.length > 4
    ) {
        truncated.shift();
    }

    return truncated;
}

function shouldRetryForLength(
    text: string,
    minWords?: number,
    profile?: "concise" | "detailed" | "very_detailed"
): boolean {
    const words = countWords(text);
    if (minWords && minWords > 0) {
        return words < Math.floor(minWords * 0.6);
    }

    if (profile === "very_detailed") {
        return words < 220;
    }

    return false;
}

/** Prefer live CI if available, else static. */
function getRegionalCI(region: string, liveCI: number | null, isLive: boolean): number {
    if (liveCI !== null && isLive) {
        return liveCI;
    }
    return (
        CARBON_INTENSITY_BY_REGION[region as keyof typeof CARBON_INTENSITY_BY_REGION] ??
        GLOBAL_CI_FALLBACK
    );
}

/**
 * Handles the AI response: either real API or mock.
 * Updates store state with assistant message + stats.
 */
async function handleAIResponse(
    prompt: string,
    selectedModelId: string,
    set: (partial: Partial<ACRMState> | ((state: ACRMState) => Partial<ACRMState>)) => void,
    get: () => ACRMState
) {
    const state = get();
    const ci = getRegionalCI(state.selectedRegion, state.liveCarbonIntensity, state.isCILive);
    const model = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);
    const responsePolicy = deriveResponsePolicy(prompt);
    const history = buildGeminiHistory(state.messages, prompt);

    let responseText: string;
    let inputTokens: number;
    let outputTokens: number;
    let visibleOutputTokens = 0;
    let reasoningTokens = 0;
    let billedOutputTokens = 0;
    let tokenSource: CarbonTokenSource = "heuristic";

    // Try real API for models with apiModelId
    if (model?.apiModelId) {
        try {
            let apiResult = await callAIGenerate({
                prompt,
                apiModelId: model.apiModelId,
                history,
                responseProfile: responsePolicy,
            });

            if (shouldRetryForLength(apiResult.text, responsePolicy.minWords, responsePolicy.profile)) {
                const retryInstruction = responsePolicy.minWords
                    ? `${prompt}\n\nImportant: follow the original request exactly and provide at least ${responsePolicy.minWords} words.`
                    : `${prompt}\n\nImportant: provide a much more detailed and structured explanation with concrete examples.`;

                apiResult = await callAIGenerate({
                    prompt: retryInstruction,
                    apiModelId: model.apiModelId,
                    history,
                    responseProfile: { ...responsePolicy, profile: "very_detailed" },
                });
            }

            responseText = apiResult.text;
            inputTokens = apiResult.inputTokens;
            outputTokens = apiResult.outputTokens;
            visibleOutputTokens = apiResult.visibleOutputTokens;
            reasoningTokens = apiResult.reasoningTokens;
            billedOutputTokens = apiResult.chargedOutputTokens;
            tokenSource = "api";
        } catch {
            // Fallback to mock on API failure
            console.warn(`Gemini API failed, falling back to mock for ${selectedModelId}`);
            const mockResult = generateMockResponse(prompt, selectedModelId);
            responseText = mockResult.text;
            inputTokens = mockResult.inputTokens;
            outputTokens = mockResult.outputTokens;
            visibleOutputTokens = mockResult.outputTokens;
            reasoningTokens = 0;
            billedOutputTokens = mockResult.outputTokens;
            tokenSource = "heuristic";
        }
    } else {
        // Non-Gemini models: use mock with a small delay to feel natural
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
        const mockResult = generateMockResponse(prompt, selectedModelId);
        responseText = mockResult.text;
        inputTokens = mockResult.inputTokens;
        outputTokens = mockResult.outputTokens;
        visibleOutputTokens = mockResult.outputTokens;
        reasoningTokens = 0;
        billedOutputTokens = mockResult.outputTokens;
        tokenSource = "heuristic";
    }

    // Full exchange carbon: input + output counted ONCE here
    const assistantMetricsBase = computeMetricsV2(
        inputTokens,
        billedOutputTokens || outputTokens,
        selectedModelId,
        ci,
        {
            tokenSource,
            ciSource: state.isCILive ? "live" : "static",
            ciFactorType: state.ciFactorType,
            assumptions: state.isCILive
                ? ["Carbon intensity from live regional feed."]
                : ["Using static regional carbon intensity fallback."],
        }
    );

    const assistantMetrics: CarbonMetrics = {
        ...assistantMetricsBase,
        outputTokens: billedOutputTokens || outputTokens,
        visibleOutputTokens,
        reasoningTokens,
        billedOutputTokens: billedOutputTokens || outputTokens,
    };

    const assistantMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: responseText,
        modelId: selectedModelId,
        metrics: assistantMetrics,
        timestamp: Date.now(),
    };

    // Re-read state (may have changed during await)
    const freshState = get();

    set({
        messages: [...freshState.messages, assistantMsg],
        isGenerating: false,
        sessionStats: {
            totalCO2: freshState.sessionStats.totalCO2 + assistantMetrics.co2Grams,
            totalEnergyWh:
                freshState.sessionStats.totalEnergyWh + assistantMetrics.energyWh,
            totalTokens:
                freshState.sessionStats.totalTokens + assistantMetrics.totalTokens,
            messageCount: freshState.sessionStats.messageCount + 1,
        },
    });

    // Push resilience scores snapshot
    const updatedState = get();
    const scores = computeResilienceScores(
        updatedState.sessionStats,
        updatedState.messages
    );
    set({
        resilienceHistory: [
            ...updatedState.resilienceHistory,
            {
                timestamp: Date.now(),
                carbonExposure: scores.carbonExposure,
                costShockIndex: scores.costShockIndex,
                resilienceScore: scores.resilienceScore,
            },
        ],
    });
}

// ---- Store ----

export const useACRMStore = create<ACRMState>()(persist((set, get) => ({
    sessionId: null,
    sessionLabel: "",
    messages: [],
    selectedModelId: "gemini-flash",
    sessionStats: {
        totalCO2: 0,
        totalEnergyWh: 0,
        totalTokens: 0,
        messageCount: 0,
    },
    isGenerating: false,
    recommendation: null,
    selectedRegion: "global",
    promptHistory: [],
    duplicateWarning: null,
    carbonBudget: 5, // default 5g COâ‚‚
    budgetWarningShown: false,
    resilienceHistory: [],
    liveCarbonIntensity: null,
    isCILive: false,
    ciIndex: null,
    ciLastUpdated: null,
    ciSource: null,
    ciFactorType: "unknown",
    ciZoneLabel: null,
    ciIsRepresentativeZone: false,
    greenHours: null,
    routingSuggestion: null,
    lastPromptForRouting: null,
    sessionStartTime: null,
    scheduledTasks: [],
    advisorSupplementalInput: DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
    advisorDraft: null,
    advisorQAHistory: [],
    advisorIsGeneratingDraft: false,
    advisorIsAsking: false,
    advisorError: null,

    setSessionId: (id) => set({ sessionId: id }),
    setSessionLabel: (label) => set({ sessionLabel: label }),

    setModel: (id) => set({ selectedModelId: id }),
    setRegion: (region) => {
        set({
            selectedRegion: region,
            liveCarbonIntensity: null,
            isCILive: false,
            ciIndex: null,
            ciLastUpdated: null,
            ciSource: null,
            ciFactorType: "unknown",
            ciZoneLabel: null,
            ciIsRepresentativeZone: false,
            greenHours: null,
        });
        // Auto-fetch live CI for the new region
        get().fetchLiveCarbonData();
    },
    setCarbonBudget: (grams) => set({ carbonBudget: grams, budgetWarningShown: false }),

    sendMessage: (prompt) => {
        const { selectedModelId, messages, sessionStats, promptHistory } =
            get();

        // ---- Phase 3: Duplicate detection ----
        const duplicate = promptHistory.find((prev) => isSimilar(prev, prompt));
        const dupWarning = duplicate
            ? `Duplicate Alert: This prompt is very similar to a previous one. Consider reusing the earlier response to save carbon.`
            : null;

        // ---- User message (token count only â€” no carbon yet) ----
        const inputTokens = Math.max(1, Math.ceil(prompt.length / 4));
        const userMetrics = computeUserMetrics(inputTokens);
        const userMsg: ChatMessage = {
            id: nextId(),
            role: "user",
            content: prompt,
            modelId: selectedModelId,
            metrics: userMetrics,
            timestamp: Date.now(),
        };

        // 2.1 Auto Model Routing â€” analyze prompt before generating
        const routing = routePrompt(prompt, selectedModelId);

        set({
            messages: [...messages, userMsg],
            isGenerating: true,
            recommendation: routing.shouldSwitch ? routing.reason : null,
            routingSuggestion: routing.shouldSwitch ? routing : null,
            lastPromptForRouting: routing.shouldSwitch ? prompt : null,
            duplicateWarning: dupWarning,
            promptHistory: [...promptHistory, prompt],
            sessionStartTime: get().sessionStartTime ?? Date.now(),
            // User messages don't add to session carbon (no inference yet)
            sessionStats: {
                ...sessionStats,
                totalTokens: sessionStats.totalTokens + inputTokens,
                messageCount: sessionStats.messageCount + 1,
            },
        });

        // ---- AI response (real API or mock) ----
        handleAIResponse(prompt, selectedModelId, set, get);
    },

    clearSession: () =>
        set({
            // Session metadata
            sessionId: null,
            sessionLabel: "",
            
            // Chat data
            messages: [],
            sessionStats: {
                totalCO2: 0,
                totalEnergyWh: 0,
                totalTokens: 0,
                messageCount: 0,
            },
            recommendation: null,
            duplicateWarning: null,
            promptHistory: [],
            budgetWarningShown: false,
            resilienceHistory: [],
            liveCarbonIntensity: null,
            isCILive: false,
            ciIndex: null,
            ciLastUpdated: null,
            ciSource: null,
            ciFactorType: "unknown",
            ciZoneLabel: null,
            ciIsRepresentativeZone: false,
            greenHours: null,
            routingSuggestion: null,
            lastPromptForRouting: null,
            sessionStartTime: null,
            scheduledTasks: [],
            advisorSupplementalInput: DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
            advisorDraft: null,
            advisorQAHistory: [],
            advisorIsGeneratingDraft: false,
            advisorIsAsking: false,
            advisorError: null,
        }),

    dismissRecommendation: () => set({ recommendation: null, routingSuggestion: null }),
    dismissDuplicateWarning: () => set({ duplicateWarning: null }),

    // 2.1 Switch to router-suggested model and resend
    switchToSuggested: () => {
        const { routingSuggestion, lastPromptForRouting } = get();
        if (!routingSuggestion || !lastPromptForRouting) return;
        set({
            selectedModelId: routingSuggestion.suggestedModelId,
            recommendation: null,
            routingSuggestion: null,
        });
        // Messages already have the user prompt; just re-run AI with new model
        handleAIResponse(lastPromptForRouting, routingSuggestion.suggestedModelId, set, get);
    },
    dismissRouting: () => set({ routingSuggestion: null, recommendation: null }),

    // 2.3 Carbon-Aware Scheduling
    scheduleMessage: (prompt: string) => {
        const { greenHours, selectedModelId, liveCarbonIntensity } = get();
        const bestSlot = greenHours?.bestSlot;
        const currentCI = liveCarbonIntensity ?? GLOBAL_CI_FALLBACK;
        const bestCI = bestSlot?.ci ?? currentCI;
        const saving = currentCI > 0 ? Math.round(((currentCI - bestCI) / currentCI) * 100) : 0;

        const task: ScheduledTask = {
            id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            prompt,
            modelId: selectedModelId,
            scheduledFor: bestSlot?.from ?? new Date(Date.now() + 3600000).toISOString(),
            status: "queued",
            estimatedSaving: Math.max(0, saving),
            createdAt: Date.now(),
        };
        set({ scheduledTasks: [...get().scheduledTasks, task] });
    },
    cancelScheduled: (id: string) => {
        set({
            scheduledTasks: get().scheduledTasks.map((t) =>
                t.id === id ? { ...t, status: "cancelled" as const } : t
            ),
        });
    },
    runScheduledNow: (id: string) => {
        const task = get().scheduledTasks.find((t) => t.id === id);
        if (!task || task.status !== "queued") return;

        // Mark task as running
        set({
            scheduledTasks: get().scheduledTasks.map((t) =>
                t.id === id ? { ...t, status: "running" as const } : t
            ),
        });

        // Create user message inline (avoid sendMessage to prevent double-counting)
        const inputTokens = Math.max(1, Math.ceil(task.prompt.length / 4));
        const userMetrics = computeUserMetrics(inputTokens);
        const userMsg: ChatMessage = {
            id: nextId(),
            role: "user",
            content: task.prompt,
            modelId: task.modelId,
            metrics: userMetrics,
            timestamp: Date.now(),
        };

        const currentState = get();
        set({
            messages: [...currentState.messages, userMsg],
            isGenerating: true,
            sessionStartTime: currentState.sessionStartTime ?? Date.now(),
            sessionStats: {
                ...currentState.sessionStats,
                totalTokens: currentState.sessionStats.totalTokens + inputTokens,
                messageCount: currentState.sessionStats.messageCount + 1,
            },
        });

        // Run AI response and mark completed AFTER it finishes
        handleAIResponse(task.prompt, task.modelId, set, get).then(() => {
            set({
                scheduledTasks: get().scheduledTasks.map((t) =>
                    t.id === id ? { ...t, status: "completed" as const } : t
                ),
            });
        });
    },

    setAdvisorInput: (patch) => {
        set((state) => ({
            advisorSupplementalInput: normalizeAdvisorSupplementalInput({
                ...state.advisorSupplementalInput,
                ...patch,
            }),
            advisorError: null,
        }));
    },
    generateAdvisorDraft: async () => {
        const state = get();
        const assistantCount = state.messages.filter((m) => m.role === "assistant").length;
        if (assistantCount === 0) {
            set({
                advisorError: "No assistant session data yet. Send messages in /chat first.",
            });
            return;
        }

        set({
            advisorIsGeneratingDraft: true,
            advisorError: null,
        });

        try {
            const supplemental = normalizeAdvisorSupplementalInput(state.advisorSupplementalInput);
            const snapshot = buildAdvisorSnapshot(
                {
                    messages: state.messages,
                    sessionStats: state.sessionStats,
                    selectedModelId: state.selectedModelId,
                    selectedRegion: state.selectedRegion,
                    liveCarbonIntensity: state.liveCarbonIntensity,
                    isCILive: state.isCILive,
                    ciSource: state.ciSource,
                    ciFactorType: state.ciFactorType,
                    ciZoneLabel: state.ciZoneLabel,
                    ciIsRepresentativeZone: state.ciIsRepresentativeZone,
                    resilienceHistory: state.resilienceHistory,
                    sessionStartTime: state.sessionStartTime,
                    carbonBudget: state.carbonBudget,
                },
                supplemental
            );

            const draft = await generateAdvisorDraftContent(
                snapshot,
                supplemental,
                state.selectedModelId,
                "en"
            );

            set({
                advisorDraft: draft,
                advisorQAHistory: [],
                advisorIsGeneratingDraft: false,
                advisorError: null,
            });
        } catch (error) {
            set({
                advisorIsGeneratingDraft: false,
                advisorError: error instanceof Error
                    ? error.message
                    : "Failed to generate advisory draft.",
            });
        }
    },
    askAdvisor: async (question) => {
        const trimmed = question.trim();
        if (!trimmed) return;

        const current = get();
        if (!current.advisorDraft) {
            set({ advisorError: "Please generate the advisory draft first." });
            return;
        }

        const languageMode = getAdvisorLanguageModeFromText(trimmed);
        const userEntry: AdvisorQAEntry = {
            id: `advisor-qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: "user",
            content: trimmed,
            timestamp: Date.now(),
            languageMode,
        };

        set((state) => ({
            advisorQAHistory: [...state.advisorQAHistory, userEntry],
            advisorIsAsking: true,
            advisorError: null,
        }));

        try {
            const state = get();
            const supplemental = normalizeAdvisorSupplementalInput(state.advisorSupplementalInput);
            const snapshot = buildAdvisorSnapshot(
                {
                    messages: state.messages,
                    sessionStats: state.sessionStats,
                    selectedModelId: state.selectedModelId,
                    selectedRegion: state.selectedRegion,
                    liveCarbonIntensity: state.liveCarbonIntensity,
                    isCILive: state.isCILive,
                    ciSource: state.ciSource,
                    ciFactorType: state.ciFactorType,
                    ciZoneLabel: state.ciZoneLabel,
                    ciIsRepresentativeZone: state.ciIsRepresentativeZone,
                    resilienceHistory: state.resilienceHistory,
                    sessionStartTime: state.sessionStartTime,
                    carbonBudget: state.carbonBudget,
                },
                supplemental
            );

            const answer = await askAdvisorQuestion(
                snapshot,
                supplemental,
                state.advisorDraft ?? current.advisorDraft,
                state.advisorQAHistory,
                trimmed,
                state.selectedModelId,
                languageMode
            );

            const assistantEntry: AdvisorQAEntry = {
                id: `advisor-qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                role: "assistant",
                content: answer.text,
                timestamp: Date.now(),
                languageMode: answer.languageMode,
            };

            set((state) => ({
                advisorQAHistory: [...state.advisorQAHistory, assistantEntry],
                advisorIsAsking: false,
                advisorError: null,
            }));
        } catch (error) {
            set({
                advisorIsAsking: false,
                advisorError: error instanceof Error
                    ? error.message
                    : "Failed to answer advisory question.",
            });
        }
    },
    clearAdvisor: () => {
        set({
            advisorSupplementalInput: DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
            advisorDraft: null,
            advisorQAHistory: [],
            advisorIsGeneratingDraft: false,
            advisorIsAsking: false,
            advisorError: null,
        });
    },

    fetchLiveCarbonData: async () => {
        const region = get().selectedRegion;
        try {
            const liveData = await fetchLiveCI(region);
            set({
                liveCarbonIntensity: liveData.currentCI,
                isCILive: liveData.isLive,
                ciIndex: liveData.index,
                ciLastUpdated: liveData.updatedAt,
                ciSource: liveData.source,
                ciFactorType: liveData.factorType,
                ciZoneLabel: liveData.zoneLabel,
                ciIsRepresentativeZone: liveData.isRepresentativeZone,
            });

            // Fetch Green Hours only for regions with live data
            if (liveData.isLive) {
                const ghData = await fetchGreenHours(region);
                set({ greenHours: ghData });
            } else {
                set({ greenHours: null });
            }
        } catch (err) {
            console.warn("Failed to fetch live CI:", err);
        }
    },
}), {
    name: "acrm-session",
    storage: createJSONStorage(() => {
        return {
            getItem: (name) => {
                if (typeof window === "undefined") return null;
                const userId = localStorage.getItem("acrm-last-user-id");
                const key = userId ? `${name}-${userId}` : name;
                return localStorage.getItem(key);
            },
            setItem: (name, value) => {
                if (typeof window === "undefined") return;
                const userId = localStorage.getItem("acrm-last-user-id");
                const key = userId ? `${name}-${userId}` : name;
                localStorage.setItem(key, value);
            },
            removeItem: (name) => {
                if (typeof window === "undefined") return;
                const userId = localStorage.getItem("acrm-last-user-id");
                const key = userId ? `${name}-${userId}` : name;
                localStorage.removeItem(key);
            },
        };
    }),
    version: 5,
    migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion < 5) {
            return {};
        }

        const state = (persistedState && typeof persistedState === "object"
            ? persistedState
            : {}) as Partial<ACRMState> & {
                messages?: unknown;
                advisorSupplementalInput?: unknown;
                advisorDraft?: unknown;
                advisorQAHistory?: unknown;
            };

        const normalizedMessages = normalizePersistedMessages(state.messages);
        const inferredStart = inferSessionStartFromMessages(
            normalizedMessages.length > 0 ? normalizedMessages : state.messages
        );
        const normalizedAdvisorInput = normalizeAdvisorSupplementalInput(
            state.advisorSupplementalInput && typeof state.advisorSupplementalInput === "object"
                ? (state.advisorSupplementalInput as Partial<AdvisorSupplementalInput>)
                : undefined
        );
        const normalizedAdvisorDraft = normalizeAdvisorDraft(state.advisorDraft);
        const normalizedAdvisorHistory = normalizeAdvisorQAHistory(state.advisorQAHistory);

        return {
            ...state,
            messages: normalizedMessages.length > 0
                ? normalizedMessages
                : (Array.isArray(state.messages) ? state.messages as ChatMessage[] : []),
            sessionStartTime:
                typeof state.sessionStartTime === "number" && Number.isFinite(state.sessionStartTime)
                    ? state.sessionStartTime
                    : inferredStart,
            ciSource: state.ciSource ?? null,
            ciFactorType: state.ciFactorType ?? "unknown",
            ciZoneLabel: state.ciZoneLabel ?? null,
            ciIsRepresentativeZone: state.ciIsRepresentativeZone ?? false,
            advisorSupplementalInput: normalizedAdvisorInput,
            advisorDraft: normalizedAdvisorDraft,
            advisorQAHistory: normalizedAdvisorHistory,
        };
    },
    partialize: (state) => ({
        messages: state.messages,
        selectedModelId: state.selectedModelId,
        selectedRegion: state.selectedRegion,
        sessionStats: state.sessionStats,
        carbonBudget: state.carbonBudget,
        promptHistory: state.promptHistory,
        resilienceHistory: state.resilienceHistory,
        sessionStartTime: state.sessionStartTime,
        ciSource: state.ciSource,
        ciFactorType: state.ciFactorType,
        ciZoneLabel: state.ciZoneLabel,
        ciIsRepresentativeZone: state.ciIsRepresentativeZone,
        advisorSupplementalInput: state.advisorSupplementalInput,
        advisorDraft: state.advisorDraft,
        advisorQAHistory: state.advisorQAHistory,
    }),
}));


