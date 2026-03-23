"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="border-t border-gray-200/60 dark:border-[#2a2d3a] bg-white/50 dark:bg-[#13151d]/60 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Image src="/logo.png" alt="ACRM" width={32} height={32} className="rounded-lg" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t("footer.brand")}</span>
                        </div>
                        <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xs">
                            {t("footer.description")}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                            {t("footer.navigation")}
                        </h4>
                        <div className="space-y-2">
                            <Link href="/" className="block text-sm text-gray-400 dark:text-gray-500 hover:text-[#0FA697] transition-colors">
                                {t("footer.home")}
                            </Link>
                            <Link href="/chat" className="block text-sm text-gray-400 dark:text-gray-500 hover:text-[#0FA697] transition-colors">
                                {t("footer.chat")}
                            </Link>
                            <Link href="/advisor" className="block text-sm text-gray-400 dark:text-gray-500 hover:text-[#0FA697] transition-colors">
                                {t("footer.advisor")}
                            </Link>
                            <Link href="/team" className="block text-sm text-gray-400 dark:text-gray-500 hover:text-[#0FA697] transition-colors">
                                {t("footer.team")}
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-200/60 dark:border-[#2a2d3a] pt-4 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        (c) {new Date().getFullYear()} {t("footer.copyright")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
