import { AiDocPanel } from "@/components/ai/AiDocPanel";
import { aiApi, type SummaryStyle } from "@/services/aiApi";

export default function SummarizePdf() {
  return (
    <AiDocPanel
      title="Summarize PDF with AI"
      subtitle="Drop in a document and get an instant, faithful summary."
      actionLabel="Summarize"
      accent="from-fuchsia-500/20 to-fuchsia-500/5"
      tone="fuchsia"
      presets={[
        { id: "concise", label: "Concise", hint: "A few clear sentences" },
        { id: "detailed", label: "Detailed", hint: "Thorough, section by section" },
        { id: "bullets", label: "Key points", hint: "A bulleted list" },
      ]}
      onRun={(fileKey, style) => aiApi.summarize(fileKey, style as SummaryStyle)}
    />
  );
}
