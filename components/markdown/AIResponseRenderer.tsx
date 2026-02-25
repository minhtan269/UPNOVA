"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeAIOutput } from "@/lib/normalize-ai-output";

export interface AIResponseRendererProps {
  content: string;
  variant?: "chat" | "compare";
}

const BASE_CLASSES =
  "max-w-none break-words leading-relaxed " +
  "prose prose-sm dark:prose-invert " +
  "prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit " +
  "prose-em:text-inherit prose-li:text-inherit prose-code:text-inherit " +
  "prose-pre:bg-black/10 dark:prose-pre:bg-black/30 prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 " +
  "prose-a:text-[#0FA697] prose-a:no-underline hover:prose-a:underline " +
  "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5";

const VARIANT_CLASSES: Record<NonNullable<AIResponseRendererProps["variant"]>, string> =
  {
    chat: "text-sm",
    compare: "text-sm",
  };

export default function AIResponseRenderer({
  content,
  variant = "chat",
}: AIResponseRendererProps) {
  const normalized = useMemo(() => normalizeAIOutput(content), [content]);
  const remarkPlugins = normalized.shouldFallbackToPlain || !normalized.hasMath
    ? [remarkGfm]
    : [remarkGfm, remarkMath];
  const rehypePlugins =
    normalized.shouldFallbackToPlain || !normalized.hasMath ? [] : [rehypeKatex];

  return (
    <div className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {normalized.text}
      </ReactMarkdown>
    </div>
  );
}
