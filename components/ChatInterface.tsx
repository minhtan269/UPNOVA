"use client";

import { useState, useRef, useEffect } from "react";
import { useACRMStore, type ChatMessage } from "@/lib/store";
import { AVAILABLE_MODELS } from "@/lib/carbon-constants";
import CarbonTag from "./CarbonTag";
import AIResponseRenderer from "./markdown/AIResponseRenderer";

// ---- Single message bubble ----
function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === "user";
    const model = AVAILABLE_MODELS.find((m) => m.id === msg.modelId);
    const visibleOutputTokens = msg.metrics.visibleOutputTokens ?? msg.metrics.outputTokens;
    const reasoningTokens = msg.metrics.reasoningTokens ?? 0;
    const billedOutputTokens = msg.metrics.billedOutputTokens ?? msg.metrics.outputTokens;
    const confidence = msg.metrics.meta?.confidence ?? "low";
    const showTokenBreakdown = !isUser && (reasoningTokens > 0 || billedOutputTokens !== visibleOutputTokens);

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
            <div className={`max-w-[75%] ${isUser ? "order-2" : "order-1"}`}>
                {/* Header */}
                <div
                    className={`mb-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${isUser ? "justify-end" : "justify-start"
                        }`}
                >
                    {isUser ? (
                        <span className="font-medium">You</span>
                    ) : (
                        <>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA697] to-[#AED911] text-[10px] font-bold text-white">
                                AI
                            </span>
                            <span className="font-medium">{model?.name ?? "AI"}</span>
                        </>
                    )}
                </div>

                {/* Bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser
                        ? "bg-gradient-to-br from-[#0FA697] to-[#0FA697]/80 text-white rounded-br-md"
                        : "bg-white/90 dark:bg-[#1e212c]/80 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-[#2a2d3a] rounded-bl-md"
                        }`}
                >
                    {isUser ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : (
                        <AIResponseRenderer content={msg.content} variant="chat" />
                    )}
                </div>

                {/* Carbon Tag */}
                <div className={`mt-1 ${isUser ? "text-right" : "text-left"}`}>
                    <CarbonTag
                        totalTokens={msg.metrics.totalTokens}
                        energyWh={msg.metrics.energyWh}
                        co2Grams={msg.metrics.co2Grams}
                        level={msg.metrics.level}
                        showCarbon={msg.metrics.showCarbon}
                    />
                </div>
                {showTokenBreakdown && (
                    <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                        Visible: {visibleOutputTokens} | Thinking: {reasoningTokens} | Total billed: {billedOutputTokens} | Confidence: {confidence}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---- Typing indicator ----
function TypingIndicator() {
    return (
        <div className="flex justify-start mb-4">
            <div className="rounded-2xl rounded-bl-md bg-white/90 dark:bg-[#1e212c]/80 border border-gray-100 dark:border-[#2a2d3a] px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0FA697] animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-[#0FA697] animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-[#0FA697] animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    );
}

// ---- Main Chat Interface ----
export default function ChatInterface() {
    const messages = useACRMStore((s) => s.messages);
    const isGenerating = useACRMStore((s) => s.isGenerating);
    const sendMessage = useACRMStore((s) => s.sendMessage);
    const scheduleMessage = useACRMStore((s) => s.scheduleMessage);
    const greenHours = useACRMStore((s) => s.greenHours);
    const isCILive = useACRMStore((s) => s.isCILive);

    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isGenerating]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || isGenerating) return;
        setInput("");
        sendMessage(trimmed);
    };

    const handleSchedule = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        setInput("");
        scheduleMessage(trimmed);
    };

    const canSchedule = isCILive && greenHours && (greenHours.savingPercent ?? 0) > 5;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA697]/20 to-[#AED911]/20">
                                <svg className="h-10 w-10 text-[#0FA697]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                Start a Conversation
                            </h3>
                            <p className="mt-1 text-base text-gray-400 dark:text-gray-500 max-w-xs">
                                Send a message and see the real-time carbon footprint of every AI response.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                ))}

                {isGenerating && <TypingIndicator />}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-gray-200/60 dark:border-[#2a2d3a] bg-white/70 dark:bg-[#13151d]/80 backdrop-blur-md px-4 py-3">
                <div className="flex items-end gap-3">
                    <textarea
                        id="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-[#2a2d3a] bg-white dark:bg-[#1a1d27] px-4 py-2.5 text-base 
                       text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600
                       focus:border-[#0FA697] focus:ring-2 focus:ring-[#0FA697]/20 focus:outline-none
                       transition-all"
                    />
                    <button
                        id="send-button"
                        onClick={handleSend}
                        disabled={!input.trim() || isGenerating}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl 
                       bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 text-white shadow-md
                       transition-all hover:shadow-lg hover:scale-105 
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>

                    {/* 2.3 Schedule button â€” only shows when Green Hours available */}
                    {canSchedule && (
                        <button
                            id="schedule-button"
                            onClick={handleSchedule}
                            disabled={!input.trim()}
                            title={`Schedule for green hours (~${greenHours?.savingPercent ?? 0}% less carbon)`}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl 
                           border-2 border-[#0FA697]/40 text-[#0FA697] 
                           transition-all hover:bg-[#0FA697]/10 hover:scale-105
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

