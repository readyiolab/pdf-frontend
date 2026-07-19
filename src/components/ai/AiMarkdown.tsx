import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A deliberately small Markdown renderer for AI output.
 *
 * Models reply in light Markdown — headings, bullet/numbered lists, **bold**,
 * `code`. Rendering that structure (instead of dumping the raw asterisks into a
 * <pre>) is most of what makes the result look considered rather than like a
 * raw API dump. We parse only the handful of constructs the model actually
 * emits and build React nodes directly — no HTML injection, so user-supplied
 * document text can't smuggle markup through.
 */
export function AiMarkdown({ text, className }: { text: string; className?: string }) {
  return <div className={cn("ai-prose space-y-2.5", className)}>{renderBlocks(text)}</div>;
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-foreground">
          {renderInline(para.join(" "))}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => (
        <li key={i} className="leading-relaxed">
          {renderInline(it)}
        </li>
      ));
      blocks.push(
        list.ordered ? (
          <ol key={key++} className="ml-5 list-decimal space-y-1 text-sm text-foreground marker:text-muted-foreground">
            {items}
          </ol>
        ) : (
          <ul key={key++} className="ml-5 list-disc space-y-1 text-sm text-foreground marker:text-muted-foreground">
            {items}
          </ul>
        )
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }

    // Heading (## Title)
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push(
        <p key={key++} className="pt-1 text-sm font-semibold text-foreground">
          {renderInline(heading[2])}
        </p>
      );
      continue;
    }

    // Bullet list (-, *, •)
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    // Numbered list (1. item)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return blocks;
}

/** Inline: **bold**, *italic*, `code`. Kept regex-simple on purpose. */
function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
      return <em key={i}>{tok.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{tok}</Fragment>;
  });
}
