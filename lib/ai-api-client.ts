import type { GeminiRequest, GeminiResponse } from "./gemini-api";

export async function callAIGenerate(request: GeminiRequest): Promise<GeminiResponse> {
    const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        let message = `AI request failed (${res.status})`;
        try {
            const data = await res.json();
            if (typeof data?.error === "string" && data.error.trim().length > 0) {
                message = data.error;
            }
        } catch {
            // Keep default error message.
        }
        throw new Error(message);
    }

    const data = await res.json();
    return data as GeminiResponse;
}
