"use client";

import { useACRMStore } from "@/lib/store";
import { formatSlotTime } from "@/lib/carbon-intensity-api";

export default function ScheduledTasks() {
    const scheduledTasks = useACRMStore((s) => s.scheduledTasks);
    const cancelScheduled = useACRMStore((s) => s.cancelScheduled);
    const runScheduledNow = useACRMStore((s) => s.runScheduledNow);

    const activeTasks = scheduledTasks.filter((t) => t.status === "queued");
    const completedTasks = scheduledTasks.filter((t) => t.status === "completed" || t.status === "cancelled");

    if (scheduledTasks.length === 0) return null;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#141720] p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-base">⏰</span>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    Scheduled Tasks
                </h3>
                {activeTasks.length > 0 && (
                    <span className="rounded-full bg-[#0FA697]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0FA697]">
                        {activeTasks.length} queued
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {activeTasks.map((task) => (
                    <div
                        key={task.id}
                        className="rounded-lg border border-[#0FA697]/20 bg-[#0FA697]/5 p-2.5"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 dark:text-gray-200 truncate font-medium">
                                    {task.prompt}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">
                                        📅 {formatSlotTime(task.scheduledFor)}
                                    </span>
                                    {task.estimatedSaving > 0 && (
                                        <span className="text-[10px] text-emerald-400 font-semibold">
                                            ~{task.estimatedSaving}% carbon saved
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => runScheduledNow(task.id)}
                                    className="rounded-md bg-[#0FA697] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#0d8f83] transition-colors"
                                >
                                    Run Now
                                </button>
                                <button
                                    onClick={() => cancelScheduled(task.id)}
                                    className="rounded-md bg-gray-500/20 px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-500/30 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Completed/cancelled tasks (collapsed) */}
                {completedTasks.length > 0 && (
                    <div className="pt-1 border-t border-gray-200 dark:border-[#2a2d3a]">
                        <p className="text-[10px] text-gray-400 mb-1">Past tasks</p>
                        {completedTasks.slice(-3).map((task) => (
                            <div key={task.id} className="flex items-center gap-2 py-0.5">
                                <span className="text-[10px]">
                                    {task.status === "completed" ? "✅" : "❌"}
                                </span>
                                <span className="text-[10px] text-gray-500 truncate">
                                    {task.prompt}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
