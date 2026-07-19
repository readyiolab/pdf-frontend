import { useTypewriter } from "@/hooks/useTypewriter";
import { AiMarkdown } from "@/components/ai/AiMarkdown";
import { cn } from "@/lib/utils";

/**
 * Renders AI output with a ChatGPT-style progressive reveal, formatted as light
 * Markdown. Mount it with a `key` that changes per generation (e.g. a run id or
 * message index) so each new answer types itself out from the start.
 *
 * `animate={false}` renders instantly — use it for older chat turns that have
 * already been "typed", so re-renders don't replay every message.
 */
export function AiStreamedText({
  text,
  animate = true,
  className,
}: {
  text: string;
  animate?: boolean;
  className?: string;
}) {
  const { shown, done } = useTypewriter(text, animate);
  return (
    <div className={cn("relative", className)}>
      <AiMarkdown text={shown} />
      {!done && (
        <span
          className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-primary align-baseline"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
