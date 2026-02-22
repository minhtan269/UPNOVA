"use client";

import { useEffect } from "react";
import { useACRMStore } from "@/lib/store";

export default function DuplicateWarning() {
    const duplicateWarning = useACRMStore((s) => s.duplicateWarning);
    const dismiss = useACRMStore((s) => s.dismissDuplicateWarning);

    // Auto-dismiss after 6 seconds
    useEffect(() => {
        if (!duplicateWarning) return;
        const timer = setTimeout(dismiss, 6000);
        return () => clearTimeout(timer);
    }, [duplicateWarning, dismiss]);

    if (!duplicateWarning) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
            <div className="max-w-lg rounded-2xl border border-[#D9CD2B]/40 bg-gradient-to-r from-[#D9CD2B]/10 to-[#AED911]/10 p-4 shadow-2xl backdrop-blur-md dark:bg-[#141720]/90">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 rounded-full bg-[#D9CD2B]/20 p-2">
                        <svg className="h-5 w-5 text-[#b8a800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-[#b8a800]">
                            Duplicate Query Detected
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                            {duplicateWarning}
                        </p>
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
