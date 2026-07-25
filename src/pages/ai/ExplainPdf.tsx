import { AiDocPanel } from "@/components/ai/AiDocPanel";
import { aiApi, type ExplainAudience } from "@/services/aiApi";

export default function ExplainPdf() {
  return (
    <AiDocPanel
      title="Explain PDF with AI"
      subtitle="Turn a dense or confusing document into plain language."
      actionLabel="Explain"
      accent="from-sky-500/20 to-sky-500/5"
      tone="sky"
      presets={[
        { id: "simple", label: "Simple", hint: "Plain language, no jargon" },
        { id: "legal", label: "Legal lens", hint: "Rights, obligations, risks" },
        { id: "technical", label: "Technical", hint: "For a technical reader" },
      ]}
      onRun={(fileKey, audience) => aiApi.explain(fileKey, audience as ExplainAudience)}
    />
  );
}
