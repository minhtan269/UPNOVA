"use client";

import Image from "next/image";
import { TeamMember } from "@/lib/team-data";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TeamCard({
    member,
    index,
}: {
    member: TeamMember;
    index: number;
}) {
    const { t } = useTranslation();
    const isTech = member.team === "tech";

    return (
        <div
            className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl dark:border-[#2a2d3a] dark:bg-[#1e212c]/60 anim-fade-up ${isTech ? "p-8" : "p-6"
                }`}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Top gradient bar */}
            <div
                className={`absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r ${member.gradient}`}
            />

            {/* Avatar & Header */}
            <div className={`mb-6 flex ${isTech ? "items-start gap-5" : "items-center gap-4"}`}>
                <div
                    className={`relative flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${isTech ? "h-20 w-20 text-2xl font-black" : "h-16 w-16 text-xl font-bold"
                        }`}
                >
                    {member.avatar ? (
                        <Image
                            src={member.avatar}
                            alt={`${member.name} ${t("team.avatarAlt")}`}
                            fill
                            sizes={isTech ? "80px" : "64px"}
                            className="object-cover"
                        />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center">
                            {member.initials}
                        </span>
                    )}
                </div>

                <div>
                    <h3 className={`${isTech ? "text-xl" : "text-lg"} mb-1 font-bold text-gray-900 dark:text-gray-100`}>
                        {member.name}
                    </h3>
                    <p className="mb-1 text-sm font-semibold text-[#0FA697]">
                        {member.role}
                    </p>
                </div>
            </div>

            {/* Bio */}
            <div className="mb-5 flex-grow">
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {member.bio}
                </p>
            </div>

            {/* Skills (business team only) */}
            {!isTech && (
                <div className="mb-5">
                    <div className="flex flex-wrap gap-1.5">
                        {member.skills.map((skill) => (
                            <span
                                key={skill}
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:bg-[#1a1d27] dark:text-gray-400 sm:text-xs"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Highlights */}
            {member.contributions && (
                <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {t("team.highlights")}
                    </h4>
                    <ul className="space-y-1.5">
                        {member.contributions.map((c) => (
                            <li
                                key={c}
                                className="flex items-start gap-2 border-l-2 border-[#0FA697]/20 pl-3 text-sm text-gray-600 dark:text-gray-400"
                            >
                                <span className="mt-0 text-[10px] text-[#0FA697]">&bull;</span>
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}