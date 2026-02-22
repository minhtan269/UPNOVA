"use client";

import { useState } from "react";
import { useACRMStore } from "@/lib/store";
import { DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT } from "@/lib/advisor-types";
import {
    getSavedSessions,
    saveCurrentSession,
    deleteSession,
    clearAllSessions,
    type SavedSession,
} from "@/lib/session-manager";

function inferSessionStartFromMessages(messages: { timestamp: number }[]): number | null {
    const timestamps = messages
        .map((m) => m.timestamp)
        .filter((ts) => Number.isFinite(ts));

    if (timestamps.length === 0) return null;
    return Math.min(...timestamps);
}

export default function SessionHistory() {
    const [sessions, setSessions] = useState<SavedSession[]>(() => getSavedSessions());
    const [isOpen, setIsOpen] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const messages = useACRMStore((s) => s.messages);
    const sessionStats = useACRMStore((s) => s.sessionStats);
    const selectedModelId = useACRMStore((s) => s.selectedModelId);
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const carbonBudget = useACRMStore((s) => s.carbonBudget);
    const resilienceHistory = useACRMStore((s) => s.resilienceHistory);
    const advisorSupplementalInput = useACRMStore((s) => s.advisorSupplementalInput);
    const advisorDraft = useACRMStore((s) => s.advisorDraft);
    const advisorQAHistory = useACRMStore((s) => s.advisorQAHistory);

    const handleSave = () => {
        if (messages.length === 0) return;

        saveCurrentSession({
            messages,
            sessionStats,
            selectedModelId,
            selectedRegion,
            carbonBudget,
            resilienceHistory,
            advisorSupplementalInput,
            advisorDraft,
            advisorQAHistory,
        });

        setSessions(getSavedSessions());
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    };

    const handleLoad = (session: SavedSession) => {
        useACRMStore.setState({
            messages: session.messages,
            sessionStats: session.sessionStats,
            selectedModelId: session.selectedModelId,
            selectedRegion: session.selectedRegion,
            carbonBudget: session.carbonBudget,
            resilienceHistory: session.resilienceHistory,
            isGenerating: false,
            recommendation: null,
            duplicateWarning: null,
            budgetWarningShown: false,
            promptHistory: session.messages
                .filter((m) => m.role === "user")
                .map((m) => m.content),
            routingSuggestion: null,
            lastPromptForRouting: null,
            sessionStartTime: inferSessionStartFromMessages(session.messages),
            advisorSupplementalInput:
                session.advisorSupplementalInput ?? DEFAULT_ADVISOR_SUPPLEMENTAL_INPUT,
            advisorDraft: session.advisorDraft ?? null,
            advisorQAHistory: session.advisorQAHistory ?? [],
            advisorIsGeneratingDraft: false,
            advisorIsAsking: false,
            advisorError: null,
        });
        setIsOpen(false);
    };

    const handleDelete = (id: string) => {
        deleteSession(id);
        setSessions(getSavedSessions());
    };

    const handleClearAll = () => {
        clearAllSessions();
        setSessions(getSavedSessions());
    };

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/60 dark:bg-[#1e212c]/60 backdrop-blur-sm shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Session History
                </h3>
                <div className="flex gap-1.5">
                    <button
                        onClick={handleSave}
                        disabled={messages.length === 0}
                        className="rounded-lg bg-[#0FA697]/10 px-2.5 py-1 text-[10px] font-semibold text-[#0FA697]
                         transition-all hover:bg-[#0FA697]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {justSaved ? "Saved" : "Save"}
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="rounded-lg bg-gray-100 dark:bg-[#1a1d27] px-2.5 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400
                         transition-all hover:bg-gray-200 dark:hover:bg-white/10"
                    >
                        {isOpen ? "Close" : `Browse (${sessions.length})`}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {sessions.length === 0 ? (
                        <div className="text-center text-[10px] text-gray-400 py-4">
                            No saved sessions yet. Save your current session to see it here.
                        </div>
                    ) : (
                        <>
                            {sessions.map((s) => {
                                const aiMsgs = s.messages.filter(
                                    (m) => m.role === "assistant"
                                ).length;
                                return (
                                    <div
                                        key={s.id}
                                        className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]/80 p-2
                                         hover:border-[#0FA697]/30 transition-all group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate">
                                                {formatDate(s.savedAt)} - {s.selectedRegion}
                                            </div>
                                            <div className="text-[9px] text-gray-400 mt-0.5">
                                                {aiMsgs} msgs - {s.sessionStats.totalCO2.toFixed(3)}g CO2 -{" "}
                                                {s.sessionStats.totalTokens} tokens
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleLoad(s)}
                                            className="rounded-md bg-[#0FA697]/10 px-2 py-0.5 text-[9px] font-bold
                                             text-[#0FA697] hover:bg-[#0FA697]/20 transition-all flex-shrink-0"
                                            title="Load this session"
                                        >
                                            Load
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="rounded-md bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold
                                             text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all opacity-0
                                             group-hover:opacity-100 flex-shrink-0"
                                            title="Delete this session"
                                        >
                                            x
                                        </button>
                                    </div>
                                );
                            })}
                            {sessions.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="w-full text-center text-[9px] text-gray-400 hover:text-red-400
                                     transition-colors py-1"
                                >
                                    Clear all saved sessions
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
