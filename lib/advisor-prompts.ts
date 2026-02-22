import type {
    AdvisorDraftResult,
    AdvisorLanguageMode,
    AdvisorQAEntry,
    AdvisorSnapshot,
    AdvisorSupplementalInput,
} from "./advisor-types";

function redactModelIdentity(snapshot: AdvisorSnapshot): AdvisorSnapshot {
    return {
        ...snapshot,
        selectedModelId: "redacted",
        modelBreakdown: snapshot.modelBreakdown.map((item) => ({
            ...item,
            modelId: "redacted",
            modelName: "redacted",
        })),
        topCarbonMessages: snapshot.topCarbonMessages.map((item) => ({
            ...item,
            modelId: "redacted",
            modelName: "redacted",
        })),
    };
}

export function getAdvisorDisclaimer(languageMode: AdvisorLanguageMode): string {
    if (languageMode === "en") {
        return "Advisory support only. Not legal advice, assurance opinion, or certified report.";
    }
    return "Chi dung de tu van soan thao. Khong phai tu van phap ly, khong phai assurance opinion, khong phai bao cao duoc chung nhan.";
}

export function buildAdvisorSystemInstruction(
    languageMode: AdvisorLanguageMode
): string {
    const languageRule = languageMode === "en"
        ? "Write 100% in English."
        : "Write in Vietnamese, but keep international technical terms in English where relevant.";

    return [
        "You are ACRM ESG/MRV Advisor.",
        languageRule,
        "Use the provided dataset only; never fabricate measured values.",
        "Strictly include legal guardrail and uncertainty statements.",
        "Do not claim certification, verification, audit opinion, or legal compliance approval.",
        "Treat Scope 3 values as estimated unless explicit measured evidence is provided.",
        "Always include assumptions, data gaps, and evidence checklist.",
        "Use clear Markdown headings and bullet points.",
    ].join(" ");
}

export function buildAdvisorDraftPrompt(
    snapshot: AdvisorSnapshot,
    supplemental: AdvisorSupplementalInput,
    languageMode: AdvisorLanguageMode
): string {
    const disclaimer = getAdvisorDisclaimer(languageMode);
    const redactedSnapshot = redactModelIdentity(snapshot);

    return `
Create an ESG/MRV advisory draft from this dataset.

Mandatory constraints:
- Start with this exact disclaimer line:
${disclaimer}
- Include all sections exactly once, using these headings:
## Executive Summary (Advisory)
## MRV Data Inventory
## Scope 2 and Scope 3 Narrative
## Methodology and Assumptions
## Data Gaps and Required Evidence
## Next Actions
- Include confidence level (high/medium/low) with rationale.
- Do NOT present this as final legal report.
- Do NOT include model names, model IDs, or provider names in the final answer.

Dataset JSON:
\`\`\`json
${JSON.stringify(redactedSnapshot, null, 2)}
\`\`\`

Supplemental Input JSON:
\`\`\`json
${JSON.stringify(supplemental, null, 2)}
\`\`\`
`.trim();
}

export function buildAdvisorQAPrompt(
    snapshot: AdvisorSnapshot,
    supplemental: AdvisorSupplementalInput,
    draft: AdvisorDraftResult,
    qaHistory: AdvisorQAEntry[],
    question: string,
    languageMode: AdvisorLanguageMode
): string {
    const disclaimer = getAdvisorDisclaimer(languageMode);
    const redactedSnapshot = redactModelIdentity(snapshot);
    const history = qaHistory.slice(-8).map((entry) => ({
        role: entry.role,
        content: entry.content,
        timestamp: entry.timestamp,
    }));

    return `
Answer this follow-up question for ESG/MRV advisory support.

Mandatory constraints:
- Start with this exact disclaimer line:
${disclaimer}
- Base answer on supplied data and prior draft.
- Explicitly call out assumptions and missing evidence when needed.
- Avoid legal claims, certification claims, or assurance claims.
- Do NOT include model names, model IDs, or provider names in the final answer.

Current Draft (short):
\`\`\`markdown
${draft.fullText.slice(0, 4000)}
\`\`\`

Session Snapshot JSON:
\`\`\`json
${JSON.stringify(redactedSnapshot, null, 2)}
\`\`\`

Supplemental Input JSON:
\`\`\`json
${JSON.stringify(supplemental, null, 2)}
\`\`\`

Recent Q&A JSON:
\`\`\`json
${JSON.stringify(history, null, 2)}
\`\`\`

User question:
${question}
`.trim();
}
