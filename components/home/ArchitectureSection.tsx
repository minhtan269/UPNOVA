"use client";

const LAYERS = [
    {
        number: "01",
        name: "Data Collection",
        desc: "Collects AI metadata: token count, model type, processing time.",
        color: "#0FA697",
        icon: "📡",
    },
    {
        number: "02",
        name: "Carbon Calculation",
        desc: "Calculates energy & CO₂ based on V2 formula (Model-specific J/token).",
        color: "#AED911",
        icon: "🧮",
    },
    {
        number: "03",
        name: "Optimization",
        desc: "Smart Routing suggests optimal models & Green Hours scheduling.",
        color: "#D9CD2B",
        icon: "⚡",
    },
    {
        number: "04",
        name: "Resilience Assessment",
        desc: "Evaluates 3 Resilience indexes for enterprise risk governance.",
        color: "#D91A1A",
        icon: "🛡️",
    },
];

export default function ArchitectureSection() {
    return (
        <section className="py-24 bg-white/40 dark:bg-white/[0.02]">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">
                        4-Layer Architecture
                    </h2>
                    <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                        Closed-loop data flow from collection to governance reporting.
                    </p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-[#0FA697]/20 via-[#D9CD2B]/20 to-[#D91A1A]/20 -translate-y-1/2 rounded-full" style={{ zIndex: 0 }} />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative" style={{ zIndex: 1 }}>
                        {LAYERS.map((layer, index) => (
                            <div key={layer.number} className="flex flex-col items-center">
                                {/* Card */}
                                <div className="group relative rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white dark:bg-[#1e212c] p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2 w-full">
                                    {/* Step Number Badge */}
                                    <div
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-4 ring-white dark:ring-[#13151d] transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: layer.color }}
                                    >
                                        {layer.number}
                                    </div>

                                    <div className="mt-4 text-center">
                                        <div className="text-3xl mb-3">{layer.icon}</div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                                            {layer.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {layer.desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Arrow BETWEEN cards (Mobile only) */}
                                {index < LAYERS.length - 1 && (
                                    <div className="md:hidden flex justify-center py-3 text-gray-300 dark:text-gray-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
