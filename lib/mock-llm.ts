// ============================================================
// Mock LLM Service
// Simulates streamed LLM response with realistic token counting.
// Will be replaced by real API calls when keys are provided.
// ============================================================

import { AVAILABLE_MODELS, type ModelInfo } from "./carbon-constants";

/** Approximate token count: ~4 characters ≈ 1 token (GPT tokenizer heuristic) */
export function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
}

/** Library of diverse mock responses keyed loosely by intent. */
const RESPONSE_POOL: string[] = [
    "That's a great question! Let me break it down for you. The key factors to consider are the underlying assumptions, the data quality, and the methodology used. Each of these plays a critical role in determining the accuracy of any analysis. For instance, when we talk about carbon emissions from AI inference, we need to account for the energy mix of the data center, the hardware efficiency, and the model architecture itself. Modern transformer models, particularly large ones like GPT-4, consume significantly more energy per inference than their smaller counterparts.",

    "Here's what I can tell you: The relationship between model size and energy consumption follows a roughly quadratic scaling law. As the number of parameters doubles, the computational cost (and hence energy use) can increase by 4-6x. This is why choosing the right model for the right task is not just a performance decision—it's an environmental one. Small models like GPT-3.5-Turbo can handle most routine tasks with a fraction of the carbon footprint.",

    "Let me explain this step by step. First, we need to understand the basics. The concept you're asking about is fundamental to how modern AI systems work. At its core, it involves processing information through layers of neural networks, each performing mathematical transformations on the input data. The output is then generated token by token, with each token requiring a forward pass through the entire network.",

    "Absolutely! I'd be happy to help with that. Based on the information you've provided, here's my analysis: The most efficient approach would be to start with a smaller model for initial exploration and only escalate to larger models when the task complexity demands it. This strategy, known as 'model cascading,' can reduce your overall carbon footprint by 60-80% without sacrificing output quality for most use cases.",

    "That's an interesting perspective. Let me provide some additional context. In the field of sustainable AI, researchers at institutions like Hugging Face and Allen AI have been working on frameworks to measure and reduce the environmental impact of machine learning. Their findings suggest that inference costs, while smaller per-query than training costs, can accumulate to significant emissions at scale due to the sheer volume of API calls made globally every day.",

    "Great question! The short answer is yes, but with some caveats. The technology has evolved rapidly, and what was true even a year ago may no longer apply. Current best practices recommend using purpose-built models optimized for specific tasks rather than relying on general-purpose large language models for everything. This approach not only improves accuracy but also dramatically reduces energy consumption.",

    "I understand your concern. Let me address it directly. The data shows that AI carbon emissions are growing, but so are the efficiency improvements. Modern hardware like NVIDIA's H100 GPUs are significantly more energy-efficient than their predecessors. Combined with improvements in model architecture (like mixture-of-experts), we're seeing energy per token decrease even as model capabilities increase.",

    "Here's a comprehensive overview of the topic. The intersection of AI and sustainability is one of the most important challenges of our time. On one hand, AI can help solve climate change through better climate modeling, energy grid optimization, and material discovery. On the other hand, the growing energy demands of AI data centers contribute to the very problem we're trying to solve. Finding the right balance requires tools like ACRM that make carbon costs visible and actionable.",
];

function pickResponse(prompt: string): string {
    // Deterministic selection based on prompt content
    const hash = prompt.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return RESPONSE_POOL[hash % RESPONSE_POOL.length];
}

export interface MockLLMResponse {
    text: string;
    inputTokens: number;
    outputTokens: number;
}

/**
 * Simulates an LLM response.  Returns the answer text together with the
 * (estimated) token counts so the Carbon Engine can run real calculations.
 */
export function generateMockResponse(
    prompt: string,
    modelId: string
): MockLLMResponse {
    const model: ModelInfo | undefined = AVAILABLE_MODELS.find(
        (m) => m.id === modelId
    );

    // Larger models tend to produce longer responses
    const baseResponse = pickResponse(prompt);
    let responseText: string;

    if (!model || model.modelClass === "small") {
        // Shorter, more concise
        responseText = baseResponse.split(". ").slice(0, 3).join(". ") + ".";
    } else if (model.modelClass === "medium") {
        responseText = baseResponse.split(". ").slice(0, 5).join(". ") + ".";
    } else {
        // large — full response
        responseText = baseResponse;
    }

    return {
        text: responseText,
        inputTokens: estimateTokens(prompt),
        outputTokens: estimateTokens(responseText),
    };
}
