"use client";

import { useEffect } from "react";
import { useACRMStore } from "@/lib/store";

export default function SmartRecommendation() {
    const recommendation = useACRMStore((s) => s.recommendation);
    const routingSuggestion = useACRMStore((s) => s.routingSuggestion);
    const dismiss = useACRMStore((s) => s.dismissRecommendation);
    const switchToSuggested = useACRMStore((s) => s.switchToSuggested);
    const dismissRouting = useACRMStore((s) => s.dismissRouting);

    // Auto-dismiss after 12 seconds
    useEffect(() => {
        if (!recommendation) return;
        const timer = setTimeout(dismiss, 12000);
        return () => clearTimeout(timer);
    }, [recommendation, dismiss]);

    if (!recommendation) return null;

    const hasRouting = routingSuggestion?.shouldSwitch;

    return (
        <div className="fixed top-6 right-6 z-50 animate-slide-in">
            <div className="max-w-md rounded-2xl border border-[#0FA697]/30 bg-gradient-to-r from-[#0FA697]/10 to-[#AED911]/10 p-4 shadow-2xl backdrop-blur-md dark:bg-[#141720]/90">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 rounded-full bg-[#0FA697]/20 p-2">
                        <svg className="h-5 w-5 text-[#0FA697]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#0FA697]">
                            🧠 Smart Model Router
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                            {recommendation}
                        </p>

                        {/* Routing action buttons */}
                        {hasRouting && (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={switchToSuggested}
                                    className="flex items-center gap-1.5 rounded-lg bg-[#0FA697] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#0d8f83] hover:shadow-md active:scale-95"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Switch to {routingSuggestion.suggestedModelName}
                                </button>
                                {routingSuggestion.carbonSaving > 0 && (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        −{routingSuggestion.carbonSaving}% CO₂
                                    </span>
                                )}
                                <button
                                    onClick={dismissRouting}
                                    className="text-[10px] text-gray-400 hover:text-gray-300 underline"
                                >
                                    Keep current
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={dismiss}
                        className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
