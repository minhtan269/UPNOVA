"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function CTASection() {
    const { t } = useTranslation();

    return (
        <section className="py-24 relative overflow-hidden">
            {/* Decorative bg blobs */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-[#0FA697]/8 blur-3xl" />
                <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-[#AED911]/8 blur-3xl" />
            </div>

            <div className="mx-auto max-w-4xl px-6 text-center">
                <div className="rounded-3xl border border-gray-100 dark:border-[#2a2d3a] bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-[#1e212c]/80 dark:to-[#13151d]/80 p-12 md:p-16 backdrop-blur-xl shadow-lg">
                    <div className="text-5xl mb-6">🌱</div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
                        {t("cta.title")}
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {t("cta.subtitle")}
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            href="/chat"
                            className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:shadow-2xl hover:scale-105"
                        >
                            {t("cta.startChat")}
                        </Link>
                        <Link
                            href="/compare"
                            className="inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1e212c] px-8 py-4 text-lg font-bold text-gray-700 dark:text-gray-200 transition-all hover:border-[#0FA697]/50 hover:text-[#0FA697]"
                        >
                            {t("cta.compareModels")}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
