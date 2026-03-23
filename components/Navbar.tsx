"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function Navbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { t } = useTranslation();

    const navItems = [
        { href: "/", label: t("navbar.home") },
        { href: "/chat", label: t("navbar.chat") },
        { href: "/advisor", label: t("navbar.advisor") },
        { href: "/compare", label: t("navbar.compare") },
        { href: "/analytics", label: t("navbar.analytics") },
        { href: "/team", label: t("navbar.team") },
    ];

    return (
        <nav className="sticky top-0 z-40 border-b border-gray-200/60 dark:border-[#2a2d3a] bg-white/70 dark:bg-[#13151d]/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
                <Link href="/" className="flex items-center gap-3 group">
                    <Image
                        src="/logo.png"
                        alt="ACRM Logo"
                        width={40}
                        height={40}
                        className="rounded-xl shadow-lg transition-transform group-hover:scale-110"
                    />
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-tight">
                            ACRM
                        </h1>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold tracking-widest uppercase">
                            {t("navbar.logoSubtitle")}
                        </p>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                                    isActive
                                        ? "bg-gradient-to-r from-[#0FA697]/10 to-[#AED911]/10 text-[#0FA697] shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-white/5"
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <ThemeToggle />

                    <Link
                        href="/chat"
                        className="hidden sm:inline-flex rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                    >
                        {t("navbar.startChat")}
                    </Link>

                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/10 transition-colors"
                        aria-label={t("navbar.toggleMenu")}
                    >
                        <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {mobileOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-gray-200/60 dark:border-[#2a2d3a] bg-white/90 dark:bg-[#13151d]/95 backdrop-blur-xl animate-fade-in">
                    <div className="px-4 py-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all ${
                                        isActive
                                            ? "bg-gradient-to-r from-[#0FA697]/10 to-[#AED911]/10 text-[#0FA697]"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-white/5"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                        <Link
                            href="/chat"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-5 py-3 text-base font-bold text-white text-center shadow-md mt-2"
                        >
                            {t("navbar.startChat")}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
