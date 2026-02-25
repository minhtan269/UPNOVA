// Normalizes AI text so Markdown/LaTeX render reliably without mutating stored data.

const CURRENCY_TOKEN = "__ACRM_CURRENCY_DOLLAR__";
const WORD_REGEX = /[A-Za-z]{3,}/g;

interface TextSegment {
  text: string;
  isCode: boolean;
}

interface MathSegment {
  content: string;
  closed: boolean;
}

interface NonCodeNormalizationResult {
  text: string;
  safePlainText: string;
  hasMath: boolean;
  shouldFallbackToPlain: boolean;
}

export interface NormalizedAIOutput {
  text: string;
  hasMath: boolean;
  shouldFallbackToPlain: boolean;
}

function splitByCodeSegments(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /(```[\s\S]*?```|`[^`\n]*`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        isCode: false,
      });
    }

    segments.push({ text: match[0], isCode: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), isCode: false });
  }

  return segments;
}

function applyOpsRightToLeft(
  input: string,
  ops: Array<{ index: number; length: number; replacement: string }>
): string {
  const sorted = [...ops].sort((a, b) => b.index - a.index);
  let output = input;

  for (const op of sorted) {
    output =
      output.slice(0, op.index) +
      op.replacement +
      output.slice(op.index + op.length);
  }

  return output;
}

function extractMathSegments(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let i = 0;
  let activeDelimiter: "$" | "$$" | null = null;
  let segmentStart = -1;

  while (i < input.length) {
    if (input[i] !== "$" || input[i - 1] === "\\") {
      i += 1;
      continue;
    }

    const delimiter: "$" | "$$" = input[i + 1] === "$" ? "$$" : "$";

    if (!activeDelimiter) {
      activeDelimiter = delimiter;
      segmentStart = i + delimiter.length;
      i += delimiter.length;
      continue;
    }

    if (activeDelimiter === delimiter) {
      segments.push({
        content: input.slice(segmentStart, i),
        closed: true,
      });
      activeDelimiter = null;
      segmentStart = -1;
      i += delimiter.length;
      continue;
    }

    i += 1;
  }

  if (activeDelimiter && segmentStart >= 0) {
    segments.push({
      content: input.slice(segmentStart),
      closed: false,
    });
  }

  return segments;
}

function simplifyLatexExpression(input: string): string {
  let text = input;

  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1 / $2)");
  text = text.replace(/\\text\s*\{([^{}]*)\}/g, "$1");
  text = text.replace(/\\left|\\right/g, "");
  text = text.replace(/\\times|\\cdot/g, " * ");
  text = text.replace(/\\%/g, "%");
  text = text.replace(/\\_/g, "_");
  text = text.replace(/\\([A-Za-z]+)/g, "$1");
  text = text.replace(/[{}]/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function looksLikeProseMath(input: string): boolean {
  if (input.length < 140) return false;

  const simplified = simplifyLatexExpression(input);
  const words = simplified.match(WORD_REGEX) ?? [];
  const operators = (input.match(/[=+\-*/<>]/g) ?? []).length;

  return words.length >= 12 && operators <= 2;
}

function toSafeMarkdownWithoutMath(input: string): string {
  let text = input.replace(/\\\$/g, CURRENCY_TOKEN);

  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr: string) =>
    simplifyLatexExpression(expr)
  );
  text = text.replace(/\$([^\n$]+?)\$/g, (_, expr: string) =>
    simplifyLatexExpression(expr)
  );

  // Strip leftover unmatched delimiters after degraded parsing.
  text = text.replace(/\$\$/g, "");
  text = text.replace(/\$/g, "");

  text = text.replaceAll(CURRENCY_TOKEN, "$");
  return text;
}

function normalizeNonCodeText(input: string): NonCodeNormalizationResult {
  let text = input.replace(/\r\n?/g, "\n");

  // Convert escaped math delimiters into markdown-style delimiters.
  text = text
    .replace(/\\\[/g, "$$\n")
    .replace(/\\\]/g, "\n$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");

  // Convert escaped dollars back to "$" first so math parser can read them.
  text = text.replace(/\\\$/g, "$");

  // Normalize common malformed markdown patterns from model output.
  text = text.replace(/^\s*\*\*\*([^:\n*]+):\s*/gm, "**$1:** ");
  text = text.replace(/\*\*\*([^\n*][^*\n]*?)\*\*\*/g, "**$1**");

  // Protect currency values like "$100", "$1,000.50" from math parsing.
  text = text.replace(
    /(^|[\s([{,:;])\$(\d[\d,]*(?:\.\d+)?)/g,
    `$1${CURRENCY_TOKEN}$2`
  );

  const singleDollarIndexes: number[] = [];
  const doubleDollarIndexes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== "$" || text[i - 1] === "\\") continue;

    if (text[i + 1] === "$") {
      doubleDollarIndexes.push(i);
      i += 1;
      continue;
    }

    singleDollarIndexes.push(i);
  }

  const hasMath =
    singleDollarIndexes.length > 0 || doubleDollarIndexes.length > 0;
  const hasUnbalancedDelimiters =
    singleDollarIndexes.length % 2 === 1 || doubleDollarIndexes.length % 2 === 1;

  const mathSegments = hasMath ? extractMathSegments(text) : [];
  const hasUnclosedMath = mathSegments.some((segment) => !segment.closed);
  const hasInvalidEscapes = mathSegments.some((segment) =>
    /\\\d/.test(segment.content)
  );
  const hasMalformedTextCommand = mathSegments.some((segment) =>
    /\\text(?!\s*\{)/.test(segment.content)
  );
  const hasProseHeavyMath = mathSegments.some((segment) =>
    looksLikeProseMath(segment.content)
  );

  const shouldFallbackToPlain =
    hasMath &&
    (hasUnbalancedDelimiters ||
      hasUnclosedMath ||
      hasInvalidEscapes ||
      hasMalformedTextCommand ||
      hasProseHeavyMath);

  const ops: Array<{ index: number; length: number; replacement: string }> = [];
  if (singleDollarIndexes.length % 2 === 1) {
    const idx = singleDollarIndexes[singleDollarIndexes.length - 1];
    ops.push({ index: idx, length: 1, replacement: "\\$" });
  }

  if (doubleDollarIndexes.length % 2 === 1) {
    const idx = doubleDollarIndexes[doubleDollarIndexes.length - 1];
    ops.push({ index: idx, length: 2, replacement: "\\$\\$" });
  }

  text = applyOpsRightToLeft(text, ops);
  text = text.replaceAll(CURRENCY_TOKEN, "\\$");

  return {
    text,
    safePlainText: shouldFallbackToPlain
      ? toSafeMarkdownWithoutMath(text)
      : text,
    hasMath,
    shouldFallbackToPlain,
  };
}

export function normalizeAIOutput(raw: string): NormalizedAIOutput {
  if (!raw) {
    return { text: "", hasMath: false, shouldFallbackToPlain: false };
  }

  const segments = splitByCodeSegments(raw);
  const normalizedSegments = segments.map((segment) => {
    if (segment.isCode) {
      return {
        text: segment.text,
        safePlainText: segment.text,
        hasMath: false,
        shouldFallbackToPlain: false,
      } satisfies NonCodeNormalizationResult;
    }

    return normalizeNonCodeText(segment.text);
  });

  const hasMath = normalizedSegments.some((segment) => segment.hasMath);
  const shouldFallbackToPlain = normalizedSegments.some(
    (segment) => segment.shouldFallbackToPlain
  );

  return {
    text: normalizedSegments
      .map((segment) =>
        shouldFallbackToPlain ? segment.safePlainText : segment.text
      )
      .join(""),
    hasMath,
    shouldFallbackToPlain,
  };
}
