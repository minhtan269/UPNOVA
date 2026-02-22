"use client";

import Image from "next/image";
import { TeamMember } from "@/lib/team-data";

export default function TeamCard({
    member,
    index,
}: {
    member: TeamMember;
    index: number;
}) {
    const isTech = member.team === "tech";

    return (
        <div
            className={`group relative rounded-3xl border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1e212c]/60 shadow-sm backdrop-blur-sm transition-all hover:shadow-2xl hover:-translate-y-2 overflow-hidden anim-fade-up flex flex-col h-full ${isTech ? "p-8" : "p-6"
                }`}
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Top gradient bar */}
            <div
                className={`absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r ${member.gradient}`}
            />

            {/* Avatar & Header */}
            <div className={`flex ${isTech ? "items-start gap-5" : "items-center gap-4"} mb-6`}>
                <div
                    className={`relative flex-shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br ${member.gradient} text-white shadow-lg transition-transform group-hover:scale-110 overflow-hidden ${isTech ? "h-20 w-20 text-2xl font-black" : "h-16 w-16 text-xl font-bold"
                        }`}
                >
                    {member.avatar ? (
                        <Image
                            src={member.avatar}
                            alt={`${member.name} avatar`}
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
                    <h3 className={`${isTech ? "text-xl" : "text-lg"} font-bold text-gray-900 dark:text-gray-100 mb-1`}>
                        {member.name}
                    </h3>
                    <p className="text-sm font-semibold text-[#0FA697] mb-1">
                        {member.role}
                    </p>
                </div>
            </div>

            {/* Bio */}
            <div className="mb-5 flex-grow">
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
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
                                className="rounded-full bg-gray-100 dark:bg-[#1a1d27] px-2.5 py-1 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400"
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
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                        Highlights
                    </h4>
                    <ul className="space-y-1.5">
                        {member.contributions.map((c) => (
                            <li
                                key={c}
                                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-[#0FA697]/20"
                            >
                                <span className="mt-0 text-[#0FA697] text-[10px]">&bull;</span>
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
