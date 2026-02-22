// ============================================================
// ACRM — Gemini shared policy/types (client-safe)
// Server-side provider call lives in lib/server/gemini-provider.ts
// ============================================================

export type ResponseProfile = "concise" | "detailed" | "very_detailed";

export interface ResponsePolicy {
    profile: ResponseProfile;
    minWords?: number;
}

export interface ChatTurnContext {
    role: "user" | "assistant";
    content: string;
}

export interface GeminiRequest {
    prompt: string;
    apiModelId: string;
    history?: ChatTurnContext[];
    responseProfile?: ResponsePolicy;
    systemInstruction?: string;
}

export interface GeminiResponse {
    text: string;
    inputTokens: number;
    outputTokens: number;
    visibleOutputTokens: number;
    reasoningTokens: number;
    chargedOutputTokens: number;
}

const CONCISE_HINTS = [
    "ngắn",
    "ngan",
    "tóm tắt",
    "tom tat",
    "brief",
    "concise",
    "one sentence",
    "1 câu",
];

const DETAILED_HINTS = [
    "chi tiết",
    "chi tiet",
    "đầy đủ",
    "day du",
    "phân tích",
    "phan tich",
    "in-depth",
    "detailed",
    "full",
];

export function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractMinWords(prompt: string): number | undefined {
    const patterns = [
        /(?:tối thiểu|toi thieu|ít nhất|it nhat|minimum|min|at least)\s*(\d{2,4})\s*(?:từ|tu|words?)/i,
        /(\d{2,4})\s*(?:từ|tu|words?)\s*(?:trở lên|tro len|minimum|at least)?/i,
    ];

    for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (!match) continue;
        const parsed = Number.parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }

    return undefined;
}

export function deriveResponsePolicy(prompt: string): ResponsePolicy {
    const lower = prompt.toLowerCase();
    const minWords = extractMinWords(prompt);

    if (minWords && minWords >= 300) {
        return { profile: "very_detailed", minWords };
    }

    if (DETAILED_HINTS.some((hint) => lower.includes(hint))) {
        return { profile: "detailed", minWords };
    }

    if (CONCISE_HINTS.some((hint) => lower.includes(hint))) {
        return { profile: "concise", minWords };
    }

    if (countWords(prompt) <= 8) {
        return { profile: "concise", minWords };
    }

    return { profile: "detailed", minWords };
}
