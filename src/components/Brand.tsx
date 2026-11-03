import { useId } from "react";

/** Marca Her Way: um caminho ascendente que forma uma pétala — "o caminho dela no mercado financeiro". */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#DB2777" />
          <stop offset="1" stopColor="#F9A8D4" />
        </linearGradient>
      </defs>
      <path d="M8 34C8 20 16 8 32 5c-3 9-8 15-14 18 5 0 9-2 12-5-2 9-10 16-22 16Z" fill={`url(#${id})`} />
      <path d="M8 34c4-9 10-15 18-20" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Brand({ light = false, tagline = false }: { light?: boolean; tagline?: boolean }) {
  return (
    <div>
      <span className="flex items-center gap-2.5">
        <LogoMark />
        <span className={`text-[26px] font-extrabold leading-none tracking-tight ${light ? "text-white" : "text-navy-950"}`}>
          Her <span className="text-pink-400">Way</span>
        </span>
      </span>
      {tagline && (
        <p className="mt-3 text-[13px] leading-snug text-white/65">
          Mulheres que constroem carreiras de destaque no mercado financeiro
        </p>
      )}
    </div>
  );
}
