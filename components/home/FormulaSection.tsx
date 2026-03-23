"use client";

import {
    CARBON_INTENSITY,
    ENERGY_COEFFICIENTS,
    CARBON_INTENSITY_BY_REGION,
} from "@/lib/carbon-constants";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function FormulaSection() {
    const { t } = useTranslation();

    return (
        <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] z-0" />

            <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
                <h2 className="text-3xl font-extrabold mb-4">{t("formula.sectionTitle")}</h2>
                <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
                    {t("formula.sectionSubtitle")}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mx-auto max-w-5xl text-left">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-md hover:bg-white/[0.08] transition-colors">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">📐</span>
                            <h3 className="text-lg font-bold text-[#0FA697]">{t("formula.v1Label")}</h3>
                        </div>
                        <div className="font-mono text-lg md:text-xl font-bold text-[#AED911] mb-6 bg-black/20 rounded-xl p-4">
                            CO2(g) = (tokens / 1000) x E<sub>coeff</sub> x CI
                        </div>
                        <div className="text-gray-300 text-sm space-y-2">
                            <div className="flex justify-between border-b border-white/5 pb-1">
                                <span>🟢 Small:</span>
                                <span className="font-mono text-white">{ENERGY_COEFFICIENTS.small} kWh/1k tokens</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1">
                                <span>🟡 Medium:</span>
                                <span className="font-mono text-white">{ENERGY_COEFFICIENTS.medium} kWh/1k tokens</span>
                            </div>
                            <div className="flex justify-between">
                                <span>🔴 Large:</span>
                                <span className="font-mono text-white">{ENERGY_COEFFICIENTS.large} kWh/1k tokens</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-[#AED911]/20 p-8 backdrop-blur-md hover:bg-white/[0.08] transition-colors relative">
                        <div className="absolute top-3 right-3 rounded-full bg-[#AED911]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#AED911] uppercase tracking-wide">
                            {t("formula.defaultBadge")}
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">🎯</span>
                            <h3 className="text-lg font-bold text-[#AED911]">{t("formula.v2Label")}</h3>
                        </div>
                        <div className="font-mono text-lg md:text-xl font-bold text-[#AED911] mb-3 bg-black/20 rounded-xl p-4">
                            E(kWh) = (tokens x J/token) / 3,600,000
                        </div>
                        <div className="font-mono text-lg md:text-xl font-bold text-[#AED911] mb-6 bg-black/20 rounded-xl p-4">
                            CO2(g) = E(kWh) x CI
                        </div>
                        <p className="text-gray-400 text-sm">
                            Uses model-specific J/token when available. If missing, it falls back to V1 coefficients
                            derived from the same model catalog scale.
                        </p>
                    </div>
                </div>

                <div className="mt-10 mx-auto max-w-5xl rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                    <h3 className="font-bold text-[#D9CD2B] mb-4 text-lg text-center">{t("formula.carbonIntensityTitle")}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {[
                            { label: t("formula.globalAvg"), value: CARBON_INTENSITY, flag: "🌐" },
                            { label: t("formula.vietnam"), value: CARBON_INTENSITY_BY_REGION.vietnam, flag: "🇻🇳" },
                            { label: t("formula.eu"), value: CARBON_INTENSITY_BY_REGION.eu, flag: "🇪🇺" },
                            { label: t("formula.nordics"), value: CARBON_INTENSITY_BY_REGION.nordics, flag: "🇸🇪" },
                        ].map((region) => (
                            <div key={region.label} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                                <span className="text-gray-300">{region.flag} {region.label}</span>
                                <span className="font-mono font-bold text-white">{region.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
