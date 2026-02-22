// Normalizes AI text so Markdown/LaTeX render reliably without mutating stored data.

const CURRENCY_TOKEN = "__ACRM_CURRENCY_DOLLAR__";

interface TextSegment {
  text: string;
  isCode: boolean;
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

function normalizeNonCodeText(input: string): string {
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

  return text;
}

export function normalizeAIOutput(raw: string): string {
  if (!raw) return "";

  const segments = splitByCodeSegments(raw);
  return segments
    .map((segment) =>
      segment.isCode ? segment.text : normalizeNonCodeText(segment.text)
    )
    .join("");
}
