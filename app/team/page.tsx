import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeamCard from "@/components/team/TeamCard";
import { TEAM_MEMBERS, PROJECT_STATS } from "@/lib/team-data";

export const metadata: Metadata = {
    title: "Team - ACRM",
    description: "Meet the ACRM development team behind AI Carbon-Resilience Management.",
};

export default function TeamPage() {
    const techTeam = TEAM_MEMBERS.filter((m) => m.team === "tech");
    const businessTeam = TEAM_MEMBERS.filter((m) => m.team === "business");

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Navbar />

            {/* Hero */}
            <section className="relative overflow-hidden py-20">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-10 right-20 h-64 w-64 rounded-full bg-[#0FA697]/10 blur-3xl anim-fade-up" />
                    <div
                        className="absolute bottom-10 left-10 h-80 w-80 rounded-full bg-[#AED911]/10 blur-3xl anim-fade-up"
                        style={{ animationDelay: "200ms" }}
                    />
                </div>

                <div className="mx-auto max-w-7xl px-6 text-center anim-fade-up">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#0FA697]/20 bg-[#0FA697]/5 px-4 py-1.5 text-sm font-semibold text-[#0FA697] mb-6">
                        Our Team
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
                        ACRM <span className="bg-gradient-to-r from-[#0FA697] to-[#AED911] bg-clip-text text-transparent">Team</span>
                    </h1>
                    <p className="mx-auto max-w-xl text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                        A five-member team passionate about technology and sustainability,
                        building practical solutions to measure AI carbon footprint.
                    </p>
                </div>
            </section>

            {/* Team Sections */}
            <section className="pb-20">
                <div className="mx-auto max-w-6xl px-6 space-y-16">
                    {/* Technical Team */}
                    <div>
                        <div className="flex items-center gap-3 mb-8 anim-fade-up" style={{ animationDelay: "100ms" }}>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                                Technical Team
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-[#2a2d3a]" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {techTeam.map((member, index) => (
                                <TeamCard key={member.id} member={member} index={index + 2} />
                            ))}
                        </div>
                    </div>

                    {/* Business Team */}
                    <div>
                        <div className="flex items-center gap-3 mb-8 anim-fade-up" style={{ animationDelay: "300ms" }}>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                                Business Team
                            </h2>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-[#2a2d3a]" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {businessTeam.map((member, index) => (
                                <TeamCard key={member.id} member={member} index={index + 4} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Project Highlights (Stats) */}
            <section className="py-16 bg-white/40 dark:bg-white/[0.02] border-t border-gray-100 dark:border-[#2a2d3a]">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {PROJECT_STATS.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="text-center anim-fade-up"
                                style={{ animationDelay: `${(index + 6) * 100}ms` }}
                            >
                                <div className="text-3xl md:text-4xl font-black bg-gradient-to-br from-[#0FA697] to-[#AED911] bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
