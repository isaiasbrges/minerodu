import { Activity } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const sub = size === "lg" ? "text-xs" : "text-[10px]";

  return (
    <div className="flex items-center gap-3">
      <div className={`${dim} relative grid place-items-center rounded-md bg-primary text-primary-foreground glow-yellow`}>
        <Activity className="h-1/2 w-1/2" strokeWidth={2.5} />
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success pulse-dot ring-2 ring-background" />
      </div>
      <div className="leading-tight">
        <div className={`font-display ${text} font-bold tracking-wider uppercase text-foreground`}>
          Operação <span className="text-primary">Mineroduto</span>
        </div>
        <div className={`${sub} font-mono uppercase tracking-[0.2em] text-muted-foreground`}>
          Sistema Inteligente
        </div>
      </div>
    </div>
  );
}
