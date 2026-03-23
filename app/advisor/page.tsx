"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIResponseRenderer from "@/components/markdown/AIResponseRenderer";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useACRMStore } from "@/lib/store";
import {
    AVAILABLE_MODELS,
    AVAILABLE_REGIONS,
} from "@/lib/carbon-constants";
import {
    buildAdvisorSnapshot,
    normalizeAdvisorSupplementalInput,
} from "@/lib/advisor-data";
import type { AdvisorDraftResult, AdvisorSupplementalInput } from "@/lib/advisor-types";

type TabKey = "draft" | "qa";

type SupplementalKey = keyof AdvisorSupplementalInput;
type DraftSectionKey = keyof AdvisorDraftResult["sections"];

const DRAFT_SECTIONS: DraftSectionKey[] = [
    "executiveSummary",
    "mrvDataInventory",
    "scopeNarrative",
    "methodologyAndAssumptions",
    "dataGapsAndEvidence",
    "nextActions",
];

function HelpTip({ text }: { text: string }) {
    return (
        <span className="relative inline-flex items-center">
            <span
                role="button"
                tabIndex={0}
                title={text}
                aria-label={text}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 dark:border-[#3a3d4a] text-[10px] font-bold text-gray-500 dark:text-gray-400 cursor-help select-none"
            >
                ?
            </span>
        </span>
    );
}

function FieldLabel({
    children,
    help,
}: {
    children: string;
    help?: string;
}) {
    return (
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 inline-flex items-center">
            <span>{children}</span>
            {help ? <HelpTip text={help} /> : null}
        </label>
    );
}

function InputClassName() {
    return "mt-1 w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:border-[#0FA697] focus:outline-none";
}

export default function AdvisorPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabKey>("draft");
    const [question, setQuestion] = useState("");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const messages = useACRMStore((s) => s.messages);
    const sessionStats = useACRMStore((s) => s.sessionStats);
    const selectedModelId = useACRMStore((s) => s.selectedModelId);
    const selectedRegion = useACRMStore((s) => s.selectedRegion);
    const liveCarbonIntensity = useACRMStore((s) => s.liveCarbonIntensity);
    const isCILive = useACRMStore((s) => s.isCILive);
    const ciSource = useACRMStore((s) => s.ciSource);
    const ciFactorType = useACRMStore((s) => s.ciFactorType);
    const ciZoneLabel = useACRMStore((s) => s.ciZoneLabel);
    const ciIsRepresentativeZone = useACRMStore((s) => s.ciIsRepresentativeZone);
    const resilienceHistory = useACRMStore((s) => s.resilienceHistory);
    const sessionStartTime = useACRMStore((s) => s.sessionStartTime);
    const carbonBudget = useACRMStore((s) => s.carbonBudget);

    const advisorSupplementalInput = useACRMStore((s) => s.advisorSupplementalInput);
    const advisorDraft = useACRMStore((s) => s.advisorDraft);
    const advisorQAHistory = useACRMStore((s) => s.advisorQAHistory);
    const advisorIsGeneratingDraft = useACRMStore((s) => s.advisorIsGeneratingDraft);
    const advisorIsAsking = useACRMStore((s) => s.advisorIsAsking);
    const advisorError = useACRMStore((s) => s.advisorError);

    const setAdvisorInput = useACRMStore((s) => s.setAdvisorInput);
    const generateAdvisorDraft = useACRMStore((s) => s.generateAdvisorDraft);
    const askAdvisor = useACRMStore((s) => s.askAdvisor);
    const clearAdvisor = useACRMStore((s) => s.clearAdvisor);

    const assistantMessageCount = useMemo(
        () => messages.filter((m) => m.role === "assistant").length,
        [messages]
    );
    const hasSessionData = assistantMessageCount > 0;

    const snapshot = useMemo(() => {
        if (!hasSessionData) return null;

        return buildAdvisorSnapshot(
            {
                messages,
                sessionStats,
                selectedModelId,
                selectedRegion,
                liveCarbonIntensity,
                isCILive,
                ciSource,
                ciFactorType,
                ciZoneLabel,
                ciIsRepresentativeZone,
                resilienceHistory,
                sessionStartTime,
                carbonBudget,
            },
            normalizeAdvisorSupplementalInput(advisorSupplementalInput)
        );
    }, [
        hasSessionData,
        messages,
        sessionStats,
        selectedModelId,
        selectedRegion,
        liveCarbonIntensity,
        isCILive,
        ciSource,
        ciFactorType,
        ciZoneLabel,
        ciIsRepresentativeZone,
        resilienceHistory,
        sessionStartTime,
        carbonBudget,
        advisorSupplementalInput,
    ]);

    const selectedModelName = useMemo(() => {
        return AVAILABLE_MODELS.find((m) => m.id === selectedModelId)?.name ?? selectedModelId;
    }, [selectedModelId]);

    const regionLabel = useMemo(() => {
        return AVAILABLE_REGIONS.find((r) => r.id === selectedRegion)?.label ?? selectedRegion;
    }, [selectedRegion]);

    const periodLabel =
        advisorSupplementalInput.reportingPeriodStart && advisorSupplementalInput.reportingPeriodEnd
            ? `${advisorSupplementalInput.reportingPeriodStart} -> ${advisorSupplementalInput.reportingPeriodEnd}`
            : t("advisor.periodNotSet");

    const inputClass = InputClassName();

    const handleChange = (key: SupplementalKey, value: string) => {
        setAdvisorInput({ [key]: value } as Partial<AdvisorSupplementalInput>);
    };

    const copyText = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch {
            setCopiedKey(null);
        }
    };

    const handleAsk = async () => {
        const trimmed = question.trim();
        if (!trimmed || advisorIsAsking) return;

        setQuestion("");
        await askAdvisor(trimmed);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Navbar />

            <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100">
                        {t("advisor.title")}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
                        {t("advisor.subtitle")}
                    </p>
                </div>

                <div className="mb-5 rounded-xl border border-amber-300/50 bg-amber-100/60 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    {t("advisor.disclaimer")}
                </div>

                {!hasSessionData ? (
                    <div className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/70 dark:bg-[#1e212c]/70 p-8 text-center">
                        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">
                            {t("advisor.noDataTitle")}
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t("advisor.noDataMessage")}
                        </p>
                        <Link
                            href="/chat"
                            className="inline-flex mt-4 rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-4 py-2 text-sm font-bold text-white shadow-sm"
                        >
                            {t("advisor.goToChat")}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveTab("draft")}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                    activeTab === "draft"
                                        ? "bg-[#0FA697] text-white"
                                        : "bg-white/80 dark:bg-[#1a1d27] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3a]"
                                }`}
                            >
                                {t("advisor.tabDraft")}
                            </button>
                            <button
                                onClick={() => setActiveTab("qa")}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                    activeTab === "qa"
                                        ? "bg-[#0FA697] text-white"
                                        : "bg-white/80 dark:bg-[#1a1d27] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3a]"
                                }`}
                            >
                                {t("advisor.tabQA")}
                            </button>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
                            <section className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/70 dark:bg-[#1e212c]/70 p-4 space-y-4">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                        {t("advisor.snapshotTitle")}
                                    </h2>
                                    {snapshot && (
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2">
                                                <div className="text-gray-400">{t("advisor.snapshot.scope2")}</div>
                                                <div className="font-bold text-gray-700 dark:text-gray-200">
                                                    {snapshot.ghg.scope2.toFixed(4)} g
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2">
                                                <div className="text-gray-400">{t("advisor.snapshot.totalGhg")}</div>
                                                <div className="font-bold text-gray-700 dark:text-gray-200">
                                                    {snapshot.ghg.totalGHG.toFixed(4)} g
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2">
                                                <div className="text-gray-400">{t("advisor.snapshot.energy")}</div>
                                                <div className="font-bold text-gray-700 dark:text-gray-200">
                                                    {snapshot.sessionStats.totalEnergyWh.toFixed(4)} Wh
                                                </div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 dark:bg-[#1a1d27] p-2">
                                                <div className="text-gray-400">{t("advisor.snapshot.tokens")}</div>
                                                <div className="font-bold text-gray-700 dark:text-gray-200">
                                                    {snapshot.sessionStats.totalTokens}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div>{t("advisor.labels.model")}: <span className="font-semibold">{selectedModelName}</span></div>
                                        <div>{t("advisor.labels.region")}: <span className="font-semibold">{regionLabel}</span></div>
                                        <div>{t("advisor.labels.period")}: <span className="font-semibold">{periodLabel}</span></div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
                                        {t("advisor.supplementalTitle")}
                                    </h3>
                                    <div className="space-y-2">
                                        <div>
                                            <FieldLabel help={t("advisor.help.reportingEntity")}>
                                                {t("advisor.fields.reportingEntity")}
                                            </FieldLabel>
                                            <input
                                                className={inputClass}
                                                value={advisorSupplementalInput.reportingEntity}
                                                onChange={(e) => handleChange("reportingEntity", e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <FieldLabel help={t("advisor.help.periodStart")}>
                                                    {t("advisor.fields.periodStart")}
                                                </FieldLabel>
                                                <input
                                                    type="date"
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.reportingPeriodStart}
                                                    onChange={(e) => handleChange("reportingPeriodStart", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel help={t("advisor.help.periodEnd")}>
                                                    {t("advisor.fields.periodEnd")}
                                                </FieldLabel>
                                                <input
                                                    type="date"
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.reportingPeriodEnd}
                                                    onChange={(e) => handleChange("reportingPeriodEnd", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <FieldLabel help={t("advisor.help.organizationalBoundary")}>
                                                {t("advisor.fields.organizationalBoundary")}
                                            </FieldLabel>
                                            <input
                                                className={inputClass}
                                                value={advisorSupplementalInput.organizationalBoundary}
                                                onChange={(e) => handleChange("organizationalBoundary", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel help={t("advisor.help.operationalBoundary")}>
                                                {t("advisor.fields.operationalBoundary")}
                                            </FieldLabel>
                                            <input
                                                className={inputClass}
                                                value={advisorSupplementalInput.operationalBoundary}
                                                onChange={(e) => handleChange("operationalBoundary", e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <FieldLabel help={t("advisor.help.methodologyStandard")}>
                                                {t("advisor.fields.methodologyStandard")}
                                            </FieldLabel>
                                            <input
                                                className={inputClass}
                                                value={advisorSupplementalInput.methodologyStandard}
                                                onChange={(e) => handleChange("methodologyStandard", e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <FieldLabel help={t("advisor.help.inventoryApproach")}>
                                                    {t("advisor.fields.inventoryApproach")}
                                                </FieldLabel>
                                                <select
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.inventoryApproach}
                                                    onChange={(e) => handleChange("inventoryApproach", e.target.value)}
                                                >
                                                    <option value="location-based">{t("advisor.inventoryApproach.locationBased")}</option>
                                                    <option value="market-based">{t("advisor.inventoryApproach.marketBased")}</option>
                                                    <option value="unknown">{t("advisor.inventoryApproach.unknown")}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <FieldLabel help={t("advisor.help.dataQuality")}>
                                                    {t("advisor.fields.dataQuality")}
                                                </FieldLabel>
                                                <select
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.dataQualityLevel}
                                                    onChange={(e) => handleChange("dataQualityLevel", e.target.value)}
                                                >
                                                    <option value="high">{t("advisor.dataQuality.high")}</option>
                                                    <option value="medium">{t("advisor.dataQuality.medium")}</option>
                                                    <option value="low">{t("advisor.dataQuality.low")}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <FieldLabel help={t("advisor.help.baseYear")}>
                                                    {t("advisor.fields.baseYear")}
                                                </FieldLabel>
                                                <input
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.baseYear}
                                                    onChange={(e) => handleChange("baseYear", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel help={t("advisor.help.ownerReviewer")}>
                                                    {t("advisor.fields.ownerReviewer")}
                                                </FieldLabel>
                                                <input
                                                    className={inputClass}
                                                    value={advisorSupplementalInput.reportOwnerOrReviewer}
                                                    onChange={(e) => handleChange("reportOwnerOrReviewer", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => generateAdvisorDraft()}
                                        disabled={advisorIsGeneratingDraft}
                                        className="w-full rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {advisorIsGeneratingDraft ? t("advisor.generating") : t("advisor.generateDraft")}
                                    </button>

                                    <button
                                        onClick={clearAdvisor}
                                        className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400"
                                    >
                                        {t("advisor.clearData")}
                                    </button>
                                </div>

                                {advisorError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                                        {advisorError}
                                    </div>
                                )}
                            </section>

                            <section className="rounded-2xl border border-gray-100 dark:border-[#2a2d3a] bg-white/70 dark:bg-[#1e212c]/70 p-4">
                                {activeTab === "draft" ? (
                                    <>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <h2 className="text-base font-bold text-gray-700 dark:text-gray-200">
                                                {t("advisor.draftTitle")}
                                            </h2>
                                            {advisorDraft && (
                                                <button
                                                    onClick={() => copyText(advisorDraft.fullText, "full")}
                                                    className="rounded-lg border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400"
                                                >
                                                    {copiedKey === "full" ? t("advisor.copied") : t("advisor.copyFull")}
                                                </button>
                                            )}
                                        </div>

                                        {advisorDraft ? (
                                            <div className="space-y-3">
                                                {DRAFT_SECTIONS.map((sectionKey) => {
                                                    const content = advisorDraft.sections[sectionKey] || "";
                                                    return (
                                                        <div
                                                            key={sectionKey}
                                                            className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]/80 p-3"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                                    {t(`advisor.sections.${sectionKey}`)}
                                                                </h3>
                                                                <button
                                                                    onClick={() => copyText(content, sectionKey)}
                                                                    className="rounded-md bg-[#0FA697]/10 px-2 py-1 text-[11px] font-semibold text-[#0FA697]"
                                                                >
                                                                    {copiedKey === sectionKey ? t("advisor.copied") : t("advisor.copy")}
                                                                </button>
                                                            </div>
                                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                                <AIResponseRenderer content={content || t("advisor.sectionEmpty")} variant="compare" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="h-full min-h-[260px] flex items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500">
                                                {t("advisor.draftEmpty")}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="rounded-full bg-[#0FA697]/10 px-2 py-1 font-semibold text-[#0FA697]">
                                                {t("advisor.labels.region")}: {regionLabel}
                                            </span>
                                            <span className="rounded-full bg-gray-100 dark:bg-[#1a1d27] px-2 py-1 text-gray-500 dark:text-gray-400">
                                                {t("advisor.labels.scopeMode")}: {advisorSupplementalInput.inventoryApproach}
                                            </span>
                                            <span className="rounded-full bg-gray-100 dark:bg-[#1a1d27] px-2 py-1 text-gray-500 dark:text-gray-400">
                                                {periodLabel}
                                            </span>
                                        </div>

                                        {!advisorDraft ? (
                                            <div className="rounded-xl border border-dashed border-gray-200 dark:border-[#2a2d3a] p-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                                {t("advisor.qaEmpty")}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]/80 p-3 max-h-[420px] overflow-y-auto custom-scrollbar space-y-3">
                                                    {advisorQAHistory.length === 0 && (
                                                        <div className="text-sm text-gray-400 dark:text-gray-500">
                                                            {t("advisor.qaHint")}
                                                        </div>
                                                    )}

                                                    {advisorQAHistory.map((entry) => (
                                                        <div key={entry.id} className="space-y-1">
                                                            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                                {entry.role === "user" ? t("advisor.qa.you") : t("advisor.qa.advisor")}
                                                            </div>
                                                            <div
                                                                className={`rounded-xl px-3 py-2 text-sm ${
                                                                    entry.role === "user"
                                                                        ? "bg-[#0FA697]/10 text-gray-700 dark:text-gray-200"
                                                                        : "bg-gray-50 dark:bg-[#121620] text-gray-700 dark:text-gray-200"
                                                                }`}
                                                            >
                                                                {entry.role === "assistant" ? (
                                                                    <AIResponseRenderer content={entry.content} variant="compare" />
                                                                ) : (
                                                                    <p className="whitespace-pre-wrap">{entry.content}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="rounded-xl border border-gray-100 dark:border-[#2a2d3a] bg-white/80 dark:bg-[#1a1d27]/80 p-3">
                                                    <textarea
                                                        value={question}
                                                        onChange={(e) => setQuestion(e.target.value)}
                                                        rows={3}
                                                        placeholder={t("advisor.qaPlaceholder")}
                                                        className="w-full rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#121620] px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:border-[#0FA697] focus:outline-none resize-none"
                                                    />
                                                    <div className="mt-2 flex justify-end">
                                                        <button
                                                            onClick={handleAsk}
                                                            disabled={!question.trim() || advisorIsAsking}
                                                            className="rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {advisorIsAsking ? t("advisor.thinking") : t("advisor.askAdvisor")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}