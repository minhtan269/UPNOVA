import "server-only";

import type { GeminiRequest, GeminiResponse } from "@/lib/gemini-api";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_SYSTEM_INSTRUCTION =
    "You are an AI assistant inside the ACRM (AI Carbon-Resilience Management) platform. " +
    "You are knowledgeable about AI sustainability, carbon emissions, energy efficiency, and environmental impact of machine learning. " +
    "Use clear, accurate Markdown. For math, use only $...$ (inline) or $$...$$ (block). " +
    "Do not output unmatched * or $ symbols, and do not escape math delimiters unless the symbol is literal text. " +
    "Match response depth and length to the user's request.";

function getGenerationConfig(policy: GeminiRequest["responseProfile"]): {
    maxOutputTokens: number;
    temperature: number;
} {
    if (policy?.profile === "very_detailed") {
        return { maxOutputTokens: 1600, temperature: 0.7 };
    }

    if (policy?.profile === "concise") {
        return { maxOutputTokens: 320, temperature: 0.6 };
    }

    return { maxOutputTokens: 900, temperature: 0.7 };
}

function buildPolicyInstruction(policy: GeminiRequest["responseProfile"]): string {
    if (policy?.minWords && policy.minWords > 0) {
        return `Length policy: provide at least ${policy.minWords} words unless user asks to stop.`;
    }

    if (policy?.profile === "very_detailed") {
        return "Length policy: provide a very detailed, structured response with concrete examples.";
    }

    if (policy?.profile === "concise") {
        return "Length policy: keep the answer concise and direct.";
    }

    return "Length policy: provide a detailed but focused response.";
}

export async function callGeminiProvider(request: GeminiRequest): Promise<GeminiResponse> {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const policy = request.responseProfile ?? { profile: "detailed" as const };
    const generationConfig = getGenerationConfig(policy);
    const effectiveSystemInstruction = request.systemInstruction?.trim().length
        ? request.systemInstruction
        : DEFAULT_SYSTEM_INSTRUCTION;

    const normalizedHistory = (request.history ?? [])
        .filter((turn) => turn.content.trim().length > 0)
        .map((turn) => ({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
        }));

    const body = {
        system_instruction: {
            parts: [{ text: `${effectiveSystemInstruction} ${buildPolicyInstruction(policy)}` }],
        },
        contents: [
            ...normalizedHistory,
            {
                role: "user",
                parts: [{ text: request.prompt }],
            },
        ],
        generationConfig,
    };

    const url = `${BASE_URL}/${request.apiModelId}:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 1000)}`);
        }

        const data = await res.json();
        const text: string =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ??
            "Sorry, I could not generate a response.";

        const usage = data?.usageMetadata ?? {};
        const inputTokens: number = usage.promptTokenCount ?? 0;
        const visibleOutputTokens: number = usage.candidatesTokenCount ?? 0;
        const reasoningTokens: number = usage.thoughtsTokenCount ?? 0;
        const chargedOutputTokens: number = visibleOutputTokens + reasoningTokens;

        return {
            text,
            inputTokens,
            outputTokens: chargedOutputTokens,
            visibleOutputTokens,
            reasoningTokens,
            chargedOutputTokens,
        };
    } finally {
        clearTimeout(timeout);
    }
}
