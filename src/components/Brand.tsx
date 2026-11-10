/** Her Way brand: an ascending path flowing through a stylized H. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M7 5c4 0 7 3 7 7v22c0 4-3 7-7 9V5Z" fill="currentColor" />
      <path d="M35 7c3-2 5-2 7-2v31c0 4-3 6-7 7V7Z" fill="currentColor" />
      <path d="M9 35c7-17 17-13 25-28" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M10 42c8-18 17-15 27-29" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Brand({ light = false, tagline = false }: { light?: boolean; tagline?: boolean }) {
  return (
    <div>
      <span className={`flex items-center gap-2.5 ${light ? "text-white" : "text-navy-950"}`}>
        <LogoMark />
        <span className="text-[26px] font-bold leading-none tracking-tight">herway</span>
      </span>
      {tagline && (
        <p className="mt-3 text-[13px] leading-snug text-white/65">
          Mulheres que constroem carreiras de destaque no mercado financeiro
        </p>
      )}
    </div>
  );
}
