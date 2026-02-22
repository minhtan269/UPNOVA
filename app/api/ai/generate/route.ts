import { NextRequest, NextResponse } from "next/server";

import { AVAILABLE_MODELS } from "@/lib/carbon-constants";
import type { ChatTurnContext, GeminiRequest, ResponsePolicy } from "@/lib/gemini-api";
import { callGeminiProvider } from "@/lib/server/gemini-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT_CHARS = 12_000;
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_TURN_CHARS = 4_000;
const MAX_MIN_WORDS = 4_000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const requestBuckets = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: NextRequest): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const first = forwardedFor.split(",")[0]?.trim();
        if (first) return first;
    }

    const realIp = req.headers.get("x-real-ip");
    return realIp?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const existing = requestBuckets.get(ip);

    if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
        requestBuckets.set(ip, { count: 1, windowStart: now });
        return false;
    }

    if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    existing.count += 1;
    requestBuckets.set(ip, existing);

    return false;
}

function cleanupBuckets(): void {
    const now = Date.now();
    for (const [ip, bucket] of requestBuckets.entries()) {
        if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS * 3) {
            requestBuckets.delete(ip);
        }
    }
}

function normalizePolicy(input: unknown): ResponsePolicy | undefined {
    if (!input || typeof input !== "object") return undefined;
    const raw = input as Partial<ResponsePolicy>;
    if (
        raw.profile !== "concise" &&
        raw.profile !== "detailed" &&
        raw.profile !== "very_detailed"
    ) {
        return undefined;
    }

    let minWords: number | undefined;
    if (typeof raw.minWords === "number" && Number.isFinite(raw.minWords) && raw.minWords > 0) {
        minWords = Math.min(Math.floor(raw.minWords), MAX_MIN_WORDS);
    }

    return {
        profile: raw.profile,
        minWords,
    };
}

function normalizeHistory(input: unknown): ChatTurnContext[] {
    if (!Array.isArray(input)) return [];

    return input
        .slice(-MAX_HISTORY_TURNS)
        .filter((turn): turn is Record<string, unknown> => !!turn && typeof turn === "object")
        .map((turn) => {
            const role: ChatTurnContext["role"] = turn.role === "assistant" ? "assistant" : "user";
            const content =
                typeof turn.content === "string"
                    ? turn.content.slice(0, MAX_HISTORY_TURN_CHARS)
                    : "";

            return { role, content };
        })
        .filter((turn) => turn.content.trim().length > 0);
}

function isValidApiModelId(apiModelId: string): boolean {
    const validApiModelIds = AVAILABLE_MODELS
        .map((model) => model.apiModelId)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

    return validApiModelIds.includes(apiModelId);
}

function badRequest(message: string): NextResponse {
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    cleanupBuckets();

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: "Rate limit exceeded. Please try again in a minute." },
            { status: 429 }
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return badRequest("Invalid JSON payload.");
    }

    if (!body || typeof body !== "object") {
        return badRequest("Invalid request body.");
    }

    const raw = body as Partial<GeminiRequest>;
    const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
    const apiModelId = typeof raw.apiModelId === "string" ? raw.apiModelId.trim() : "";
    const systemInstruction =
        typeof raw.systemInstruction === "string" ? raw.systemInstruction.trim() : undefined;

    if (!prompt) {
        return badRequest("Prompt is required.");
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
        return badRequest(`Prompt exceeds ${MAX_PROMPT_CHARS} characters.`);
    }
    if (!apiModelId) {
        return badRequest("apiModelId is required.");
    }
    if (!isValidApiModelId(apiModelId)) {
        return badRequest("Unsupported apiModelId.");
    }

    const requestPayload: GeminiRequest = {
        prompt,
        apiModelId,
        history: normalizeHistory(raw.history),
        responseProfile: normalizePolicy(raw.responseProfile),
        systemInstruction,
    };

    try {
        const response = await callGeminiProvider(requestPayload);
        return NextResponse.json(response);
    } catch (error) {
        const message = error instanceof Error ? error.message : "AI generation failed.";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
