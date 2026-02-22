import { AVAILABLE_MODELS } from "./carbon-constants";
import { countWords } from "./gemini-api";
import { callAIGenerate } from "./ai-api-client";
import {
    buildAdvisorDraftPrompt,
    buildAdvisorQAPrompt,
    buildAdvisorSystemInstruction,
    getAdvisorDisclaimer,
} from "./advisor-prompts";
import type {
    AdvisorAnswerResult,
    AdvisorDraftResult,
    AdvisorDraftSections,
    AdvisorLanguageMode,
    AdvisorQAEntry,
    AdvisorSnapshot,
    AdvisorSupplementalInput,
} from "./advisor-types";

function extractSection(text: string, heading: string, fallback = ""): string {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`##\\s+${escaped}\\s*([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
    const match = text.match(pattern);
    if (!match) return fallback;
    return match[1].trim();
}

function extractSections(fullText: string): AdvisorDraftSections {
    return {
        executiveSummary: extractSection(fullText, "Executive Summary (Advisory)"),
        mrvDataInventory: extractSection(fullText, "MRV Data Inventory"),
        scopeNarrative: extractSection(fullText, "Scope 2 and Scope 3 Narrative"),
        methodologyAndAssumptions: extractSection(fullText, "Methodology and Assumptions"),
        dataGapsAndEvidence: extractSection(fullText, "Data Gaps and Required Evidence"),
        nextActions: extractSection(fullText, "Next Actions"),
    };
}

function ensureDisclaimer(text: string, languageMode: AdvisorLanguageMode): string {
    const disclaimer = getAdvisorDisclaimer(languageMode);
    const trimmed = text.trim();
    if (trimmed.toLowerCase().startsWith(disclaimer.toLowerCase())) {
        return trimmed;
    }
    return `${disclaimer}\n\n${trimmed}`;
}

function sanitizeModelIdentity(text: string): string {
    const redacted = text
        .split("\n")
        .filter(
            (line) =>
                !/^\s*(Model ID|Model Name|Provider|Selected Model|Model)\s*:/i.test(
                    line
                )
        )
        .join("\n");

    return redacted.replace(/\n{3,}/g, "\n\n").trim();
}

function buildFallbackDraft(
    snapshot: AdvisorSnapshot,
    supplemental: AdvisorSupplementalInput,
    languageMode: AdvisorLanguageMode
): string {
    const isEn = languageMode === "en";
    const disclaimer = getAdvisorDisclaimer(languageMode);
    const period = supplemental.reportingPeriodStart && supplemental.reportingPeriodEnd
        ? `${supplemental.reportingPeriodStart} -> ${supplemental.reportingPeriodEnd}`
        : isEn ? "Not specified" : "Chua khai bao";
    const dataGapLines = snapshot.dataGaps.length > 0
        ? snapshot.dataGaps.map((g) => `- ${g}`).join("\n")
        : isEn ? "- No critical gaps detected from current form." : "- Chua phat hien khoang trong quan trong tu form hien tai.";

    return `${disclaimer}

## Executive Summary (Advisory)
${isEn
            ? `This advisory draft is based on operational AI usage data in ACRM. Current Scope 2 is ${snapshot.ghg.scope2} gCO2 and estimated Scope 3 is ${snapshot.ghg.scope3} gCO2.`
            : `Ban nhap tu van nay duoc tao tu du lieu van hanh AI trong ACRM. Scope 2 hien tai la ${snapshot.ghg.scope2} gCO2 va Scope 3 uoc tinh la ${snapshot.ghg.scope3} gCO2.`}

## MRV Data Inventory
- Reporting entity: ${supplemental.reportingEntity || (isEn ? "Not provided" : "Chua cung cap")}
- Reporting period: ${period}
- Region: ${snapshot.region.label}
- Carbon intensity: ${snapshot.region.ciValue} gCO2/kWh
- Total energy: ${snapshot.sessionStats.totalEnergyWh} Wh
- Total tokens: ${snapshot.sessionStats.totalTokens}

## Scope 2 and Scope 3 Narrative
${isEn
            ? "Scope 2 is derived from runtime electricity usage and regional carbon intensity. Scope 3 is estimated through training amortization and infrastructure overhead proxies."
            : "Scope 2 duoc suy ra tu dien nang van hanh va cuong do carbon khu vuc. Scope 3 la uoc tinh dua tren amortization chi phi huan luyen va he so ha tang."}

## Methodology and Assumptions
${snapshot.assumptions.map((a) => `- ${a}`).join("\n")}
- ${isEn ? "Confidence" : "Do tin cay"}: ${snapshot.confidence}
- ${isEn ? "Methodology standard" : "Chuan phuong phap"}: ${supplemental.methodologyStandard}

## Data Gaps and Required Evidence
${dataGapLines}

## Next Actions
- ${isEn ? "Validate organizational and operational boundaries with compliance owner." : "Xac nhan organizational boundary va operational boundary voi bo phan compliance."}
- ${isEn ? "Collect meter/source evidence for key assumptions." : "Thu thap bang chung nguon du lieu cho cac gia dinh chinh."}
- ${isEn ? "Review confidence level before external disclosure." : "Rao soat do tin cay truoc khi cong bo ben ngoai."}
`;
}

function buildFallbackAnswer(
    snapshot: AdvisorSnapshot,
    question: string,
    languageMode: AdvisorLanguageMode
): string {
    const isEn = languageMode === "en";
    const disclaimer = getAdvisorDisclaimer(languageMode);

    return `${disclaimer}

${isEn ? "Answer (advisory):" : "Tra loi (tu van):"}
${question}

${isEn
            ? `Based on current snapshot, Scope 2 is ${snapshot.ghg.scope2} gCO2 and estimated Scope 3 is ${snapshot.ghg.scope3} gCO2.`
            : `Theo snapshot hien tai, Scope 2 la ${snapshot.ghg.scope2} gCO2 va Scope 3 uoc tinh la ${snapshot.ghg.scope3} gCO2.`}

${isEn
            ? "Please validate assumptions and attach supporting evidence before using this in any official disclosure."
            : "Vui long xac thuc gia dinh va bo sung bang chung truoc khi dua vao bat ky cong bo chinh thuc nao."}
`;
}

function inferConfidenceFromSnapshot(
    snapshot: AdvisorSnapshot
): "high" | "medium" | "low" {
    return snapshot.confidence;
}

function buildDraftResult(
    text: string,
    snapshot: AdvisorSnapshot,
    modelId: string,
    languageMode: AdvisorLanguageMode
): AdvisorDraftResult {
    const fullText = ensureDisclaimer(sanitizeModelIdentity(text), languageMode);
    return {
        createdAt: Date.now(),
        languageMode,
        modelId,
        disclaimer: getAdvisorDisclaimer(languageMode),
        confidence: inferConfidenceFromSnapshot(snapshot),
        assumptions: snapshot.assumptions,
        dataGaps: snapshot.dataGaps,
        sections: extractSections(fullText),
        fullText,
    };
}

export async function generateAdvisorDraft(
    snapshot: AdvisorSnapshot,
    supplemental: AdvisorSupplementalInput,
    modelId: string,
    languageMode: AdvisorLanguageMode
): Promise<AdvisorDraftResult> {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);

    if (!model?.apiModelId) {
        const fallback = buildFallbackDraft(snapshot, supplemental, languageMode);
        return buildDraftResult(fallback, snapshot, modelId, languageMode);
    }

    const text = await callAIGenerate({
        prompt: buildAdvisorDraftPrompt(snapshot, supplemental, languageMode),
        apiModelId: model.apiModelId,
        responseProfile: { profile: "very_detailed", minWords: 500 },
        systemInstruction: buildAdvisorSystemInstruction(languageMode),
    });

    // Guardrail for unexpectedly short responses.
    const normalized = ensureDisclaimer(text.text, languageMode);
    if (countWords(normalized) < 180) {
        const fallback = buildFallbackDraft(snapshot, supplemental, languageMode);
        return buildDraftResult(fallback, snapshot, modelId, languageMode);
    }

    return buildDraftResult(normalized, snapshot, modelId, languageMode);
}

export async function askAdvisorQuestion(
    snapshot: AdvisorSnapshot,
    supplemental: AdvisorSupplementalInput,
    draft: AdvisorDraftResult,
    qaHistory: AdvisorQAEntry[],
    question: string,
    modelId: string,
    languageMode: AdvisorLanguageMode
): Promise<AdvisorAnswerResult> {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);

    if (!model?.apiModelId) {
        return {
            text: buildFallbackAnswer(snapshot, question, languageMode),
            confidence: "low",
            languageMode,
        };
    }

    const answer = await callAIGenerate({
        prompt: buildAdvisorQAPrompt(
            snapshot,
            supplemental,
            draft,
            qaHistory,
            question,
            languageMode
        ),
        apiModelId: model.apiModelId,
        responseProfile: { profile: "detailed" },
        systemInstruction: buildAdvisorSystemInstruction(languageMode),
    });

    return {
        text: ensureDisclaimer(sanitizeModelIdentity(answer.text), languageMode),
        confidence: snapshot.confidence,
        languageMode,
    };
}
