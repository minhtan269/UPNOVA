"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeamCard from "@/components/team/TeamCard";
import { TEAM_MEMBERS, PROJECT_STATS } from "@/lib/team-data";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TeamPage() {
    const { t } = useTranslation();
    const techTeam = TEAM_MEMBERS.filter((m) => m.team === "tech");
    const businessTeam = TEAM_MEMBERS.filter((m) => m.team === "business");

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Navbar />

            {/* Hero */}
            <section className="relative overflow-hidden py-20">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute right-20 top-10 h-64 w-64 rounded-full bg-[#0FA697]/10 blur-3xl anim-fade-up" />
                    <div
                        className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-[#AED911]/10 blur-3xl anim-fade-up"
                        style={{ animationDelay: "200ms" }}
                    />
                </div>

                <div className="mx-auto max-w-7xl px-6 text-center anim-fade-up">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0FA697]/20 bg-[#0FA697]/5 px-4 py-1.5 text-sm font-semibold text-[#0FA697]">
                        {t("team.badge")}
                    </div>
                    <h1 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-gray-100 md:text-5xl">
                        ACRM <span className="bg-gradient-to-r from-[#0FA697] to-[#AED911] bg-clip-text text-transparent">{t("team.titleSuffix")}</span>
                    </h1>
                    <p className="mx-auto max-w-xl text-base leading-relaxed text-gray-500 dark:text-gray-400">
                        {t("team.subtitle")}
                    </p>
                </div>
            </section>

            {/* Team Sections */}
            <section className="pb-20">
                <div className="mx-auto max-w-6xl space-y-16 px-6">
                    {/* Technical Team */}
                    <div>
                        <div className="mb-8 flex items-center gap-3 anim-fade-up" style={{ animationDelay: "100ms" }}>
                            <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
                                {t("team.technicalTeam")}
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-[#2a2d3a]" />
                        </div>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                            {techTeam.map((member, index) => (
                                <TeamCard key={member.id} member={member} index={index + 2} />
                            ))}
                        </div>
                    </div>

                    {/* Business Team */}
                    <div>
                        <div className="mb-8 flex items-center gap-3 anim-fade-up" style={{ animationDelay: "300ms" }}>
                            <h2 className="text-lg font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
                                {t("team.businessTeam")}
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-[#2a2d3a]" />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {businessTeam.map((member, index) => (
                                <TeamCard key={member.id} member={member} index={index + 4} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Project Highlights (Stats) */}
            <section className="border-t border-gray-100 bg-white/40 py-16 dark:border-[#2a2d3a] dark:bg-white/[0.02]">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        {PROJECT_STATS.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="text-center anim-fade-up"
                                style={{ animationDelay: `${(index + 6) * 100}ms` }}
                            >
                                <div className="mb-2 bg-gradient-to-br from-[#0FA697] to-[#AED911] bg-clip-text text-3xl font-black text-transparent md:text-4xl">
                                    {stat.value}
                                </div>
                                <div className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}