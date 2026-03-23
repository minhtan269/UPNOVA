"use client";

import { useACRMStore } from "@/lib/store";
import { AVAILABLE_MODELS } from "@/lib/carbon-constants";
import { useTranslation } from "@/lib/i18n/useTranslation";

const CLASS_COLORS: Record<string, string> = {
    small: "bg-[#0FA697]",
    medium: "bg-[#D9CD2B]",
    large: "bg-[#D91A1A]",
};

export default function ModelSelector() {
    const { t } = useTranslation();
    const selectedModelId = useACRMStore((s) => s.selectedModelId);
    const setModel = useACRMStore((s) => s.setModel);

    const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);

    return (
        <div className="flex items-center gap-3">
            <label
                htmlFor="model-select"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
                {t("modelSelector.label")}
            </label>

            <div className="relative">
                <select
                    id="model-select"
                    value={selectedModelId}
                    onChange={(e) => setModel(e.target.value)}
                    className="appearance-none rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]
                     py-2 pr-10 pl-4 text-sm font-medium text-gray-800 dark:text-gray-200
                     shadow-sm backdrop-blur-sm transition-all
                     hover:border-[#0FA697]/50 focus:border-[#0FA697] focus:ring-2 focus:ring-[#0FA697]/20 
                     focus:outline-none cursor-pointer"
                >
                    {AVAILABLE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.provider} - {m.name}
                        </option>
                    ))}
                </select>

                {/* Custom dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Class badge */}
            {currentModel && (
                <>
                    <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${CLASS_COLORS[currentModel.modelClass]}`}
                    >
                        {currentModel.badge}
                    </span>
                </>
            )}
        </div>
    );
}

