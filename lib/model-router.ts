// ============================================================
// ACRM — Auto Model Router (2.1)
// Analyzes prompt complexity → suggests optimal model
// ============================================================

import { AVAILABLE_MODELS } from "./carbon-constants";

// ---- Complexity Keywords ----

const COMPLEX_KEYWORDS = [
    "analyze", "analyse", "compare", "evaluate", "critique",
    "write a full", "write an essay", "write a report",
    "debug this", "fix this code", "refactor",
    "step by step", "in detail", "detailed explanation",
    "pros and cons", "advantages and disadvantages",
    "explain the difference", "how does .* work",
    "implement", "design a system", "architecture",
    "research paper", "literature review",
];

const SIMPLE_KEYWORDS = [
    "what is", "what's", "who is", "who's",
    "define", "definition of",
    "translate", "convert",
    "yes or no", "true or false",
    "how old", "how many", "how much",
    "when was", "where is", "where's",
    "what year", "what date",
    "list", "name",
    "hello", "hi", "hey", "thanks", "thank you",
];

const MEDIUM_KEYWORDS = [
    "explain", "describe", "summarize", "summary",
    "how to", "how do i", "how can i",
    "give me", "show me", "tell me about",
    "example of", "examples",
    "why does", "why is",
];

// ---- Types ----

export interface RoutingResult {
    suggestedModelId: string;
    suggestedModelName: string;
    reason: string;
    confidence: "high" | "medium" | "low";
    carbonSaving: number;       // percentage saved vs current model
    complexityLevel: "simple" | "standard" | "complex";
    shouldSwitch: boolean;      // true if suggested differs from current
}

// ---- Complexity Analysis ----

function analyzeComplexity(prompt: string): "simple" | "standard" | "complex" {
    const lower = prompt.toLowerCase().trim();
    const tokenEstimate = Math.ceil(prompt.length / 4);

    // Check for code blocks → complex
    if (prompt.includes("```") || prompt.includes("function ") || prompt.includes("class ")) {
        return "complex";
    }

    // Very long prompts → complex
    if (tokenEstimate > 300) {
        return "complex";
    }

    // Check complex keywords
    const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) =>
        lower.includes(kw) || new RegExp(kw).test(lower)
    );
    if (hasComplexKeyword) {
        return "complex";
    }

    // Very short prompts → simple
    if (tokenEstimate < 30) {
        return "simple";
    }

    // Check simple keywords
    const hasSimpleKeyword = SIMPLE_KEYWORDS.some((kw) => lower.startsWith(kw) || lower.includes(kw));
    if (hasSimpleKeyword && tokenEstimate < 80) {
        return "simple";
    }

    // Check medium keywords
    const hasMediumKeyword = MEDIUM_KEYWORDS.some((kw) => lower.includes(kw));
    if (hasMediumKeyword) {
        return "standard";
    }

    // Default based on length
    if (tokenEstimate < 80) return "simple";
    if (tokenEstimate < 200) return "standard";
    return "complex";
}

// ---- Model Selection ----

// Preferred models for each complexity level (in order of preference)
// IDs MUST match AVAILABLE_MODELS in carbon-constants.ts
const PREFERRED_MODELS: Record<string, string[]> = {
    simple: ["gemini-flash", "gpt-3.5-turbo", "claude-haiku"],
    standard: ["gemini-flash", "gpt-4o-mini", "claude-haiku"],
    complex: ["gemini-pro", "gpt-4-turbo", "claude-opus", "gemini-flash"],
};

function findBestModel(complexity: "simple" | "standard" | "complex"): string {
    const preferred = PREFERRED_MODELS[complexity];
    for (const modelId of preferred) {
        if (AVAILABLE_MODELS.find((m) => m.id === modelId)) {
            return modelId;
        }
    }
    return "gemini-flash"; // fallback
}

// ---- Main Router ----

export function routePrompt(prompt: string, currentModelId: string): RoutingResult {
    const complexity = analyzeComplexity(prompt);
    const suggestedId = findBestModel(complexity);

    const currentModel = AVAILABLE_MODELS.find((m) => m.id === currentModelId);
    const suggestedModel = AVAILABLE_MODELS.find((m) => m.id === suggestedId);

    if (!currentModel || !suggestedModel) {
        return {
            suggestedModelId: currentModelId,
            suggestedModelName: currentModel?.name ?? "Unknown",
            reason: "",
            confidence: "low",
            carbonSaving: 0,
            complexityLevel: complexity,
            shouldSwitch: false,
        };
    }

    const shouldSwitch = suggestedId !== currentModelId;

    // Calculate carbon saving percentage
    let carbonSaving = 0;
    if (shouldSwitch && currentModel.jPerToken > 0 && suggestedModel.jPerToken > 0) {
        carbonSaving = Math.round(
            ((currentModel.jPerToken - suggestedModel.jPerToken) / currentModel.jPerToken) * 100
        );
    }

    // Only suggest switch if it actually saves carbon (positive saving)
    const worthSwitching = shouldSwitch && carbonSaving > 10;

    // Build reason
    let reason = "";
    if (worthSwitching) {
        if (complexity === "simple") {
            reason = `💡 Simple prompt — ${suggestedModel.name} handles well and saves ~${carbonSaving}% carbon compared to ${currentModel.name}.`;
        } else if (complexity === "standard") {
            reason = `💡 Medium prompt — ${suggestedModel.name} is a balanced choice, saving ~${carbonSaving}% carbon.`;
        }
    } else if (shouldSwitch && carbonSaving < 0) {
        // Current model is already more efficient but might lack capability
        if (complexity === "complex") {
            reason = `⚡ Complex prompt — ${suggestedModel.name} provides better quality for this task.`;
        }
    }

    // Confidence based on keyword match strength
    const lower = prompt.toLowerCase();
    const hasStrongSignal =
        COMPLEX_KEYWORDS.some((kw) => lower.includes(kw)) ||
        SIMPLE_KEYWORDS.some((kw) => lower.startsWith(kw));
    const confidence: "high" | "medium" | "low" = hasStrongSignal ? "high" : complexity === "standard" ? "medium" : "low";

    return {
        suggestedModelId: worthSwitching || (complexity === "complex" && carbonSaving < 0) ? suggestedId : currentModelId,
        suggestedModelName: worthSwitching || (complexity === "complex" && carbonSaving < 0) ? suggestedModel.name : currentModel.name,
        reason,
        confidence,
        carbonSaving: Math.max(0, carbonSaving),
        complexityLevel: complexity,
        shouldSwitch: worthSwitching || (complexity === "complex" && carbonSaving < 0),
    };
}
