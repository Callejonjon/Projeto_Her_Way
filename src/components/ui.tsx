import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, label, className = "" }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-slate-200 ${className}`} role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-solar-500 to-solar-400 transition-all duration-700" style={{ width: `${v}%` }} />
    </div>
  );
}

/** Selo de compatibilidade: amarelo (alta), rosa (média), cinza (baixa). */
export function MatchBadge({ pct, label = "Match" }: { pct: number; label?: string }) {
  const tone = pct >= 75 ? "bg-solar-400 text-navy-950" : pct >= 50 ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-600";
  return <span className={`chip font-bold ${tone}`} title={`${pct}% de compatibilidade`}>{pct}% {label}</span>;
}

export function TrackBadge({ track }: { track: "A" | "B" | null }) {
  if (!track) return null;
  return (
    <span className={`chip ${track === "A" ? "bg-navy-800/10 text-navy-800" : "bg-pink-100 text-pink-600"}`}>
      Trilha {track} · {track === "A" ? "Universitárias" : "Transição de Carreira"}
    </span>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-sm text-slate-500">{label}{icon}</div>
      <p className="mt-2 text-3xl font-extrabold text-navy-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
