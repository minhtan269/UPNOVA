"use client";

import { useEffect, useRef, useState } from "react";
import { useACRMStore, type ChatMessage } from "@/lib/store";
import { AVAILABLE_MODELS } from "@/lib/carbon-constants";
import CarbonTag from "./CarbonTag";
import AIResponseRenderer from "./markdown/AIResponseRenderer";
import { useTranslation } from "@/lib/i18n/useTranslation";

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const { t } = useTranslation();
  const isUser = msg.role === "user";
  const model = AVAILABLE_MODELS.find((m) => m.id === msg.modelId);
  const visibleOutputTokens =
    msg.metrics.visibleOutputTokens ?? msg.metrics.outputTokens;
  const reasoningTokens = msg.metrics.reasoningTokens ?? 0;
  const billedOutputTokens =
    msg.metrics.billedOutputTokens ?? msg.metrics.outputTokens;
  const confidence = msg.metrics.meta?.confidence ?? "low";
  const showTokenBreakdown =
    !isUser &&
    (reasoningTokens > 0 || billedOutputTokens !== visibleOutputTokens);

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`mb-1 flex items-center gap-2 px-1 text-xs text-gray-500 dark:text-gray-400 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {isUser ? (
            <span className="font-medium">{t("chat.userLabel")}</span>
          ) : (
            <>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA697] to-[#AED911] text-[10px] font-bold text-white">
                AI
              </span>
              <span className="font-medium">{model?.name ?? "AI"}</span>
            </>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md bg-gradient-to-br from-[#0FA697] to-[#0FA697]/80 text-white"
              : "rounded-bl-md border border-gray-100 bg-white/90 text-gray-800 dark:border-[#2a2d3a] dark:bg-[#1e212c]/80 dark:text-gray-200"
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <AIResponseRenderer content={msg.content} variant="chat" />
          )}
        </div>

        <div className={`mt-1 ${isUser ? "text-right" : "text-left"}`}>
          <CarbonTag
            totalTokens={msg.metrics.totalTokens}
            energyWh={msg.metrics.energyWh}
            co2Grams={msg.metrics.co2Grams}
            level={msg.metrics.level}
            showCarbon={msg.metrics.showCarbon}
          />
          {showTokenBreakdown && (
            <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
              {t("compare.tokenBreakdown")
                .replace("{visible}", String(visibleOutputTokens))
                .replace("{thinking}", String(reasoningTokens))
                .replace("{billed}", String(billedOutputTokens))
                .replace("{confidence}", confidence)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-4 flex justify-start">
      <div className="max-w-[75%]">
        <div className="mb-1 flex items-center gap-2 px-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA697] to-[#AED911] text-[10px] font-bold text-white">
            AI
          </span>
          <span className="font-medium">AI</span>
        </div>
        <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white/90 px-4 py-3 shadow-sm dark:border-[#2a2d3a] dark:bg-[#1e212c]/80">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0FA697] [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0FA697] [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#0FA697] [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const { t } = useTranslation();
  const messages = useACRMStore((s) => s.messages);
  const isGenerating = useACRMStore((s) => s.isGenerating);
  const sendMessage = useACRMStore((s) => s.sendMessage);
  const scheduleMessage = useACRMStore((s) => s.scheduleMessage);
  const greenHours = useACRMStore((s) => s.greenHours);
  const isCILive = useACRMStore((s) => s.isCILive);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const canSchedule =
    isCILive && greenHours && (greenHours.savingPercent ?? 0) > 5;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0FA697]/20 to-[#AED911]/20">
                <svg
                  className="h-10 w-10 text-[#0FA697]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                {t("chat.emptyTitle")}
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-base text-gray-400 dark:text-gray-500">
                {t("chat.emptySubtitle")}
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

      <div className="shrink-0 border-t border-gray-200/60 bg-white/70 px-4 py-3 backdrop-blur-md dark:border-[#2a2d3a] dark:bg-[#13151d]/80">
        <div className="flex items-end gap-3">
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 transition-all placeholder:text-gray-400 focus:border-[#0FA697] focus:outline-none focus:ring-2 focus:ring-[#0FA697]/20 dark:border-[#2a2d3a] dark:bg-[#1a1d27] dark:text-gray-200 dark:placeholder:text-gray-600"
          />
          <button
            id="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#0FA697] to-[#0FA697]/80 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>

          {canSchedule && (
            <button
              id="schedule-button"
              onClick={handleSchedule}
              disabled={!input.trim()}
              title={`Schedule for green hours (~${greenHours?.savingPercent ?? 0}% less carbon)`}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-[#0FA697]/40 text-[#0FA697] transition-all hover:scale-105 hover:bg-[#0FA697]/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
