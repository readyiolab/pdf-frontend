import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Languages } from "lucide-react";

interface OcrSettingsProps {
  languages: string;
  onLanguagesChange: (langs: string) => void;
  disabled?: boolean;
}

const popularLanguages = [
  { code: "eng", name: "English" },
  { code: "hin", name: "Hindi" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "jpn", name: "Japanese" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "ara", name: "Arabic" },
];

export const OcrSettings: React.FC<OcrSettingsProps> = ({
  languages,
  onLanguagesChange,
  disabled = false,
}) => {
  const selectedCodes = languages.split(",").map((l) => l.trim()).filter(Boolean);

  const toggleLanguage = (code: string) => {
    const current = new Set(selectedCodes);
    if (current.has(code)) {
      current.delete(code);
    } else {
      current.add(code);
    }
    onLanguagesChange(Array.from(current).join(","));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/50 p-3.5 flex items-start gap-3">
        <Languages className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Select the languages present in your scanned PDF for accurate text recognition.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Quick Select</Label>
        <div className="flex flex-wrap gap-1.5">
          {popularLanguages.map((lang) => {
            const isSelected = selectedCodes.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                disabled={disabled}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {lang.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">Language Codes</Label>
        <Input
          type="text"
          value={languages}
          onChange={(e) => onLanguagesChange(e.target.value)}
          placeholder="eng, hin"
          disabled={disabled}
          className="h-9 text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          Comma-separated Tesseract language codes
        </p>
      </div>
    </div>
  );
};
