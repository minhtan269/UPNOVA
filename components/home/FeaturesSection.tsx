"use client";

import { CARBON_INTENSITY_BY_REGION } from "@/lib/carbon-constants";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function FeaturesSection() {
    const { t } = useTranslation();

    const FEATURES = [
        {
            icon: "RT",
            title: t("features.realtimeTitle"),
            description: t("features.realtimeDesc"),
            color: "from-[#0FA697] to-[#AED911]",
        },
        {
            icon: "RG",
            title: t("features.regionalTitle"),
            description: `${t("features.regionalDesc").replace("{vietnam}", String(CARBON_INTENSITY_BY_REGION.vietnam)).replace("{nordics}", String(CARBON_INTENSITY_BY_REGION.nordics))}`,
            color: "from-[#AED911] to-[#D9CD2B]",
        },
        {
            icon: "RS",
            title: t("features.resilienceTitle"),
            description: t("features.resilienceDesc"),
            color: "from-[#D9CD2B] to-[#F2C094]",
        },
        {
            icon: "DD",
            title: t("features.duplicateTitle"),
            description: t("features.duplicateDesc"),
            color: "from-[#0FA697] to-[#0FA697]/60",
        },
        {
            icon: "SR",
            title: t("features.smartTitle"),
            description: t("features.smartDesc"),
            color: "from-[#D91A1A]/80 to-[#D9CD2B]",
        },
        {
            icon: "AI",
            title: t("features.advisorTitle"),
            description: t("features.advisorDesc"),
            color: "from-[#F2C094] to-[#0FA697]",
        },
    ];

    return (
        <section className="py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">
                        {t("features.sectionTitle")}
                    </h2>
                    <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                        {t("features.sectionSubtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="group rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1e212c]/60 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#0FA697]/20"
                        >
                            <div
                                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-base font-black text-white shadow-md transition-transform group-hover:scale-110 group-hover:rotate-3`}
                            >
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                                {f.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                {f.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
