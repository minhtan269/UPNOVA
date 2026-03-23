"use client";

import Link from "next/link";
import Image from "next/image";
import { AVAILABLE_MODELS, AVAILABLE_REGIONS } from "@/lib/carbon-constants";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function HeroSection() {
    const { t } = useTranslation();

    return (
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
            {/* Decorative bg */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-[#0FA697]/10 blur-3xl" />
                <div className="absolute top-40 right-20 h-96 w-96 rounded-full bg-[#AED911]/10 blur-3xl opacity-60" />
                <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[#F2C094]/15 blur-3xl opacity-40" />
            </div>

            <div className="mx-auto max-w-7xl px-6 text-center">
                {/* Logo & Badge */}
                <div className="anim-fade-up" style={{ animationDelay: "0.1s" }}>
                    <Image
                        src="/logo.png"
                        alt="ACRM Logo"
                        width={120}
                        height={120}
                        className="mx-auto mb-8 drop-shadow-xl hover:scale-105 transition-transform duration-500"
                        priority
                    />

                    <div className="inline-flex items-center gap-2 rounded-full border border-[#0FA697]/20 bg-[#0FA697]/5 px-4 py-1.5 text-sm font-semibold text-[#0FA697] mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0FA697] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0FA697]" />
                        </span>
                        {t("hero.badge")}
                    </div>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-6 tracking-tight anim-fade-up" style={{ animationDelay: "0.2s" }}>
                    {t("hero.headline1")}{" "}
                    <span className="bg-gradient-to-r from-[#0FA697] to-[#AED911] bg-clip-text text-transparent">
                        {t("hero.headline2")}
                    </span>
                    <br />
                    {t("hero.headline3")}
                </h1>

                {/* Subtitle */}
                <p className="mx-auto max-w-2xl text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-10 anim-fade-up" style={{ animationDelay: "0.3s" }}>
                    {t("hero.subtitle")}
                </p>

                {/* CTAs */}
                <div className="flex items-center justify-center gap-4 flex-wrap anim-fade-up" style={{ animationDelay: "0.4s" }}>
                    <Link
                        href="/chat"
                        className="rounded-2xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-8 py-3.5 text-base font-bold text-white shadow-xl transition-all hover:shadow-2xl hover:scale-105"
                    >
                        {t("hero.tryChat")}
                    </Link>
                    <Link
                        href="/team"
                        className="rounded-2xl border-2 border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1e212c]/80 px-8 py-3.5 text-base font-bold text-gray-700 dark:text-gray-200 shadow-sm transition-all hover:border-[#0FA697]/50 hover:text-[#0FA697]"
                    >
                        {t("hero.meetTeam")}
                    </Link>
                </div>

                {/* Minimal Stats Row */}
                <div className="mt-20 border-t border-gray-100 dark:border-[#2a2d3a] pt-10 anim-fade-up" style={{ animationDelay: "0.5s" }}>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        <StatItem value={AVAILABLE_MODELS.length} label={t("hero.statModels")} />
                        <div className="hidden md:block w-px bg-gray-200 dark:bg-[#2a2d3a]" />
                        <StatItem value={AVAILABLE_REGIONS.length} label={t("hero.statRegions")} />
                        <div className="hidden md:block w-px bg-gray-200 dark:bg-[#2a2d3a]" />
                        <StatItem value="3" label={t("hero.statResilience")} />
                        <div className="hidden md:block w-px bg-gray-200 dark:bg-[#2a2d3a]" />
                        <StatItem value="4" label={t("hero.statLayers")} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatItem({ value, label }: { value: number | string; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">
                {value}
            </div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {label}
            </div>
        </div>
    );
}
