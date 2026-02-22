"use client";

import ModelSelector from "@/components/ModelSelector";
import RegionSelector from "@/components/RegionSelector";
import ChatInterface from "@/components/ChatInterface";
import ResilienceDashboard from "@/components/ResilienceDashboard";
import GreenHours from "@/components/GreenHours";
import ScheduledTasks from "@/components/ScheduledTasks";
import SmartRecommendation from "@/components/SmartRecommendation";
import DuplicateWarning from "@/components/DuplicateWarning";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ChatPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--background)]">
            {/* ======= Main Chat Area ======= */}
            <div className="flex flex-1 flex-col min-w-0 min-h-0">
                {/* Top Bar */}
                <header className="flex items-center justify-between border-b border-gray-200/60 dark:border-[#2a2d3a] bg-white/50 dark:bg-[#13151d]/80 backdrop-blur-md px-5 py-3 gap-3">
                    {/* Branding + Back */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Link
                            href="/"
                            className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md transition-transform hover:scale-110 overflow-hidden"
                            title="Back to Home"
                        >
                            <Image src="/logo.png" alt="ACRM" width={36} height={36} className="rounded-xl" />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                                ACRM
                            </h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">
                                AI Carbon-Resilience Management
                            </p>
                        </div>
                    </div>

                    {/* Center: Model + Region Selectors */}
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <ModelSelector />
                        <div className="h-6 w-px bg-gray-200 dark:bg-[#2a2d3a]" />
                        <RegionSelector />
                    </div>

                    {/* Right: Toggle Dashboard */}
                    <div className="flex items-center gap-2">
                        <Link
                            href="/advisor"
                            className="rounded-xl border border-[#0FA697]/40 bg-[#0FA697]/10 px-3 py-2 text-sm font-medium text-[#0FA697] transition-all hover:bg-[#0FA697]/20"
                        >
                            Use Advisor
                        </Link>
                        <button
                            id="toggle-dashboard"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1e212c]/80 px-3 py-2 
                           text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm transition-all flex-shrink-0
                           hover:border-[#0FA697]/50 hover:text-[#0FA697]"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {sidebarOpen ? "Hide" : "Show"} Dashboard
                        </button>
                    </div>
                </header>

                {/* Chat */}
                <ChatInterface />
            </div>

            {/* ======= Sidebar Overlay (Mobile) ======= */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ======= Sidebar — Resilience Dashboard ======= */}
            <aside
                className={`flex-shrink-0 border-l border-gray-200/60 dark:border-[#2a2d3a] bg-[#F2C094]/20 dark:bg-[#13151d]/60 backdrop-blur-sm transition-all duration-300 ease-in-out
                fixed inset-y-0 right-0 z-50 h-full shadow-2xl md:relative md:z-0 md:shadow-none
                ${sidebarOpen ? "translate-x-0 w-[85vw] md:w-[380px] md:translate-x-0" : "translate-x-full w-[85vw] md:w-0 md:translate-x-0 md:overflow-hidden"}`}
            >
                <div className="h-full w-full overflow-y-auto custom-scrollbar">
                    <div className="w-full md:w-[380px]">
                        {/* Mobile Close Button */}
                        <div className="flex justify-end p-2 md:hidden">
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="rounded-full p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <ResilienceDashboard />
                        <GreenHours />
                        <ScheduledTasks />
                    </div>
                </div>
            </aside>

            {/* Toasts */}
            <SmartRecommendation />
            <DuplicateWarning />
        </div>
    );
}
