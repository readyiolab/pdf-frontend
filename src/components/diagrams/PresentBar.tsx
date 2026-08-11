import { Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  playing: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStep: () => void;
  onSpeed: (speed: number) => void;
  onExit: () => void;
  className?: string;
};

export function PresentBar({
  playing,
  speed,
  onPlay,
  onPause,
  onRestart,
  onStep,
  onSpeed,
  onExit,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#cfd8e3] bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur",
        className
      )}
    >
      {playing ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          onClick={onPause}
          aria-label="Pause"
        >
          <Pause className="size-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          onClick={onPlay}
          aria-label="Play"
        >
          <Play className="size-3.5" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        onClick={onRestart}
        aria-label="Restart"
      >
        <RotateCcw className="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        onClick={onStep}
        aria-label="Step"
      >
        <SkipForward className="size-3.5" />
      </Button>

      <div className="mx-1 flex items-center gap-2 border-l border-[#e2e8f0] pl-3">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
          Speed
        </span>
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.25}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer accent-[#2563eb]"
          aria-label="Playback speed"
        />
        <span className="min-w-[2.5rem] text-xs tabular-nums text-[#475569]">
          {speed.toFixed(2)}×
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        onClick={onExit}
        aria-label="Exit present"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
